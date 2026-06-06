import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, DEAL_ESCROW_ABI, TRANSFER_WINDOW_ABI, ERC20_ABI } from "../config/abis";

interface Club {
  address: string;
  name:    string;
  players: number;
}

interface Stats {
  totalPlayers: string;
  totalDeals:   string;
  windowOpen:   boolean;
  windowLabel:  string;
  windowCloses: string;
  eurcBalance:  string;
  claimable:    string;
}

export function Dashboard({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [clubs,   setClubs]   = useState<Club[]>([]);

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (!wallet.provider) return;
    loadStats();
  }, [wallet.provider, wallet.address]);

  async function loadStats() {
    if (!wallet.provider) return;
    setLoading(true);
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow,     DEAL_ESCROW_ABI,     wallet.provider);
      const win        = new ethers.Contract(CONTRACTS.TransferWindow,  TRANSFER_WINDOW_ABI, wallet.provider);

      // I pull totalDeals from DealEscrow — TransferEscrow owns offers, DealEscrow owns deals
      const [totalPlayers, totalDeals, windowOpen] = await Promise.all([
        registry.totalPlayers(),
        dealEscrow.totalDeals(),
        win.isWindowOpen(),
      ]);

      let windowLabel = "—", windowCloses = "—";
      if (windowOpen) {
        try {
          const active = await win.getActiveWindow();
          windowLabel  = active.label;
          windowCloses = new Date(Number(active.closesAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        } catch {}
      }

      let eurcBalance = "—", claimable = "—";
      if (wallet.address) {
        const eurc = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.provider);
        const [bal, claim] = await Promise.all([
          eurc.balanceOf(wallet.address),
          dealEscrow.getClaimable(wallet.address, EURC_ADDRESS),
        ]);
        eurcBalance = (Number(bal)   / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        claimable   = (Number(claim) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      setStats({ totalPlayers: totalPlayers.toString(), totalDeals: totalDeals.toString(), windowOpen, windowLabel, windowCloses, eurcBalance, claimable });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // v2
  async function loadClubs() {
    try {
      const publicProvider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
      const registry  = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, publicProvider);
      const CLUB_ROLE = await registry.CLUB_ROLE();
      const roleGrantedTopic = ethers.id("RoleGranted(bytes32,address,address)");
      const roleRevokedTopic = ethers.id("RoleRevoked(bytes32,address,address)");
      const paddedRole = ethers.zeroPadValue(CLUB_ROLE, 32);
      const DEPLOY_BLOCK = 45600178;
      const CHUNK = 9000;
      const toBlock = await publicProvider.getBlockNumber();
      // I paginate in 9000-block chunks to stay within Arc RPC limits
      const grantedLogs: any[] = [];
      const revokedLogs: any[] = [];
      for (let from = DEPLOY_BLOCK; from <= toBlock; from += CHUNK) {
        const to = Math.min(from + CHUNK - 1, toBlock);
        const [g, r] = await Promise.all([
          publicProvider.getLogs({ address: CONTRACTS.PlayerRegistry, topics: [roleGrantedTopic, paddedRole], fromBlock: from, toBlock: to }),
          publicProvider.getLogs({ address: CONTRACTS.PlayerRegistry, topics: [roleRevokedTopic, paddedRole], fromBlock: from, toBlock: to }),
        ]);
        grantedLogs.push(...g);
        revokedLogs.push(...r);
      }
      const decode = (log: any) => ("0x" + log.topics[2].slice(-40)).toLowerCase();
      const grantedFiltered = grantedLogs;
      const revokedFiltered = revokedLogs;
      const active = new Set<string>(grantedFiltered.map((log: any) => decode(log)));
      revokedFiltered.forEach((log: any) => active.delete(decode(log)));
      const list: Club[] = await Promise.all(
        Array.from(active).map(async (addr) => {
          const r = new ethers.Contract(CONTRACTS.PlayerRegistry, [
            "function getClubName(address) view returns (string)",
            "function verifiedPlayerCount(address) view returns (uint256)",
          ], publicProvider);
          const [name, bal] = await Promise.all([
            r.getClubName(addr).catch(() => ""),
            r.verifiedPlayerCount(addr).catch(() => 0n),
          ]);
          return { address: addr, name: name || "Unnamed Club", players: Number(bal) };
        })
      );
      setClubs(list.sort((a, b) => b.players - a.players));
    } catch (err) {
      console.error("loadClubs:", err);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>OVERVIEW</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Transferium Protocol — On-chain clearance for professional football transfers
        </p>
      </div>

      {clubs.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "1.25rem" }}>
            REGISTERED CLUBS
          </h2>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--bg-card)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["CLUB", "WALLET", "PLAYERS"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map((club, i) => (
                  <tr key={club.address} style={{ borderBottom: i < clubs.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-display)", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {club.name}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {club.address.slice(0, 6)}…{club.address.slice(-4)}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {club.players}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!wallet.isConnected ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)", marginBottom: "1rem" }}>WALLET NOT CONNECTED</p>
          <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>Connect your wallet to view protocol statistics</p>
        </div>
      ) : loading ? (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading...</p>
      ) : stats ? (
        <div>
          {/* Transfer Window Status */}
          <div style={{
            border: `1px solid ${stats.windowOpen ? "var(--green)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", background: "var(--bg-card)",
            marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: stats.windowOpen ? "var(--green)" : "var(--text-dim)",
                boxShadow:  stats.windowOpen ? "0 0 8px var(--green)" : "none",
              }} />
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", letterSpacing: "0.06em" }}>
                  TRANSFER WINDOW — {stats.windowOpen ? "OPEN" : "CLOSED"}
                </p>
                {stats.windowOpen && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {stats.windowLabel} · Closes {stats.windowCloses}
                  </p>
                )}
              </div>
            </div>
            {stats.windowOpen && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)", border: "1px solid var(--green)", padding: "4px 10px", borderRadius: "var(--radius-sm)" }}>
                DEALS ACTIVE
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "REGISTERED PLAYERS", value: stats.totalPlayers },
              { label: "TOTAL DEALS",         value: stats.totalDeals  },
              { label: "EURC BALANCE", value: `€${stats.eurcBalance}` },
              { label: "CLAIMABLE",            value: `€${stats.claimable}`, highlight: Number(stats.claimable.replace(/,/g, "")) > 0 },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "var(--bg-card)", border: `1px solid ${stat.highlight ? "var(--gold-dim)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)", padding: "1.5rem",
              }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                  {stat.label}
                </p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: stat.highlight ? "var(--gold)" : "var(--text-primary)" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Contract addresses */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              DEPLOYED CONTRACTS — ARC TESTNET
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {Object.entries(CONTRACTS).map(([name, addr]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-mono)" }}>{addr.slice(0,8)}...{addr.slice(-6)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
