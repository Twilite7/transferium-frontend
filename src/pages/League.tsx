import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, TRANSFER_ESCROW_ABI, LOAN_ESCROW_ABI } from "../config/abis";
import { parseError } from "../utils/parseError";
import { waitForTx } from "../utils/waitForTx";

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

const btn = (color: string, bg = "transparent") => ({
  background:    bg,
  border:        `1px solid ${color}`,
  color:         color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  letterSpacing: "0.08em",
  padding:       "6px 16px",
  borderRadius:  "var(--radius-sm)",
  cursor:        "pointer",
  whiteSpace:    "nowrap" as const,
});

interface ClubEntry {
  address: string;
  hasRole: boolean;
  name?: string;
}

export function League({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [isRegistrar, setIsRegistrar] = useState(false);
  const [clubAddress, setClubAddress] = useState("");
  const [clubName, setClubName]       = useState("");
  const [status, setStatus]           = useState<string | null>(null);
  const [clubs, setClubs]             = useState<ClubEntry[]>([]);
  const [checking, setChecking]       = useState(false);

  useEffect(() => {
    if (!wallet.provider || !wallet.address) return;
    checkRegistrar();
  }, [wallet.provider, wallet.address]);

  async function checkRegistrar() {
    if (!wallet.provider || !wallet.address) return;
    try {
      const registry       = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
      setIsRegistrar(await registry.hasRole(REGISTRAR_ROLE, wallet.address));
    } catch {}
  }

  async function grantClubRole() {
    if (!wallet.signer || !clubAddress) return;
    try { ethers.getAddress(clubAddress); } catch { setStatus("Invalid wallet address."); return; }
    if (!clubName.trim()) { setStatus("Club name is required."); return; }
    setStatus("Granting club access on all contracts...");
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const escrow     = new ethers.Contract(CONTRACTS.TransferEscrow,  TRANSFER_ESCROW_ABI, wallet.signer);
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow,      LOAN_ESCROW_ABI,     wallet.signer);
      const CLUB_ROLE  = await registry.CLUB_ROLE();

      // I grant on all four contracts sequentially — a club needs access everywhere
      setStatus("1/4 PlayerRegistry...");
      await waitForTx(await registry.grantRole(CLUB_ROLE, clubAddress), wallet.provider!);
      setStatus("2/4 TransferEscrow...");
      await waitForTx(await escrow.grantRole(CLUB_ROLE, clubAddress), wallet.provider!);
      setStatus("3/4 LoanEscrow...");
      await waitForTx(await loanEscrow.grantRole(CLUB_ROLE, clubAddress), wallet.provider!);

      // DealEscrow uses LEAGUE_ROLE not CLUB_ROLE for admin, but clubs don't need a role there
      // — they interact through TransferEscrow which holds TRANSFER_ESCROW_ROLE on DealEscrow

      setStatus("4/4 Setting club name...");
      await waitForTx(await registry.setClubName(clubAddress, clubName.trim()), wallet.provider!);
      setStatus(`Club "${clubName.trim()}" granted access on all contracts.`);
      setClubs(prev => [...prev.filter(c => c.address.toLowerCase() !== clubAddress.toLowerCase()), { address: clubAddress, hasRole: true, name: clubName.trim() }]);
      setClubAddress("");
      setClubName("");
    } catch (err: any) {
      console.error("grantClubRole error:", err);
      setStatus(parseError(err));
    }
  }

  async function revokeClubRole(address: string) {
    if (!wallet.signer) return;
    setStatus("Revoking club access...");
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const escrow     = new ethers.Contract(CONTRACTS.TransferEscrow,  TRANSFER_ESCROW_ABI, wallet.signer);
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow,      LOAN_ESCROW_ABI,     wallet.signer);
      const CLUB_ROLE  = await registry.CLUB_ROLE();
      for (const [contract] of [[registry], [escrow], [loanEscrow]] as const) {
        const hasRole = await contract.hasRole(CLUB_ROLE, address);
        if (hasRole) {
          await waitForTx(await contract.revokeRole(CLUB_ROLE, address), wallet.provider!);
        }
      }
      setStatus("Club access revoked on all contracts.");
      setClubs(prev => prev.map(c => c.address.toLowerCase() === address.toLowerCase() ? { ...c, hasRole: false } : c));
    } catch (err: any) {
      console.error("revokeClubRole error:", err);
      setStatus(parseError(err));
    }
  }

  async function lookupAddress() {
    if (!clubAddress) return;
    try { ethers.getAddress(clubAddress); } catch { setStatus("Invalid wallet address."); return; }
    setChecking(true);
    setStatus(null);
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider!);
      const escrow     = new ethers.Contract(CONTRACTS.TransferEscrow,  TRANSFER_ESCROW_ABI, wallet.provider!);
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow,      LOAN_ESCROW_ABI,     wallet.provider!);
      const CLUB_ROLE  = await registry.CLUB_ROLE();
      const [r, e, l]  = await Promise.all([
        registry.hasRole(CLUB_ROLE, clubAddress),
        escrow.hasRole(CLUB_ROLE, clubAddress),
        loanEscrow.hasRole(CLUB_ROLE, clubAddress),
      ]);
      // I consider a club fully active only if it has the role on all three
      const hasRole = r && e && l;
      const registry2 = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider!);
      const name = await registry2.getClubName(clubAddress).catch(() => "");
      setClubs(prev => [...prev.filter(c => c.address.toLowerCase() !== clubAddress.toLowerCase()), { address: clubAddress, hasRole, name: name || undefined }]);
    } catch (err: any) {
      console.error("lookupAddress error:", err);
      setStatus(parseError(err));
    } finally {
      setChecking(false);
    }
  }

  if (!wallet.isConnected) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>Connect your wallet to access league management.</p>
    </div>
  );

  if (!isRegistrar) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--red)" }}>Access restricted to league registrars only.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>LEAGUE</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Manage club registrations and roles
        </p>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          CLUB WALLET ADDRESS
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input type="text" placeholder="0x..." value={clubAddress}
            onChange={e => setClubAddress(e.target.value)} style={input} />
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>CLUB NAME</p>
            <input type="text" placeholder="e.g. Manchester United FC" value={clubName}
              onChange={e => setClubName(e.target.value)} style={input} />
          </div>
          <button onClick={lookupAddress} disabled={checking} style={btn("var(--text-secondary)")}>
            {checking ? "CHECKING..." : "LOOKUP"}
          </button>
          <button onClick={grantClubRole} disabled={!clubAddress} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>
            GRANT
          </button>
        </div>
        {status && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
            {status}
          </p>
        )}
      </div>

      {clubs.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["WALLET","STATUS","ACTION"].map(h => (
                  <th key={h} style={{ padding: "1rem 1.25rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--text-dim)", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map((c, i) => (
                <tr key={c.address} style={{ borderBottom: i < clubs.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", marginBottom: "0.2rem" }}>{c.name ?? "—"}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>{c.address.slice(0,10)}...{c.address.slice(-8)}</p>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${c.hasRole ? "var(--green)" : "var(--border)"}`, color: c.hasRole ? "var(--green)" : "var(--text-dim)" }}>
                      {c.hasRole ? "ACTIVE CLUB" : "NO ROLE"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    {c.hasRole && (
                      <button onClick={() => revokeClubRole(c.address)} style={btn("var(--red)")}>REVOKE</button>
                    )}
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
