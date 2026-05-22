import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI } from "../config/abis";

interface Props {
  wallet:    ReturnType<typeof useWallet>;
  playerId:  bigint;
  player:    {
    isVerified:       boolean;
    medicalClearance: boolean;
    playerWallet:     string;
  };
  legalDocs: {
    documentsVerified:        boolean;
    registrationContractHash: string;
  };
  onRefresh: () => Promise<void>;
}

const input = {
  background:   "var(--bg-primary)",
  border:       "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color:        "var(--text-primary)",
  fontFamily:   "var(--font-mono)",
  fontSize:     "0.75rem",
  padding:      "7px 10px",
  outline:      "none",
  width:        "100%",
};

const labelStyle = {
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.6rem",
  color:         "var(--text-dim)",
  letterSpacing: "0.08em",
  marginBottom:  "0.35rem",
  display:       "block" as const,
};

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background:    disabled ? "transparent" : bg,
  border:        `1px solid ${disabled ? "var(--border)" : color}`,
  color:         disabled ? "var(--text-dim)" : color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  letterSpacing: "0.08em",
  padding:       "5px 14px",
  borderRadius:  "var(--radius-sm)",
  cursor:        disabled ? "not-allowed" : "pointer",
  whiteSpace:    "nowrap" as const,
  opacity:       disabled ? 0.5 : 1,
});

function isValidBytes32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isValidAddress(value: string): boolean {
  try {
    ethers.getAddress(value);
    return true;
  } catch {
    return false;
  }
}

const ZERO_BYTES32 = "0x" + "0".repeat(64);

