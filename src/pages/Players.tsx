import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI } from "../config/abis";
import { RegistrarPanel } from "../components/RegistrarPanel";

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

export function Players({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [players, setPlayers]         = useState<Player[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [txStatus, setTxStatus]       = useState<string | null>(null);
  const [isRegistrar, setIsRegistrar] = useState(false);
  const [listingId, setListingId]     = useState<bigint | null>(null);
  const [listingPrice, setListingPrice] = useState("");

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
      const registry      = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
      setIsRegistrar(await registry.hasRole(REGISTRAR_ROLE, wallet.address));
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
          const raw = await registry.getPlayer(i);
          const owner = await registry.ownerOf(i);
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
            _owner:              owner,
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

  async function registerPlayer() {
    if (!wallet.signer) return;
    setTxStatus("Submitting...");
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      
      const expiry     = Math.floor(new Date(form.contractExpiry).getTime() / 1000) + 86400;
      const salary     = form.weeklySalary ? ethers.parseUnits(form.weeklySalary, 6) : 0n;
      console.log("ARGS:", form.name, form.position, form.nationality, expiry, salary, typeof salary);
      const tx = await registry.registerPlayer(form.name, form.position, form.nationality, expiry, salary, { value: 0n });
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Player registered.");
      setForm({ name: "", position: "", nationality: "", contractExpiry: "", weeklySalary: "" });
      await loadPlayers();
    } catch (err: any) {
      const msg = err.data === "0xee457142" ? "A player with this name is already registered by your club." : (err.reason ?? err.message);
      setTxStatus(`Error: ${msg}`);
    }
  }

  async function verifyPlayer(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Verifying #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await (await registry.verifyPlayer(playerId)).wait();
      setTxStatus(`Player #${playerId} verified.`);
      await loadPlayers();
    } catch (err: any) {
      const msg = err.data === "0xee457142" ? "A player with this name is already registered by your club." : (err.reason ?? err.message);
      setTxStatus(`Error: ${msg}`);
    }
  }

  async function listPlayer(playerId: bigint) {
    if (!wallet.signer || !listingPrice) return;
    setTxStatus(`Listing #${playerId}...`);
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const fee        = await registry.listingFee();
      const priceUnits = ethers.parseUnits(listingPrice, 6);
      await (await registry.listPlayer(playerId, priceUnits, { value: fee })).wait();
      setTxStatus(`Player #${playerId} listed.`);
      setListingId(null);
      setListingPrice("");
      await loadPlayers();
    } catch (err: any) {
      const msg = err.data === "0xee457142" ? "A player with this name is already registered by your club." : (err.reason ?? err.message);
      setTxStatus(`Error: ${msg}`);
    }
  }

  async function delistPlayer(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Delisting #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await (await registry.delistPlayer(playerId)).wait();
      setTxStatus(`Player #${playerId} delisted.`);
      await loadPlayers();
    } catch (err: any) {
      const msg = err.data === "0xee457142" ? "A player with this name is already registered by your club." : (err.reason ?? err.message);
      setTxStatus(`Error: ${msg}`);
    }
  }

  const isMyPlayer = (p: Player) =>
    wallet.address ? p._owner?.toLowerCase() === wallet.address.toLowerCase() : false;

  const statusLabel = (p: Player) => {
    if (p.isListed) return { label: "LISTED", color: "var(--gold)", border: "var(--gold-dim)" };
    if (p.medicalClearance) return { label: "CLEARED", color: "var(--green)", border: "var(--green)" };
    if (p.isVerified) return { label: "VERIFIED", color: "var(--text-secondary)", border: "var(--border-accent)" };
    return { label: "PENDING", color: "var(--text-dim)", border: "var(--border)" };
  };

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>PLAYERS</h1>
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
            {[
              { key: "name",           placeholder: "Full Name",        type: "text"   },
              { key: "position",       placeholder: "Position",         type: "text"   },
              { key: "nationality",    placeholder: "Nationality",      type: "text"   },
              { key: "contractExpiry", placeholder: "Contract Expiry",  type: "date"   },
              { key: "weeklySalary",   placeholder: "Weekly Salary in € (e.g. 50000)", type: "number" },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={input}
              />
            ))}
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
              {players.map((p, i) => {
                const status = statusLabel(p);
                return (
                  <>
                  <tr key={p.id?.toString() ?? String(i)} style={{ borderBottom: !isRegistrar && i < players.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>#{p.id?.toString() ?? "?"}</td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-body)", fontSize: "0.85rem" }}>{p.name}</td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.position}</td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.nationality}</td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      {p.weeklySalary > 0n ? `€${(Number(p.weeklySalary) / 1e6).toLocaleString()}/wk` : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${status.border}`, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      {p.isListed ? `€${(Number(p.askingPrice) / 1e6).toLocaleString()}` : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" as const }}>
                        {isRegistrar && !p.isVerified && (
                          <button onClick={() => verifyPlayer(p.id)} style={btn("var(--green)")}>VERIFY</button>
                        )}
                        {isMyPlayer(p) && p.isVerified && !p.isListed && listingId !== p.id && (
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
                      </div>
                    </td>
                  </tr>
                  {isRegistrar && (
                    <tr key={`reg-${p.id?.toString() ?? String(i)}`} style={{ borderBottom: i < players.length - 1 ? "1px solid var(--border)" : "none" }}>
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
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
