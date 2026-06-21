import { useEffect, useState } from "react";
import { waitForTx } from "../utils/waitForTx";
import { sendWithMemo } from "../utils/sendWithMemo";
import { parseError } from "../utils/parseError";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, VERIFICATION_MANAGER_ABI, TERMINATION_MANAGER_ABI, ERC20_ABI } from "../config/abis";
import { ipfsUrl } from "../config/contracts";

const ZERO_BYTES32 = "0x" + "0".repeat(64);

interface Player {
  id:                  bigint;
  name:                string;
  position:            string;
  nationality:         string;
  contractExpiry:      bigint;
  weeklySalary:        bigint;
  playerWallet:        string;
  isVerified:          boolean;
  isListed:            boolean;
  medicalClearance:    boolean;
  medicalDocumentHash: string;
  medicalVerified:     boolean;
  askingPrice:         bigint;
  releaseClause:       bigint;
  registeredAt:        bigint;
  portraitCID:         string;
  verificationActive:  boolean;
  _owner?:             string;
  _legalDocs?:         { documentsVerified: boolean; registrationContractHash: string; };
}

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background:    disabled ? "transparent" : bg,
  border:        `1px solid ${disabled ? "var(--border)" : color}`,
  color:         disabled ? "var(--text-dim)" : color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  letterSpacing: "0.08em",
  padding:       "3px 10px",
  borderRadius:  "var(--radius-sm)",
  cursor:        "pointer",
  whiteSpace:    "nowrap" as const,
});

const input = {
  background:   "var(--bg-primary)",
  border:       "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color:        "var(--text-primary)",
  fontFamily:   "var(--font-mono)",
  fontSize:     "0.8rem",
  padding:      "8px 12px",
  outline:      "none",
  width:        "100%",
};

