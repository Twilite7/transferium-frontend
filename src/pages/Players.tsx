import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI } from "../config/abis";

interface Player {
  id:             bigint;
  name:           string;
  position:       string;
  nationality:    string;
  contractExpiry: bigint;
  currentClub:    string;
  isVerified:     boolean;
  isListed:       boolean;
  askingPrice:    bigint;
  registeredAt:   bigint;
}

const btn = (color: string, bg = "transparent") => ({
  background:   bg,
  border:       `1px solid ${color}`,
  color:        color,
  fontFamily:   "var(--font-mono)",
  fontSize:     "0.65rem",
  letterSpacing: "0.08em",
  padding:      "3px 10px",
  borderRadius: "var(--radius-sm)",
  cursor:       "pointer",
  whiteSpace:   "nowrap" as const,
});

export function Players({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [players, setPlayers]       = useState<Player[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [txStatus, setTxStatus]     = useState<string | null>(null);
  const [form, setForm]             = useState({ name: "", position: "", nationality: "", contractExpiry: "" });

  // I track which player row is in "listing mode" and its price input
  const [listingId, setListingId]   = useState<bigint | null>(null);
  const [listingPrice, setListingPrice] = useState("");

  // I track roles for the connected wallet
  const [isRegistrar, setIsRegistrar] = useState(false);

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
        try { loaded.push(await registry.getPlayer(i)); } catch {}
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
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const fee      = await registry.registrationFee();
      const expiry   = Math.floor(new Date(form.contractExpiry).getTime() / 1000);
      const tx       = await registry.registerPlayer(form.name, form.position, form.nationality, expiry, { value: fee });
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Player registered.");
      setForm({ name: "", position: "", nationality: "", contractExpiry: "" });
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function verifyPlayer(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Verifying #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const tx       = await registry.verifyPlayer(playerId);
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus(`Player #${playerId} verified.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function listPlayer(playerId: bigint) {
    if (!wallet.signer || !listingPrice) return;
    setTxStatus(`Listing #${playerId}...`);
    try {
      const registry  = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const fee       = await registry.listingFee();
      // I convert EUR price to EURC units (6 decimals)
      const priceUnits = ethers.parseUnits(listingPrice, 6);
      const tx        = await registry.listPlayer(playerId, priceUnits, { value: fee });
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus(`Player #${playerId} listed.`);
      setListingId(null);
      setListingPrice("");
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function delistPlayer(playerId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Delisting #${playerId}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const tx       = await registry.delistPlayer(playerId);
      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus(`Player #${playerId} delisted.`);
      await loadPlayers();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  const isMyPlayer = (p: Player) =>
    wallet.address && p.currentClub.toLowerCase() === wallet.address.toLowerCase();

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>PLAYERS</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Register and manage player records on-chain
        </p>
      </div>

      {/* Register form */}
      {wallet.isConnected && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>REGISTER NEW PLAYER</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
            {[
              { key: "name",           placeholder: "Full Name",       type: "text" },
              { key: "position",       placeholder: "Position",        type: "text" },
              { key: "nationality",    placeholder: "Nationality",     type: "text" },
              { key: "contractExpiry", placeholder: "Contract Expiry", type: "date" },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "8px 12px", outline: "none", width: "100%" }}
              />
            ))}
            <button onClick={registerPlayer}
              disabled={!form.name || !form.position || !form.nationality || !form.contractExpiry}
              style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--bg-primary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 500, padding: "8px 20px", cursor: "pointer", whiteSpace: "nowrap" }}>
              REGISTER
            </button>
          </div>
          {txStatus && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>{txStatus}</p>
          )}
        </div>
      )}

      {/* Players table */}
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
                {["ID","NAME","POS","NATIONALITY","CLUB","STATUS","ASKING PRICE","ACTIONS"].map(h => (
                  <th key={h} style={{ padding: "1rem 1.25rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-dim)", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id.toString()} style={{ borderBottom: i < players.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>#{p.id.toString()}</td>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-body)", fontSize: "0.85rem" }}>{p.name}</td>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.position}</td>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{p.nationality}</td>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-mono)" }}>{p.currentClub.slice(0,8)}...{p.currentClub.slice(-6)}</td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em",
                      padding: "3px 8px", borderRadius: "var(--radius-sm)",
                      border: `1px solid ${p.isListed ? "var(--gold-dim)" : p.isVerified ? "var(--border-accent)" : "var(--border)"}`,
                      color:  p.isListed ? "var(--gold)" : p.isVerified ? "var(--text-secondary)" : "var(--text-dim)",
                    }}>
                      {p.isListed ? "LISTED" : p.isVerified ? "VERIFIED" : "PENDING"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                    {p.isListed ? `€${(Number(p.askingPrice) / 1e6).toLocaleString()}` : "—"}
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" as const }}>
                      {/* VERIFY — shown to registrar on unverified players */}
                      {isRegistrar && !p.isVerified && (
                        <button onClick={() => verifyPlayer(p.id)} style={btn("var(--green)")}>VERIFY</button>
                      )}

                      {/* LIST — shown to player's club on verified, unlisted players */}
                      {isMyPlayer(p) && p.isVerified && !p.isListed && listingId !== p.id && (
                        <button onClick={() => { setListingId(p.id); setListingPrice(""); }} style={btn("var(--gold)")}>LIST</button>
                      )}

                      {/* Inline listing form — price input + confirm + cancel */}
                      {listingId === p.id && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>€</span>
                          <input
                            type="number"
                            placeholder="asking price"
                            value={listingPrice}
                            onChange={e => setListingPrice(e.target.value)}
                            style={{ background: "var(--bg-primary)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "4px 8px", outline: "none", width: "120px" }}
                          />
                          <button
                            onClick={() => listPlayer(p.id)}
                            disabled={!listingPrice}
                            style={btn("var(--green)", listingPrice ? "rgba(45,206,137,0.1)" : "transparent")}>
                            CONFIRM
                          </button>
                          <button onClick={() => { setListingId(null); setListingPrice(""); }} style={btn("var(--text-dim)")}>
                            CANCEL
                          </button>
                        </div>
                      )}

                      {/* DELIST — shown to player's club on listed players */}
                      {isMyPlayer(p) && p.isListed && (
                        <button onClick={() => delistPlayer(p.id)} style={btn("var(--red)")}>DELIST</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
