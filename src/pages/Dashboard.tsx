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
      const DEPLOY_BLOCK = 50121685; // corrected: actual creation block of the current PlayerRegistry proxy (July 4, 2026 redeploy)
      const CHUNK = 9000;
      const toBlock = await publicProvider.getBlockNumber();
      // I paginate in 9000-block chunks to stay within Arc RPC limits, with pacing to stay under
      // Arc's 30 req/60s rate limit (2 requests per chunk, so ~2s between chunks keeps us well under)
      const grantedLogs: any[] = [];
      const revokedLogs: any[] = [];
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      for (let from = DEPLOY_BLOCK; from <= toBlock; from += CHUNK) {
        const to = Math.min(from + CHUNK - 1, toBlock);
        let attempt = 0;
        while (true) {
          try {
            const [g, r] = await Promise.all([
              publicProvider.getLogs({ address: CONTRACTS.PlayerRegistry, topics: [roleGrantedTopic, paddedRole], fromBlock: from, toBlock: to }),
              publicProvider.getLogs({ address: CONTRACTS.PlayerRegistry, topics: [roleRevokedTopic, paddedRole], fromBlock: from, toBlock: to }),
            ]);
            grantedLogs.push(...g);
            revokedLogs.push(...r);
            break;
          } catch (e: any) {
            attempt++;
            if (attempt > 5) throw e;
            // Back off on rate-limit errors instead of failing the whole scan
            await sleep(2000 * attempt);
          }
        }
        if (from + CHUNK <= toBlock) await sleep(2000);
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

      {/* ── About Transferium ─────────────────────────────────────────────── */}
      <div style={{ marginTop: "3rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--gold)", marginBottom: "0.5rem", letterSpacing: "0.04em" }}>
            ABOUT TRANSFERIUM
          </h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.7", maxWidth: "780px" }}>
            Transferium is an open, on-chain protocol that replicates the real-world FIFA football player transfer
            system — from initial offer and multi-party negotiation through medical clearance, legal document
            verification, escrow funding and final settlement — without any central authority or intermediary.
          </p>
        </div>

        {/* What it is / How it works */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>WHAT IT IS</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
              {[
                ["Player NFTs", "Every registered player is minted as an ERC-721 token. Ownership tracks the current club on-chain, not in a database."],
                ["Escrow-first transfers", "Transfer fees, salary guarantees, agent commissions and sell-on clauses are locked in smart contract escrow before any player movement is approved."],
                ["Multi-stage verification", "Clubs submit medical and legal document hashes. A licensed registrar independently verifies each hash off-chain and signs the approval on-chain."],
                ["Loan & swap markets", "Clubs can negotiate temporary loans with recall rights and optional purchase clauses, or propose player-for-player swaps — all enforced by contract."],
                ["Competing bids", "Any club can submit a competing bid during the medical and funding windows. The selling club decides — the displaced club receives the competing deposit as compensation."],
                ["Dispute resolution", "League-level arbitration is built into every transfer. No single party can unilaterally exit a funded deal."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>{title}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>HOW A TRANSFER WORKS</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.6rem" }}>
              {[
                ["01", "Club registers player — pays EURC registration fee, submits FIFA ID hash."],
                ["02", "Club submits medical clearance hash and legal document hashes (registration contract, FIFA TMS reference, work permit)."],
                ["03", "Club requests registrar verification and pays the verification fee. Registrar has 72 hours to act."],
                ["04", "Registrar verifies documents off-chain, confirms on-chain. Player status becomes VERIFIED."],
                ["05", "Selling club lists player at an asking price. Buying clubs submit bids via TransferEscrow."],
                ["06", "Selling club accepts a bid. Player consents — deal enters the medical window. Competing clubs can submit bids during this period."],
                ["07", "Buying club submits medical. If passed, deal moves to funding stage. Competing bids remain open until the deal is funded."],
                ["08", "Buying club funds the deal. Settlement is immediate — fee to selling club, agent cuts split, signing bonus claimable by player, NFT ownership transferred."],
              ].map(([step, desc]) => (
                <div key={step} style={{ display: "flex", gap: "1rem", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--gold)", minWidth: "20px", flexShrink: 0 }}>{step}</span>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How to interact + How to test */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>HOW TO INTERACT</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.65rem" }}>
              {[
                ["Connect your wallet", "Use MetaMask or any WalletConnect-compatible wallet. Switch to the ARC Testnet (Chain ID 5042002)."],
                ["Get test EURC", "The protocol uses EURC (6 decimals) as its payment token. Request testnet EURC from the deployer or the project faucet."],
                ["As a club", "The admin registers your wallet as a club and assigns a registrar. You can then register players, manage documents and initiate transfers."],
                ["As a registrar", "The admin grants you REGISTRAR_ROLE. You verify player documents via the Registrar tab — approve or reject with a mandatory reason."],
                ["As a player", "Once your club sets your wallet address, connect with that wallet to access the Player tab — view deals, claim signing bonuses and manage your wallet."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>{title}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>HOW TO TEST</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.65rem" }}>
              {[
                ["Run the test suite", "cd ~/transferium-contracts && npx hardhat test — 118 tests covering all core contract paths, escrow state machines and security invariants."],
                ["Deploy locally", "npx hardhat node starts a local fork. EURC_ADDRESS=... npx hardhat run scripts/deploy_v3.ts --network localhost deploys the full protocol."],
                ["Testnet deployment", "All contracts are live on ARC Testnet. The deployed addresses are listed in the contract panel above. No mainnet deployment yet."],
                ["Fuzz & audit", "The contracts include comprehensive NatSpec and were internally audited for CEI violations, reentrancy, storage gaps and access control. External audits welcome."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>{title}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Future possibilities */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem", marginBottom: "1rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>FUTURE POSSIBILITIES</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              ["Mainnet deployment", "Full production deployment on a low-fee EVM chain with a multisig treasury, professional audits and regulated registrar onboarding."],
              ["FIFA / league integration", "Official API bridges connecting the on-chain registry to FIFA TMS and national league databases for automated document verification."],
              ["Player tokenomics", "Performance-linked add-ons and sell-on clauses create a secondary market where player career milestones generate on-chain revenue streams."],
              ["DAO governance", "Transfer window scheduling, fee parameters and registrar accreditation governed by a token-weighted DAO rather than a single admin key."],
              ["Cross-league settlement", "Multi-league support with inter-league escrow bridges, enabling seamless international transfers between clubs on different league instances."],
              ["Fan engagement layer", "Public player NFT metadata and verifiable transfer histories enable fan-facing applications — prediction markets, fantasy leagues, provenance tracking."],
            ].map(([title, desc]) => (
              <div key={title} style={{ borderLeft: "2px solid var(--border-accent)", paddingLeft: "1rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.3rem" }}>{title}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contribute + contact */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>CONTRIBUTE</p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.65rem" }}>
              {[
                ["Smart contracts", "Review the Solidity source, suggest optimisations, write additional test cases or propose new escrow modules for edge-case transfer structures."],
                ["Frontend", "The React/TypeScript frontend is open for UI improvements, accessibility fixes, mobile responsiveness and new panel components."],
                ["Security", "Responsible disclosure of vulnerabilities is welcome. Focus areas: reentrancy paths, access control gaps, storage layout collisions and economic attack vectors."],
                ["Documentation", "Protocol architecture docs, integration guides and NatSpec improvements are all valuable contributions to the project."],
              ].map(([title, desc]) => (
                <div key={title}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>{title}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem 2rem", display: "flex", flexDirection: "column" as const, justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.12em", marginBottom: "1rem" }}>BUILT BY</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-primary)", marginBottom: "0.5rem", letterSpacing: "0.04em" }}>
                Zeno Murphy
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                Independent protocol developer with a focus on real-world asset tokenisation and
                decentralised sports infrastructure. Transferium is a solo research and engineering
                project exploring what professional football transfers look like when trust is
                replaced by cryptographic guarantees.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
              <a
                href="https://twitter.com/zenomurphy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            "0.75rem",
                  fontFamily:     "var(--font-mono)",
                  fontSize:       "0.75rem",
                  color:          "var(--text-primary)",
                  border:         "1px solid var(--border)",
                  borderRadius:   "var(--radius-sm)",
                  padding:        "0.6rem 1rem",
                  textDecoration: "none",
                  background:     "var(--bg-primary)",
                  transition:     "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--gold)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span style={{ fontSize: "1rem" }}>𝕏</span>
                <span>@zenomurphy</span>
              </a>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                Questions, feedback or collaboration proposals — reach out on X.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
