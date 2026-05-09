import React, { useEffect, useState } from "react";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI } from "../config/abis";
import { RegistrarPanel } from "../components/RegistrarPanel";
import { uploadPortrait } from "../utils/pinata";
import { ipfsUrl } from "../config/contracts";

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
  askingPrice:         bigint;
  releaseClause:       bigint;
  registeredAt:        bigint;
  portraitCID:         string;
  _owner?:             string;
  _legalDocs?:         { documentsVerified: boolean; registrationContractHash: string; };
}

const btn = (color: string, bg = "transparent") => ({
  background:    bg,
  border:        `1px solid ${color}`,
  color:         color,
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
  const [isRegistrar, setIsRegistrar]   = useState(false);
  const [clubName, setClubName]         = useState<string>("");
  const [listingId, setListingId]       = useState<bigint | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", position: "", nationality: "", contractExpiry: "", weeklySalary: ""
  });

  useEffect(() => {
    if (!wallet.provider) return;
    loadPlayers();
    checkRoles();
  }, [wallet.provider, wallet.address]);

  async function checkRoles() {
    if (!wallet.provider || !wallet.address) return;
    try {
      const registry       = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
      setIsRegistrar(await registry.hasRole(REGISTRAR_ROLE, wallet.address));
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
          const legalRaw = await registry.getLegalDocuments(i);
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
            askingPrice:         raw.askingPrice,
            releaseClause:       raw.releaseClause,
            registeredAt:        raw.registeredAt,
            portraitCID:         raw.portraitCID ?? "",
            _owner:              owner,
            _legalDocs:          {
              documentsVerified:        legalRaw.documentsVerified,
              registrationContractHash: legalRaw.registrationContractHash,
            },
          });
        } catch {}
      }
      setPlayers(loaded);
    } catch (err: any) {
      setError(err.message ?? "Failed to load players");
    } finally {
      setLoading(false);
    }
  }

  async function handlePortraitUpload(playerId: bigint, file: File) {
    if (!wallet.signer) return;
    setTxStatus(`Uploading portrait for #${playerId}...`);
    try {
      const cid      = await uploadPortrait(file);
      setTxStatus(`Pinned to IPFS. Saving on-chain...`);
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.setPortrait(playerId, cid), wallet.provider!);
      setTxStatus(`Portrait updated for #${playerId}.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function handlePortraitSelect(file: File) {
    setPortraitFile(file);
    setPortraitPreview(URL.createObjectURL(file));
  }

  async function registerPlayer() {
    if (!wallet.signer) return;
    setTxStatus("Submitting...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const expiry   = Math.floor(new Date(form.contractExpiry).getTime() / 1000) + 86400;
      const salary   = form.weeklySalary ? ethers.parseUnits(form.weeklySalary, 6) : 0n;
      const regFee   = await registry.registrationFee();
      let cid = "";
      if (portraitFile) {
        setTxStatus("Uploading portrait to IPFS...");
        cid = await uploadPortrait(portraitFile);
      }
      const tx       = await registry.registerPlayer(
        form.name, form.position, form.nationality, expiry, salary, cid, { value: regFee }
      );
      setTxStatus("Waiting for confirmation...");
      await waitForTx(tx, wallet.provider!);
      setTxStatus("Player registered.");
      setForm({ name: "", position: "", nationality: "", contractExpiry: "", weeklySalary: "" });
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(parseError(err));
    }
  }

  async function listPlayer(playerId: bigint) {
    if (!wallet.signer || !listingPrice) return;
    setTxStatus(`Listing #${playerId}...`);
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const fee        = await registry.listingFee();
      const priceUnits = ethers.parseUnits(listingPrice, 6);
      await waitForTx(await registry.listPlayer(playerId, priceUnits, { value: fee }), wallet.provider!);
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

  const isMyPlayer = (p: Player) =>
    wallet.address ? p._owner?.toLowerCase() === wallet.address.toLowerCase() : false;

  const statusLabel = (p: Player) => {
    if (p.isListed)         return { label: "LISTED",    color: "var(--gold)",           border: "var(--gold-dim)"      };
    if (p.medicalClearance) return { label: "CLEARED",   color: "var(--green)",          border: "var(--green)"         };
    if (p.isVerified)       return { label: "VERIFIED",  color: "var(--text-secondary)", border: "var(--border-accent)" };
    return                         { label: "PENDING",   color: "var(--text-dim)",       border: "var(--border)"        };
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
            <input type="number" placeholder="Weekly Salary in € (e.g. 50000)"
              value={form.weeklySalary}
              onChange={e => setForm(prev => ({ ...prev, weeklySalary: e.target.value }))}
              style={input}
            />
            {/* Portrait upload */}
            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", display: "block", marginBottom: "0.35rem" }}>
                PLAYER PORTRAIT (optional — uploaded to IPFS)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {portraitPreview && (
                  <img src={portraitPreview} alt="preview"
                    style={{ width: 56, height: 56, borderRadius: "var(--radius-sm)", objectFit: "cover", border: "1px solid var(--border)" }} />
                )}
                <label style={{ ...btn("var(--text-dim)"), cursor: "pointer", display: "inline-block" }}>
                  {portraitFile ? portraitFile.name : "CHOOSE IMAGE"}
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePortraitSelect(f); e.target.value = ""; }} />
                </label>
                {portraitFile && (
                  <button onClick={() => { setPortraitFile(null); setPortraitPreview(null); }}
                    style={btn("var(--text-dim)")}>CLEAR</button>
                )}
              </div>
            </div>

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
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["ID","NAME","POS","NATIONALITY","WEEKLY SALARY","STATUS","ASKING PRICE","ACTIONS"].map(h => (
                  <th key={h} style={{ padding: "1rem 1.25rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-dim)", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(isRegistrar ? players : players.filter(isMyPlayer)).map((p, i) => {
                const status     = statusLabel(p);
                const isLast     = i === players.length - 1;
                const showBorder = !isLast || isRegistrar;
                return (
                  <React.Fragment key={p.id?.toString() ?? String(i)}>
                    <tr style={{ borderBottom: showBorder ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>#{p.id?.toString() ?? "?"}</td>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-body)", fontSize: "0.85rem" }}>{p.name}</td>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.position}</td>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.nationality}</td>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        {isRegistrar ? "—" : p.weeklySalary > 0n ? `€${(Number(p.weeklySalary) / 1e6).toLocaleString()}/wk` : "—"}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${status.border}`, color: status.color }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        {isRegistrar ? "—" : p.isListed ? `€${(Number(p.askingPrice) / 1e6).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" as const }}>
                          {isMyPlayer(p) && p.isVerified && p.medicalClearance && p._legalDocs?.documentsVerified && !p.isListed && listingId !== p.id && (
                            <button onClick={() => { setListingId(p.id); setListingPrice(""); }} style={btn("var(--gold)")}>LIST</button>
                          )}
                          {listingId === p.id && (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>€</span>
                              <input type="number" placeholder="asking price" value={listingPrice}
                                onChange={e => setListingPrice(e.target.value)}
                                style={{ ...input, width: "120px", padding: "4px 8px", border: "1px solid var(--border-accent)" }}
                              />
                              <button onClick={() => listPlayer(p.id)} disabled={!listingPrice}
                                style={btn("var(--green)", listingPrice ? "rgba(45,206,137,0.1)" : "transparent")}>
                                CONFIRM
                              </button>
                              <button onClick={() => { setListingId(null); setListingPrice(""); }} style={btn("var(--text-dim)")}>
                                CANCEL
                              </button>
                            </div>
                          )}
                          {isMyPlayer(p) && p.isListed && (
                            <button onClick={() => delistPlayer(p.id)} style={btn("var(--red)")}>DELIST</button>
                          )}
                          {isMyPlayer(p) && (
                            <label title="Upload portrait to IPFS" style={{ cursor: "pointer" }}>
                              {p.portraitCID ? (
                                <img src={ipfsUrl(p.portraitCID)} alt={p.name}
                                  style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-accent)" }} />
                              ) : (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", border: "1px dashed var(--border)", padding: "3px 6px", borderRadius: "var(--radius-sm)" }}>PHOTO</span>
                              )}
                              <input type="file" accept="image/*" style={{ display: "none" }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePortraitUpload(p.id, f); e.target.value = ""; }}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isRegistrar && (
                      <tr key={`reg-${p.id?.toString() ?? String(i)}`} style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
                        <td colSpan={8} style={{ padding: "0 1.25rem 1rem" }}>
                          <RegistrarPanel
                            wallet={wallet}
                            playerId={p.id}
                            player={{ isVerified: p.isVerified, medicalClearance: p.medicalClearance, playerWallet: p.playerWallet }}
                            legalDocs={p._legalDocs ?? { documentsVerified: false, registrationContractHash: "0x" + "0".repeat(64) }}
                            onRefresh={loadPlayers}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