export function Club({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [players, setPlayers]           = useState<Player[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [txStatus, setTxStatus]         = useState<string | null>(null);
  const [clubName, setClubName]         = useState<string>("");
  const [listingId, setListingId]       = useState<bigint | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  // I track which inline action panel is open per player: format "TYPE_playerid"
  const [activeAction, setActiveAction]   = useState<string | null>(null);
  const [medHashInput, setMedHashInput]   = useState("");
  const [legalInputs, setLegalInputs]     = useState({ reg: "", tms: "", permit: "" });
  const [walletInput, setWalletInput]     = useState("");
  const [newWalletInput, setNewWalletInput] = useState("");
  const [terminationReason, setTerminationReason] = useState("");
  // I persist the registration form to sessionStorage so a page refresh or
  // accidental navigation does not wipe partially filled details.
  // sessionStorage is intentional — it clears when the tab closes, which is
  // appropriate for financial/registration data.
  const [form, setForm] = useState<{
    name: string; position: string; nationality: string;
    contractExpiry: string; weeklySalary: string; fifaId: string;
  }>(() => {
    try {
      const saved = sessionStorage.getItem("transferium_reg_form");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: "", position: "", nationality: "", contractExpiry: "", weeklySalary: "", fifaId: "" };
  });

  // I write form changes to sessionStorage so the data survives navigation
  useEffect(() => {
    try { sessionStorage.setItem("transferium_reg_form", JSON.stringify(form)); } catch {}
  }, [form]);

  useEffect(() => {
    if (!wallet.provider) return;
    loadPlayers();
    checkRoles();
  }, [wallet.provider, wallet.address]);

  async function checkRoles() {
    if (!wallet.provider || !wallet.address) return;
    try {
      const registry       = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const name = await registry.getClubName(wallet.address).catch(() => "");
      if (name) setClubName(name);
    } catch {}
  }

  async function loadPlayers() {
    if (!wallet.provider) return;
    setLoading(true);
    setError(null);
    try {
      const registry      = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const total: bigint = await registry.totalPlayers();
      const loaded: Player[] = [];
      for (let i = 1; i <= Number(total); i++) {
        try {
          const raw      = await registry.getPlayer(i);
          const owner    = await registry.ownerOf(i);
          let legalRaw: any = { documentsVerified: false, registrationContractHash: ethers.ZeroHash };
          try { legalRaw = await registry.getLegalDocuments(i); } catch {}
          const verActv: boolean = await registry.verificationActive(i).catch(() => false);
          loaded.push({
            id:                  raw.id,
            name:                raw.name,
            position:            raw.position,
            nationality:         raw.nationality,
            contractExpiry:      raw.contractExpiry,
            weeklySalary:        raw.weeklySalary,
            playerWallet:        raw.playerWallet,
            isVerified:          raw.isVerified,
            isListed:            raw.isListed,
            medicalClearance:    raw.medicalClearance,
            medicalDocumentHash: raw.medicalDocumentHash,
            medicalVerified:     raw.medicalVerified,
            askingPrice:         raw.askingPrice,
            releaseClause:       raw.releaseClause,
            registeredAt:        raw.registeredAt,
            portraitCID:         raw.portraitCID ?? "",
            verificationActive:  verActv,
            _owner:              owner,
            _legalDocs:          {
              documentsVerified:        legalRaw.documentsVerified,
              registrationContractHash: legalRaw.registrationContractHash,
            },
          });
        } catch (e: any) { console.error(`Player #${i} load error:`, e?.message ?? e); }
      }
      setPlayers(loaded);
    } catch (err: any) {
      setError(err.message ?? "Failed to load players");
    } finally {
      setLoading(false);
    }
  }


  async function registerPlayer() {
    if (!wallet.signer || !wallet.address) return;
    // I enforce FIFA ID as mandatory — the new contract rejects bytes32(0) with FifaIdRequired()
    if (!form.fifaId?.trim()) { setTxStatus("FIFA / National ID is required."); return; }
    setTxStatus("Preparing registration...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const expiry   = Math.floor(new Date(form.contractExpiry).getTime() / 1000) + 86400;
      const salary   = form.weeklySalary ? ethers.parseUnits(form.weeklySalary, 6) : 0n;
      const regFee: bigint = await registry.registrationFee();
      // I approve EURC before calling — the new contract uses safeTransferFrom not msg.value
      if (regFee > 0n) {
        const eurc = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer);
        const allowance: bigint = await eurc.allowance(wallet.address, CONTRACTS.PlayerRegistry);
        if (allowance < regFee) {
          setTxStatus("Approving EURC for registration fee...");
          await waitForTx(await eurc.approve(CONTRACTS.PlayerRegistry, regFee), wallet.provider!);
        }
      }
      const fifaIdHash = ethers.keccak256(ethers.toUtf8Bytes(form.fifaId.trim()));
      setTxStatus("Registering player on-chain...");
      await waitForTx(
        await registry.registerPlayer(
          form.name, form.position, form.nationality, expiry, salary, fifaIdHash
        ),
        wallet.provider!
      );
      setTxStatus("Player registered.");
      const emptyForm = { name: "", position: "", nationality: "", contractExpiry: "", weeklySalary: "", fifaId: "" };
      setForm(emptyForm);
      try { sessionStorage.removeItem("transferium_reg_form"); } catch {}
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function listPlayer(playerId: bigint) {
    if (!wallet.signer || !wallet.address || !listingPrice) return;
    setTxStatus(`Preparing listing for #${playerId}...`);
    try {
      const registry    = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const fee: bigint = await registry.listingFee();
      if (fee > 0n) {
        const eurc = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer);
        const allowance: bigint = await eurc.allowance(wallet.address, CONTRACTS.PlayerRegistry);
        if (allowance < fee) {
          setTxStatus("Approving EURC for listing fee...");
          await waitForTx(await eurc.approve(CONTRACTS.PlayerRegistry, fee), wallet.provider!);
        }
      }
      const priceUnits = ethers.parseUnits(listingPrice, 6);
      setTxStatus(`Listing #${playerId}...`);
      await waitForTx(await registry.listPlayer(playerId, priceUnits), wallet.provider!);
      setTxStatus(`Player #${playerId} listed.`);
      setListingId(null);
      setListingPrice("");
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function delistPlayer(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Delisting #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.delistPlayer(playerId), wallet.provider!);
      setTxStatus(`Player #${playerId} delisted.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  // ─── Club-side document & verification actions ───────────────────────────

  async function submitMedicalHash(playerId: bigint) {
    if (!wallet.signer) return;
    const hash = medHashInput.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      setTxStatus("Invalid medical hash — must be 0x followed by 64 hex characters.");
      return;
    }
    setTxStatus(`Submitting medical clearance for #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.setMedicalClearance(playerId, hash), wallet.provider!);
      setTxStatus(`Medical clearance submitted for #${playerId}.`);
      setMedHashInput("");
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function submitLegalDocs(playerId: bigint) {
    if (!wallet.signer) return;
    const { reg, tms, permit } = legalInputs;
    if (!/^0x[0-9a-fA-F]{64}$/.test(reg))    { setTxStatus("Invalid registration contract hash."); return; }
    if (!/^0x[0-9a-fA-F]{64}$/.test(tms))    { setTxStatus("Invalid FIFA TMS hash."); return; }
    if (permit !== "" && !/^0x[0-9a-fA-F]{64}$/.test(permit)) { setTxStatus("Invalid work permit hash."); return; }
    const workPermit = permit === "" ? ZERO_BYTES32 : permit;
    setTxStatus(`Submitting legal documents for #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.submitLegalDocuments(playerId, reg, tms, workPermit), wallet.provider!);
      setTxStatus(`Legal documents submitted for #${playerId}.`);
      setLegalInputs({ reg: "", tms: "", permit: "" });
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function setPlayerWallet(playerId: bigint) {
    if (!wallet.signer) return;
    try { ethers.getAddress(walletInput); } catch { setTxStatus("Invalid Ethereum address."); return; }
    setTxStatus(`Setting player wallet for #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.setPlayerWallet(playerId, walletInput), wallet.provider!);
      setTxStatus(`Player wallet set for #${playerId}. Only the player can update it going forward.`);
      setWalletInput("");
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function requestVerification(playerId: bigint) {
    if (!wallet.signer || !wallet.address) return;
    setTxStatus(`Preparing verification request for #${playerId}...`);
    try {
      const vmgr     = new ethers.Contract(CONTRACTS.VerificationManager, VERIFICATION_MANAGER_ABI, wallet.signer);
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const clubRegistrar: string = await registry.getClubRegistrar(wallet.address);
      const fee: bigint = await registry.getRegistrarFee(clubRegistrar);
      if (fee > 0n) {
        const eurc = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer);
        const allowance: bigint = await eurc.allowance(wallet.address, CONTRACTS.VerificationManager);
        if (allowance < fee) {
          setTxStatus("Approving EURC for verification fee...");
          await waitForTx(await eurc.approve(CONTRACTS.VerificationManager, fee), wallet.provider!);
        }
      }
      setTxStatus(`Requesting verification for #${playerId}...`);
      // I wrap this call through Arc's Memo contract so the request carries a
      // searchable label — useful for reconciling verification activity later.
      const tx = await sendWithMemo(
        wallet.signer, CONTRACTS.VerificationManager, vmgr.interface,
        "requestVerification", [playerId], `verification:player_${playerId}`
      );
      await waitForTx(tx, wallet.provider!);
      setTxStatus(`Verification requested for #${playerId}. Registrar has 72 hours to act.`);
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function claimVerificationRefund(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Claiming verification refund for #${playerId}...`);
    try {
      const vmgr = new ethers.Contract(CONTRACTS.VerificationManager, VERIFICATION_MANAGER_ABI, wallet.signer);
      await waitForTx(await vmgr.claimVerificationRefund(playerId), wallet.provider!);
      setTxStatus(`Refund claimed for #${playerId}.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function initiateWalletUpdate(playerId: bigint) {
    if (!wallet.signer) return;
    try { ethers.getAddress(newWalletInput); } catch { setTxStatus("Invalid Ethereum address."); return; }
    setTxStatus(`Initiating wallet update for #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.initiateWalletUpdate(playerId, newWalletInput), wallet.provider!);
      setTxStatus(`Wallet update initiated for #${playerId}. 48-hour timelock started.`);
      setNewWalletInput("");
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function cancelWalletUpdate(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Cancelling wallet update for #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.cancelWalletUpdate(playerId), wallet.provider!);
      setTxStatus(`Wallet update cancelled for #${playerId}.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  // ─── Termination actions (TerminationManager) ────────────────────────────

  async function proposeMutualTermination(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Proposing mutual termination for #${playerId}...`);
    try {
      const tmgr = new ethers.Contract(CONTRACTS.TerminationManager, TERMINATION_MANAGER_ABI, wallet.signer);
      await waitForTx(await tmgr.proposeMutualTermination(playerId), wallet.provider!);
      setTxStatus(`Mutual termination proposed for #${playerId}. Awaiting player wallet confirmation.`);
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function withdrawMutualTermination(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Withdrawing mutual termination proposal for #${playerId}...`);
    try {
      const tmgr = new ethers.Contract(CONTRACTS.TerminationManager, TERMINATION_MANAGER_ABI, wallet.signer);
      await waitForTx(await tmgr.withdrawMutualTermination(playerId), wallet.provider!);
      setTxStatus(`Mutual termination proposal withdrawn for #${playerId}.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function proposeUnilateralTermination(playerId: bigint) {
    if (!wallet.signer) return;
    if (!terminationReason.trim()) { setTxStatus("A reason is required for unilateral termination."); return; }
    setTxStatus(`Proposing unilateral termination for #${playerId}...`);
    try {
      const tmgr = new ethers.Contract(CONTRACTS.TerminationManager, TERMINATION_MANAGER_ABI, wallet.signer);
      await waitForTx(await tmgr.proposeUnilateralTermination(playerId, terminationReason.trim()), wallet.provider!);
      setTxStatus(`Unilateral termination proposed for #${playerId}. 7-day dispute window started.`);
      setTerminationReason("");
      setActiveAction(null);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  const isMyPlayer = (p: Player) =>
    wallet.address ? p._owner?.toLowerCase() === wallet.address.toLowerCase() : false;

  const statusLabel = (p: Player) => {
    if (p.isListed)            return { label: "LISTED",               color: "var(--gold)",           border: "var(--gold-dim)"      };
    if (p.verificationActive)  return { label: "VERIFICATION PENDING", color: "var(--amber)",          border: "var(--amber)"         };
    if (p.isVerified && p.medicalClearance && p.medicalVerified)
                               return { label: "FULLY CLEARED",        color: "var(--green)",          border: "var(--green)"         };
    if (p.isVerified)          return { label: "VERIFIED",             color: "var(--text-secondary)", border: "var(--border-accent)" };
    return                            { label: "PENDING",              color: "var(--text-dim)",       border: "var(--border)"        };
  };

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>{clubName ? clubName.toUpperCase() : "CLUB"}</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Register and manage player records on-chain
        </p>
      </div>

      {wallet.isConnected && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            REGISTER NEW PLAYER
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
            <input type="text" placeholder="Full Name"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              style={input}
            />
            <select value={form.position}
              onChange={e => setForm(prev => ({ ...prev, position: e.target.value }))}
              style={{ ...input, cursor: "pointer" }}>
              <option value="">Position</option>
                <option key="GK" value="GK">GK</option>
                <option key="SW" value="SW">SW</option>
                <option key="CB" value="CB">CB</option>
                <option key="CCB" value="CCB">CCB</option>
                <option key="LCB" value="LCB">LCB</option>
                <option key="RCB" value="RCB">RCB</option>
                <option key="LB" value="LB">LB</option>
                <option key="RB" value="RB">RB</option>
                <option key="LWB" value="LWB">LWB</option>
                <option key="RWB" value="RWB">RWB</option>
                <option key="CDM" value="CDM">CDM</option>
                <option key="DM" value="DM">DM</option>
                <option key="CM" value="CM">CM</option>
                <option key="LCM" value="LCM">LCM</option>
                <option key="RCM" value="RCM">RCM</option>
                <option key="CAM" value="CAM">CAM</option>
                <option key="AM" value="AM">AM</option>
                <option key="AMF" value="AMF">AMF</option>
                <option key="LM" value="LM">LM</option>
                <option key="RM" value="RM">RM</option>
                <option key="LW" value="LW">LW</option>
                <option key="RW" value="RW">RW</option>
                <option key="LWF" value="LWF">LWF</option>
                <option key="RWF" value="RWF">RWF</option>
                <option key="SS" value="SS">SS</option>
                <option key="CF" value="CF">CF</option>
                <option key="ST" value="ST">ST</option>
                <option key="LF" value="LF">LF</option>
                <option key="RF" value="RF">RF</option>
            </select>
            <select value={form.nationality}
              onChange={e => setForm(prev => ({ ...prev, nationality: e.target.value }))}
              style={{ ...input, cursor: "pointer" }}>
              <option value="">Nationality</option>
                <option key="Afghan" value="Afghan">Afghan</option>
                <option key="Albanian" value="Albanian">Albanian</option>
                <option key="Algerian" value="Algerian">Algerian</option>
                <option key="Andorran" value="Andorran">Andorran</option>
                <option key="Angolan" value="Angolan">Angolan</option>
                <option key="Antiguan" value="Antiguan">Antiguan</option>
                <option key="Argentine" value="Argentine">Argentine</option>
                <option key="Armenian" value="Armenian">Armenian</option>
                <option key="Australian" value="Australian">Australian</option>
                <option key="Austrian" value="Austrian">Austrian</option>
                <option key="Azerbaijani" value="Azerbaijani">Azerbaijani</option>
                <option key="Bahamian" value="Bahamian">Bahamian</option>
                <option key="Bahraini" value="Bahraini">Bahraini</option>
                <option key="Bangladeshi" value="Bangladeshi">Bangladeshi</option>
                <option key="Barbadian" value="Barbadian">Barbadian</option>
                <option key="Belarusian" value="Belarusian">Belarusian</option>
                <option key="Belgian" value="Belgian">Belgian</option>
                <option key="Belizean" value="Belizean">Belizean</option>
                <option key="Beninese" value="Beninese">Beninese</option>
                <option key="Bhutanese" value="Bhutanese">Bhutanese</option>
                <option key="Bolivian" value="Bolivian">Bolivian</option>
                <option key="Bosnian" value="Bosnian">Bosnian</option>
                <option key="Botswanan" value="Botswanan">Botswanan</option>
                <option key="Brazilian" value="Brazilian">Brazilian</option>
                <option key="Bruneian" value="Bruneian">Bruneian</option>
                <option key="Bulgarian" value="Bulgarian">Bulgarian</option>
                <option key="Burkinabe" value="Burkinabe">Burkinabe</option>
                <option key="Burundian" value="Burundian">Burundian</option>
                <option key="Cambodian" value="Cambodian">Cambodian</option>
                <option key="Cameroonian" value="Cameroonian">Cameroonian</option>
                <option key="Canadian" value="Canadian">Canadian</option>
                <option key="Cape Verdean" value="Cape Verdean">Cape Verdean</option>
                <option key="Central African" value="Central African">Central African</option>
                <option key="Chadian" value="Chadian">Chadian</option>
                <option key="Chilean" value="Chilean">Chilean</option>
                <option key="Chinese" value="Chinese">Chinese</option>
                <option key="Colombian" value="Colombian">Colombian</option>
                <option key="Comoran" value="Comoran">Comoran</option>
                <option key="Congolese" value="Congolese">Congolese</option>
                <option key="Costa Rican" value="Costa Rican">Costa Rican</option>
                <option key="Croatian" value="Croatian">Croatian</option>
                <option key="Cuban" value="Cuban">Cuban</option>
                <option key="Cypriot" value="Cypriot">Cypriot</option>
                <option key="Czech" value="Czech">Czech</option>
                <option key="Danish" value="Danish">Danish</option>
                <option key="Djiboutian" value="Djiboutian">Djiboutian</option>
                <option key="Dominican" value="Dominican">Dominican</option>
                <option key="Dutch" value="Dutch">Dutch</option>
                <option key="Ecuadorian" value="Ecuadorian">Ecuadorian</option>
                <option key="Egyptian" value="Egyptian">Egyptian</option>
                <option key="Emirati" value="Emirati">Emirati</option>
                <option key="English" value="English">English</option>
                <option key="Equatorial Guinean" value="Equatorial Guinean">Equatorial Guinean</option>
                <option key="Eritrean" value="Eritrean">Eritrean</option>
                <option key="Estonian" value="Estonian">Estonian</option>
                <option key="Eswatini" value="Eswatini">Eswatini</option>
                <option key="Ethiopian" value="Ethiopian">Ethiopian</option>
                <option key="Fijian" value="Fijian">Fijian</option>
                <option key="Finnish" value="Finnish">Finnish</option>
                <option key="French" value="French">French</option>
                <option key="Gabonese" value="Gabonese">Gabonese</option>
                <option key="Gambian" value="Gambian">Gambian</option>
                <option key="Georgian" value="Georgian">Georgian</option>
                <option key="German" value="German">German</option>
                <option key="Ghanaian" value="Ghanaian">Ghanaian</option>
                <option key="Greek" value="Greek">Greek</option>
                <option key="Grenadian" value="Grenadian">Grenadian</option>
                <option key="Guatemalan" value="Guatemalan">Guatemalan</option>
                <option key="Guinean" value="Guinean">Guinean</option>
                <option key="Guinea-Bissauan" value="Guinea-Bissauan">Guinea-Bissauan</option>
                <option key="Guyanese" value="Guyanese">Guyanese</option>
                <option key="Haitian" value="Haitian">Haitian</option>
                <option key="Honduran" value="Honduran">Honduran</option>
                <option key="Hungarian" value="Hungarian">Hungarian</option>
                <option key="Icelandic" value="Icelandic">Icelandic</option>
                <option key="Indian" value="Indian">Indian</option>
                <option key="Indonesian" value="Indonesian">Indonesian</option>
                <option key="Iranian" value="Iranian">Iranian</option>
                <option key="Iraqi" value="Iraqi">Iraqi</option>
                <option key="Irish" value="Irish">Irish</option>
                <option key="Israeli" value="Israeli">Israeli</option>
                <option key="Italian" value="Italian">Italian</option>
                <option key="Ivorian" value="Ivorian">Ivorian</option>
                <option key="Jamaican" value="Jamaican">Jamaican</option>
                <option key="Japanese" value="Japanese">Japanese</option>
                <option key="Jordanian" value="Jordanian">Jordanian</option>
                <option key="Kazakhstani" value="Kazakhstani">Kazakhstani</option>
                <option key="Kenyan" value="Kenyan">Kenyan</option>
                <option key="Kosovan" value="Kosovan">Kosovan</option>
                <option key="Kuwaiti" value="Kuwaiti">Kuwaiti</option>
                <option key="Kyrgyz" value="Kyrgyz">Kyrgyz</option>
                <option key="Laotian" value="Laotian">Laotian</option>
                <option key="Latvian" value="Latvian">Latvian</option>
                <option key="Lebanese" value="Lebanese">Lebanese</option>
                <option key="Liberian" value="Liberian">Liberian</option>
                <option key="Libyan" value="Libyan">Libyan</option>
                <option key="Liechtensteiner" value="Liechtensteiner">Liechtensteiner</option>
                <option key="Lithuanian" value="Lithuanian">Lithuanian</option>
                <option key="Luxembourger" value="Luxembourger">Luxembourger</option>
                <option key="Malagasy" value="Malagasy">Malagasy</option>
                <option key="Malawian" value="Malawian">Malawian</option>
                <option key="Malaysian" value="Malaysian">Malaysian</option>
                <option key="Maldivian" value="Maldivian">Maldivian</option>
                <option key="Malian" value="Malian">Malian</option>
                <option key="Maltese" value="Maltese">Maltese</option>
                <option key="Mauritanian" value="Mauritanian">Mauritanian</option>
                <option key="Mauritian" value="Mauritian">Mauritian</option>
                <option key="Mexican" value="Mexican">Mexican</option>
                <option key="Moldovan" value="Moldovan">Moldovan</option>
                <option key="Mongolian" value="Mongolian">Mongolian</option>
                <option key="Montenegrin" value="Montenegrin">Montenegrin</option>
                <option key="Moroccan" value="Moroccan">Moroccan</option>
                <option key="Mozambican" value="Mozambican">Mozambican</option>
                <option key="Namibian" value="Namibian">Namibian</option>
                <option key="Nepalese" value="Nepalese">Nepalese</option>
                <option key="New Zealander" value="New Zealander">New Zealander</option>
                <option key="Nicaraguan" value="Nicaraguan">Nicaraguan</option>
                <option key="Nigerian" value="Nigerian">Nigerian</option>
                <option key="Nigerien" value="Nigerien">Nigerien</option>
                <option key="North Korean" value="North Korean">North Korean</option>
                <option key="North Macedonian" value="North Macedonian">North Macedonian</option>
                <option key="Norwegian" value="Norwegian">Norwegian</option>
                <option key="Omani" value="Omani">Omani</option>
                <option key="Pakistani" value="Pakistani">Pakistani</option>
                <option key="Panamanian" value="Panamanian">Panamanian</option>
                <option key="Papua New Guinean" value="Papua New Guinean">Papua New Guinean</option>
                <option key="Paraguayan" value="Paraguayan">Paraguayan</option>
                <option key="Peruvian" value="Peruvian">Peruvian</option>
                <option key="Philippine" value="Philippine">Philippine</option>
                <option key="Polish" value="Polish">Polish</option>
                <option key="Portuguese" value="Portuguese">Portuguese</option>
                <option key="Qatari" value="Qatari">Qatari</option>
                <option key="Romanian" value="Romanian">Romanian</option>
                <option key="Russian" value="Russian">Russian</option>
                <option key="Rwandan" value="Rwandan">Rwandan</option>
                <option key="Salvadoran" value="Salvadoran">Salvadoran</option>
                <option key="Saudi" value="Saudi">Saudi</option>
                <option key="Scottish" value="Scottish">Scottish</option>
                <option key="Senegalese" value="Senegalese">Senegalese</option>
                <option key="Serbian" value="Serbian">Serbian</option>
                <option key="Sierra Leonean" value="Sierra Leonean">Sierra Leonean</option>
                <option key="Singaporean" value="Singaporean">Singaporean</option>
                <option key="Slovak" value="Slovak">Slovak</option>
                <option key="Slovenian" value="Slovenian">Slovenian</option>
                <option key="Somali" value="Somali">Somali</option>
                <option key="South African" value="South African">South African</option>
                <option key="South Korean" value="South Korean">South Korean</option>
                <option key="South Sudanese" value="South Sudanese">South Sudanese</option>
                <option key="Spanish" value="Spanish">Spanish</option>
                <option key="Sri Lankan" value="Sri Lankan">Sri Lankan</option>
                <option key="Sudanese" value="Sudanese">Sudanese</option>
                <option key="Surinamese" value="Surinamese">Surinamese</option>
                <option key="Swedish" value="Swedish">Swedish</option>
                <option key="Swiss" value="Swiss">Swiss</option>
                <option key="Syrian" value="Syrian">Syrian</option>
                <option key="Taiwanese" value="Taiwanese">Taiwanese</option>
                <option key="Tajik" value="Tajik">Tajik</option>
                <option key="Tanzanian" value="Tanzanian">Tanzanian</option>
                <option key="Thai" value="Thai">Thai</option>
                <option key="Timorese" value="Timorese">Timorese</option>
                <option key="Togolese" value="Togolese">Togolese</option>
                <option key="Trinidadian" value="Trinidadian">Trinidadian</option>
                <option key="Tunisian" value="Tunisian">Tunisian</option>
                <option key="Turkish" value="Turkish">Turkish</option>
                <option key="Turkmen" value="Turkmen">Turkmen</option>
                <option key="Ugandan" value="Ugandan">Ugandan</option>
                <option key="Ukrainian" value="Ukrainian">Ukrainian</option>
                <option key="Uruguayan" value="Uruguayan">Uruguayan</option>
                <option key="Uzbek" value="Uzbek">Uzbek</option>
                <option key="Venezuelan" value="Venezuelan">Venezuelan</option>
                <option key="Vietnamese" value="Vietnamese">Vietnamese</option>
                <option key="Welsh" value="Welsh">Welsh</option>
                <option key="Yemeni" value="Yemeni">Yemeni</option>
                <option key="Zambian" value="Zambian">Zambian</option>
                <option key="Zimbabwean" value="Zimbabwean">Zimbabwean</option>
            </select>
            <input type="date" placeholder="Contract Expiry"
              value={form.contractExpiry}
              onChange={e => setForm(prev => ({ ...prev, contractExpiry: e.target.value }))}
              style={input}
            />
            <input type="number" placeholder="Weekly Salary in € (e.g. 2)"
              value={form.weeklySalary}
              onChange={e => setForm(prev => ({ ...prev, weeklySalary: e.target.value }))}
              style={input}
            />
            <input type="text" placeholder="FIFA / National ID (optional, max 31 chars)"
              value={form.fifaId}
              onChange={e => setForm(prev => ({ ...prev, fifaId: e.target.value.slice(0, 31) }))}
              style={input}
            />


            <button onClick={registerPlayer}
              disabled={!form.name || !form.position || !form.nationality || !form.contractExpiry}
              style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--bg-primary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 500, padding: "8px 20px", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              REGISTER
            </button>
          </div>
          {txStatus && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
              {txStatus}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading players...</p>
      ) : error ? (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--red)", fontSize: "0.8rem" }}>{error}</p>
      ) : players.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO PLAYERS REGISTERED</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {players.filter(isMyPlayer).map((p) => {
            const status  = statusLabel(p);
            const pid     = p.id?.toString() ?? "?";
            const hasLegal = p._legalDocs?.registrationContractHash !== ZERO_BYTES32;
            const needsMedical  = !p.medicalClearance;
            const needsLegal    = !hasLegal;
            const needsWallet   = p.playerWallet === ethers.ZeroAddress;
            const canRequest    = p.medicalClearance && hasLegal && p.playerWallet !== ethers.ZeroAddress && !p.isVerified && !p.verificationActive;
            const actionKey = (type: string) => `${type}_${pid}`;

            return (
              <div key={pid} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>

                {/* ── Player header row ────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 120px 120px 160px 120px auto", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)" }}>#{pid}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem" }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{p.position}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{p.nationality}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                    {p.weeklySalary > 0n ? `€${(Number(p.weeklySalary) / 1e6).toLocaleString()}/wk` : "—"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${status.border}`, color: status.color, whiteSpace: "nowrap" as const }}>
                    {status.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                    {p.isListed ? `€${(Number(p.askingPrice) / 1e6).toLocaleString()}` : "—"}
                  </span>
                  <div>
                    {p.portraitCID ? (
                      <img src={ipfsUrl(p.portraitCID)} alt={p.name}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-accent)" }} />
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)" }}>—</span>
                    )}
                  </div>
                </div>

                {/* ── Action buttons row ───────────────────────── */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const, padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.01)", borderBottom: activeAction?.startsWith(`_${pid}`) ? "1px solid var(--border)" : "none" }}>
                  {needsMedical && (
                    <button onClick={() => setActiveAction(activeAction === actionKey("med") ? null : actionKey("med"))} style={btn("var(--amber)")}>SET MEDICAL</button>
                  )}
                  {needsLegal && (
                    <button onClick={() => setActiveAction(activeAction === actionKey("legal") ? null : actionKey("legal"))} style={btn("var(--amber)")}>SUBMIT LEGAL DOCS</button>
                  )}
                  {needsWallet && !needsMedical && !needsLegal && (
                    <button onClick={() => setActiveAction(activeAction === actionKey("wallet") ? null : actionKey("wallet"))} style={btn("var(--amber)")}>SET PLAYER WALLET</button>
                  )}
                  {canRequest && (
                    <button onClick={() => requestVerification(p.id)} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>REQUEST VERIFICATION</button>
                  )}
                  {p.verificationActive && (
                    <button onClick={() => claimVerificationRefund(p.id)} style={btn("var(--text-dim)")}>CLAIM REFUND (IF EXPIRED)</button>
                  )}
                  {p.isVerified && p.medicalClearance && p.medicalVerified && p._legalDocs?.documentsVerified && !p.isListed && listingId !== p.id && (
                    <button onClick={() => { setListingId(p.id); setListingPrice(""); }} style={btn("var(--gold)")}>LIST</button>
                  )}
                  {listingId === p.id && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>€</span>
                      <input type="number" placeholder="e.g. 20000000" value={listingPrice}
                        onChange={e => setListingPrice(e.target.value)}
                        style={{ ...input, width: "160px", padding: "4px 8px", border: "1px solid var(--border-accent)" }}
                      />
                      <button onClick={() => listPlayer(p.id)} disabled={!listingPrice}
                        style={btn("var(--green)", listingPrice ? "rgba(45,206,137,0.1)" : "transparent")}>CONFIRM</button>
                      <button onClick={() => { setListingId(null); setListingPrice(""); }} style={btn("var(--text-dim)")}>CANCEL</button>
                    </div>
                  )}
                  {p.isListed && (
                    <button onClick={() => delistPlayer(p.id)} style={btn("var(--red)")}>DELIST</button>
                  )}
                  {p.playerWallet !== ethers.ZeroAddress && (
                    <button onClick={() => setActiveAction(activeAction === actionKey("newwallet") ? null : actionKey("newwallet"))} style={btn("var(--text-dim)")}>UPDATE WALLET</button>
                  )}
                  {/* Termination — only show when player is not listed and wallet is set */}
                  {p.playerWallet !== ethers.ZeroAddress && !p.isListed && (
                    <button onClick={() => setActiveAction(activeAction === actionKey("terminate") ? null : actionKey("terminate"))} style={btn("var(--red)")}>TERMINATE CONTRACT</button>
                  )}
                </div>

                {/* ── Inline panels ────────────────────────────── */}
                {activeAction === actionKey("med") && (
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>MEDICAL DOCUMENT HASH (keccak256)</p>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <input type="text" placeholder="0x..." value={medHashInput}
                        onChange={e => setMedHashInput(e.target.value.trim())}
                        style={{ ...input, borderColor: medHashInput && !/^0x[0-9a-fA-F]{64}$/.test(medHashInput) ? "var(--red)" : "var(--border)" }}
                      />
                      <button onClick={() => submitMedicalHash(p.id)} disabled={!/^0x[0-9a-fA-F]{64}$/.test(medHashInput)}
                        style={btn("var(--amber)", !/^0x[0-9a-fA-F]{64}$/.test(medHashInput) ? "transparent" : "rgba(245,158,11,0.08)", !/^0x[0-9a-fA-F]{64}$/.test(medHashInput))}>
                        SUBMIT
                      </button>
                      <button onClick={() => { setActiveAction(null); setMedHashInput(""); }} style={btn("var(--text-dim)")}>CANCEL</button>
                    </div>
                  </div>
                )}

                {activeAction === actionKey("legal") && (
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>LEGAL DOCUMENT HASHES (all unique keccak256 values)</p>
                    <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      {[
                        { key: "reg" as const,    label: "REGISTRATION CONTRACT HASH",              placeholder: "0x..." },
                        { key: "tms" as const,    label: "FIFA TMS REFERENCE HASH",                 placeholder: "0x..." },
                        { key: "permit" as const, label: "WORK PERMIT HASH (optional — domestic)",  placeholder: "0x... or leave blank" },
                      ].map(f => (
                        <div key={f.key}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.3rem" }}>{f.label}</p>
                          <input type="text" placeholder={f.placeholder} value={legalInputs[f.key]}
                            onChange={e => setLegalInputs(prev => ({ ...prev, [f.key]: e.target.value.trim() }))}
                            style={{ ...input, borderColor: legalInputs[f.key] && !/^0x[0-9a-fA-F]{64}$/.test(legalInputs[f.key]) ? "var(--red)" : "var(--border)" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button onClick={() => submitLegalDocs(p.id)}
                        disabled={!/^0x[0-9a-fA-F]{64}$/.test(legalInputs.reg) || !/^0x[0-9a-fA-F]{64}$/.test(legalInputs.tms)}
                        style={btn("var(--gold)", "rgba(201,168,76,0.08)", !/^0x[0-9a-fA-F]{64}$/.test(legalInputs.reg) || !/^0x[0-9a-fA-F]{64}$/.test(legalInputs.tms))}>
                        SUBMIT DOCUMENTS
                      </button>
                      <button onClick={() => { setActiveAction(null); setLegalInputs({ reg: "", tms: "", permit: "" }); }} style={btn("var(--text-dim)")}>CANCEL</button>
                    </div>
                  </div>
                )}

                {activeAction === actionKey("wallet") && (
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--amber)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                      ⚠ Once set, only the player can update this address. Verify the wallet belongs to the player before submitting.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <input type="text" placeholder="0x..." value={walletInput}
                        onChange={e => setWalletInput(e.target.value.trim())}
                        style={input}
                      />
                      <button onClick={() => setPlayerWallet(p.id)} style={btn("var(--gold)", "rgba(201,168,76,0.08)")}>SET WALLET</button>
                      <button onClick={() => { setActiveAction(null); setWalletInput(""); }} style={btn("var(--text-dim)")}>CANCEL</button>
                    </div>
                  </div>
                )}

                {activeAction === actionKey("newwallet") && (
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>NEW WALLET ADDRESS — 48-HOUR TIMELOCK APPLIES</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--amber)", marginBottom: "0.5rem" }}>
                      The club can cancel this update within 48 hours as a security safeguard.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <input type="text" placeholder="0x..." value={newWalletInput}
                        onChange={e => setNewWalletInput(e.target.value.trim())}
                        style={input}
                      />
                      <button onClick={() => initiateWalletUpdate(p.id)} style={btn("var(--gold)", "rgba(201,168,76,0.08)")}>INITIATE UPDATE</button>
                      <button onClick={() => cancelWalletUpdate(p.id)} style={btn("var(--red)")}>CANCEL PENDING</button>
                      <button onClick={() => { setActiveAction(null); setNewWalletInput(""); }} style={btn("var(--text-dim)")}>CLOSE</button>
                    </div>
                  </div>
                )}

                {activeAction === actionKey("terminate") && (
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)", background: "rgba(220,38,38,0.03)" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>CONTRACT TERMINATION</p>
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
                      {/* Mutual termination */}
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>MUTUAL TERMINATION</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                          Player must be delisted. Requires player wallet confirmation. NFT burned on confirm.
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => proposeMutualTermination(p.id)} style={btn("var(--red)", "rgba(220,38,38,0.08)")}>
                            PROPOSE MUTUAL
                          </button>
                          <button onClick={() => withdrawMutualTermination(p.id)} style={btn("var(--text-dim)")}>
                            WITHDRAW PROPOSAL
                          </button>
                        </div>
                      </div>
                      {/* Unilateral termination */}
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>UNILATERAL TERMINATION</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--amber)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                          ⚠ Player must be delisted first. 7-day dispute window — player can contest. NFT burned if undisputed.
                        </p>
                        <input type="text" placeholder="Reason (stored on-chain)"
                          value={terminationReason}
                          onChange={e => setTerminationReason(e.target.value)}
                          style={{ ...input, marginBottom: "0.5rem", fontSize: "0.75rem", padding: "6px 10px" }}
                        />
                        <button onClick={() => proposeUnilateralTermination(p.id)}
                          disabled={!terminationReason.trim()}
                          style={btn("var(--red)", "rgba(220,38,38,0.08)", !terminationReason.trim())}>
                          PROPOSE UNILATERAL
                        </button>
                      </div>
                    </div>
                    <button onClick={() => { setActiveAction(null); setTerminationReason(""); }}
                      style={{ ...btn("var(--text-dim)"), marginTop: "0.75rem" }}>CLOSE</button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