export function RegistrarPanel({ wallet, playerId, player, legalDocs, onRefresh }: Props) {
  const [status, setStatus]             = useState<string | null>(null);
  const [medHash, setMedHash]           = useState("");
  const [regHash, setRegHash]           = useState("");
  const [tmsHash, setTmsHash]           = useState("");
  const [permitHash, setPermitHash]     = useState("");
  const [playerWallet, setPlayerWallet] = useState("");
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [playerInfo, setPlayerInfo]     = useState<{
    name: string; position: string; nationality: string;
    contractExpiry: bigint; weeklySalary: bigint; club: string; fifaId: string; clubName: string;
  } | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      if (!wallet.provider) return;
      try {
        const registry = new ethers.Contract(
          CONTRACTS.PlayerRegistry,
          ["function getPlayer(uint256) view returns (tuple(string name,string position,string nationality,uint256 contractExpiry,uint256 weeklySalary,string portraitCID,bytes32 fifaId,address club,bool verified))", "function getClubName(address) view returns (string)"],
          wallet.provider
        );
        const p = await registry.getPlayer(playerId);
        let clubName = "";
        try {
          const name = await registry.getClubName(p.club);
          clubName = name || "";
        } catch {}
        setPlayerInfo({
          name: p.name, position: p.position, nationality: p.nationality,
          contractExpiry: p.contractExpiry, weeklySalary: p.weeklySalary,
          club: p.club, fifaId: p.fifaId, clubName,
        });
      } catch {}
    }
    fetchInfo();
  }, [playerId, wallet.provider]);

  function getRegistry() {
    if (!wallet.signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
  }

  async function verifyPlayer() {
    setStatus("Verifying player...");
    try {
      const registry = getRegistry();
      await waitForTx(await registry.verifyPlayer(playerId), wallet.provider!);
      setStatus("Player verified.");
      setExpanded(null);
      await onRefresh();
    } catch (err: any) {
      setStatus(parseError(err));
    }
  }

  async function setMedicalClearance() {
    if (!isValidBytes32(medHash)) {
      setStatus("Invalid document hash. Must be a 0x-prefixed 32-byte hex string.");
      return;
    }
    setStatus("Setting medical clearance...");
    try {
      const registry = getRegistry();
      await waitForTx(await registry.setMedicalClearance(playerId, medHash), wallet.provider!);
      setStatus("Medical clearance set.");
      setMedHash("");
      setExpanded(null);
      await onRefresh();
    } catch (err: any) {
      setStatus(parseError(err));
    }
  }

  async function submitLegalDocuments() {
    if (!isValidBytes32(regHash))  { setStatus("Invalid registration contract hash."); return; }
if (!isValidBytes32(tmsHash))  { setStatus("Invalid FIFA TMS hash."); return; }

    const workPermit = permitHash === "" ? ZERO_BYTES32 : permitHash;
    if (permitHash !== "" && !isValidBytes32(permitHash)) {
      setStatus("Invalid work permit hash.");
      return;
    }

    setStatus("Submitting legal documents...");
    try {
      const registry = getRegistry();
      await waitForTx(await registry.submitLegalDocuments(playerId, regHash, tmsHash, workPermit), wallet.provider!);
      setStatus("Legal documents submitted.");
      setRegHash(""); setTmsHash(""); setPermitHash("");
      setExpanded(null);
      await onRefresh();
    } catch (err: any) {
      console.error("submitLegalDocuments error:", err);
      setStatus(parseError(err));
    }
  }

  async function verifyLegalDocuments() {
    setStatus("Verifying legal documents...");
    try {
      const registry = getRegistry();
      await waitForTx(await registry.verifyLegalDocuments(playerId), wallet.provider!);
      setStatus("Legal documents verified.");
      setExpanded(null);
      await onRefresh();
    } catch (err: any) {
      setStatus(parseError(err));
    }
  }

  async function setPlayerWalletAddress() {
    if (!isValidAddress(playerWallet)) {
      setStatus("Invalid Ethereum address.");
      return;
    }
    setStatus("Setting player wallet...");
    try {
      const registry = getRegistry();
      await waitForTx(await registry.setPlayerWallet(playerId, playerWallet), wallet.provider!);
      setStatus("Player wallet set. Only the player can update this going forward.");
      setPlayerWallet("");
      setExpanded(null);
      await onRefresh();
    } catch (err: any) {
      setStatus(parseError(err));
    }
  }

  const sectionStyle = (key: string) => ({
    border:       `1px solid ${expanded === key ? "var(--border-accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    marginBottom: "0.5rem",
    overflow:     "hidden" as const,
  });

  const sectionHeader = (key: string, title: string, done: boolean) => (
    <div
      onClick={() => !done && setExpanded(expanded === key ? null : key)}
      style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        padding:        "0.6rem 1rem",
        cursor:         done ? "default" : "pointer",
        background:     expanded === key ? "rgba(255,255,255,0.03)" : "transparent",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: done ? "var(--green)" : "var(--text-secondary)" }}>
        {done ? "✓ " : ""}{title}
      </span>
      {!done && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
          {expanded === key ? "▲" : "▼"}
        </span>
      )}
    </div>
  );

  return (
    <div style={{
      background:   "rgba(201,168,76,0.03)",
      border:       "1px solid var(--gold-dim)",
      borderRadius: "var(--radius-sm)",
      padding:      "1rem 1.25rem",
      marginTop:    "0.75rem",
    }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
        REGISTRAR ACTIONS — PLAYER #{playerId.toString()}
      </p>

      {playerInfo && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>PLAYER INFORMATION</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 1.5rem" }}>
            {[
              ["NAME",             playerInfo.name],
              ["POSITION",         playerInfo.position],
              ["NATIONALITY",      playerInfo.nationality],
              ["CLUB",             (playerInfo.clubName ? playerInfo.clubName + " — " : "") + playerInfo.club.slice(0,10) + "..." + playerInfo.club.slice(-6)],
              ["CONTRACT EXPIRY",  new Date(Number(playerInfo.contractExpiry) * 1000).toLocaleDateString()],
              ["WEEKLY SALARY",    playerInfo.weeklySalary > 0n ? ethers.formatUnits(playerInfo.weeklySalary, 6) + " USDC" : "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.08em", display: "block" }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sectionStyle("verify")}>
        {sectionHeader("verify", "Step 1: Player Verification", player.isVerified)}
        {!player.isVerified && expanded === "verify" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
              Confirm the player's eligibility to participate in the protocol.
            </p>
            <button onClick={verifyPlayer} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>
              VERIFY PLAYER
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle("medical")}>
        {sectionHeader("medical", "Step 2: Medical Clearance", player.medicalClearance)}
        {!player.medicalClearance && expanded === "medical" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
              Paste the keccak256 hash of the medical report. The document itself stays off-chain.
            </p>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={labelStyle}>MEDICAL REPORT HASH (bytes32)</span>
              <input
                type="text"
                placeholder="0x..."
                value={medHash}
                onChange={e => setMedHash(e.target.value.trim())}
                style={{ ...input, borderColor: medHash && !isValidBytes32(medHash) ? "var(--red)" : "var(--border)" }}
              />
              {medHash && !isValidBytes32(medHash) && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", marginTop: "0.3rem" }}>
                  Must be 0x followed by 64 hex characters
                </p>
              )}
            </div>
            <button
              onClick={setMedicalClearance}
              disabled={!isValidBytes32(medHash)}
              style={btn("var(--green)", "rgba(45,206,137,0.08)", !isValidBytes32(medHash))}>
              SET MEDICAL CLEARANCE
            </button>
          </div>
        )}
      </div>

      <div style={sectionStyle("legal")}>
        {sectionHeader("legal", "Step 3: Legal Documents", legalDocs.documentsVerified)}
        {!legalDocs.documentsVerified && expanded === "legal" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            {legalDocs.registrationContractHash === ZERO_BYTES32 ? (
              <>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                  Submit document hashes. All documents stay off-chain — only their hashes are stored on-chain.
                </p>
                <div style={{ display: "grid", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  {[
                    { key: "reg",    title: "REGISTRATION CONTRACT HASH", value: regHash,    set: setRegHash,    required: true  },
                    { key: "tms",    title: "FIFA TMS REFERENCE HASH",    value: tmsHash,    set: setTmsHash,    required: true  },
                    { key: "permit", title: "WORK PERMIT HASH (optional)", value: permitHash, set: setPermitHash, required: false },
                  ].map(f => (
                    <div key={f.key}>
                      <span style={labelStyle}>{f.title}</span>
                      <input
                        type="text"
                        placeholder={f.required ? "0x..." : "0x... (leave blank for domestic transfers)"}
                        value={f.value}
                        onChange={e => f.set(e.target.value.trim())}
                        style={{ ...input, borderColor: f.value && !isValidBytes32(f.value) ? "var(--red)" : "var(--border)" }}
                      />
                      {f.value && !isValidBytes32(f.value) && (
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", marginTop: "0.2rem" }}>
                          Must be 0x followed by 64 hex characters
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={submitLegalDocuments}
                  disabled={!isValidBytes32(regHash) || !isValidBytes32(tmsHash)}
                  style={btn("var(--gold)", "rgba(201,168,76,0.08)",
                    !isValidBytes32(regHash) || !isValidBytes32(tmsHash))}>
                  SUBMIT DOCUMENTS
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                  Documents submitted. Verify after completing off-chain review.
                </p>
                <button onClick={verifyLegalDocuments} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>
                  VERIFY DOCUMENTS
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle("wallet")}>
        {sectionHeader("wallet", "Step 4: Player Wallet", player.playerWallet !== ethers.ZeroAddress)}
        {player.playerWallet === ethers.ZeroAddress && expanded === "wallet" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--amber)", marginBottom: "0.75rem" }}>
              ⚠ Once set, only the player can update this address. Verify the wallet belongs to the player before submitting.
            </p>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={labelStyle}>PLAYER WALLET ADDRESS</span>
              <input
                type="text"
                placeholder="0x..."
                value={playerWallet}
                onChange={e => setPlayerWallet(e.target.value.trim())}
                style={{ ...input, borderColor: playerWallet && !isValidAddress(playerWallet) ? "var(--red)" : "var(--border)" }}
              />
              {playerWallet && !isValidAddress(playerWallet) && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--red)", marginTop: "0.3rem" }}>
                  Invalid Ethereum address
                </p>
              )}
            </div>
            <button
              onClick={setPlayerWalletAddress}
              disabled={!isValidAddress(playerWallet)}
              style={btn("var(--gold)", "rgba(201,168,76,0.08)", !isValidAddress(playerWallet))}>
              SET PLAYER WALLET
            </button>
          </div>
        )}
        {player.playerWallet !== ethers.ZeroAddress && (
          <div style={{ padding: "0.4rem 1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
              {player.playerWallet.slice(0, 10)}...{player.playerWallet.slice(-8)}
            </span>
          </div>
        )}
      </div>

      {status && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
          {status}
        </p>
      )}
    </div>
  );
}
