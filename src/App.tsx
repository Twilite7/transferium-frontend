import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACTS } from "./config/contracts";
import { PLAYER_REGISTRY_ABI } from "./config/abis";
import { useWallet } from "./hooks/useWallet";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Dashboard } from "./pages/Dashboard";
import { Testing }   from "./pages/Testing";
import { Players }   from "./pages/Players";
import { Club }     from "./pages/Club";
import { Transfers } from "./pages/Transfers";
import { Loans }     from "./pages/Loans";
import { League }       from "./pages/League";
import { PlayerPortal } from "./pages/PlayerPortal";
import { Deals }       from "./pages/Deals";
import { Special }     from "./pages/Special";
import "./index.css";

type Page = "dashboard" | "club" | "players" | "transfers" | "deals" | "loans" | "special" | "admin" | "portal" | "testing";

// I read and write the active page from window.location.hash so that a browser
// refresh or a shared link lands on the correct page instead of always resetting
// to the dashboard.
function getPageFromHash(): Page {
  const valid: Page[] = [
    "dashboard", "club", "players", "transfers",
    "deals", "loans", "special", "admin", "portal", "testing",
  ];
  const hash = window.location.hash.replace("#", "") as Page;
  return valid.includes(hash) ? hash : "dashboard";
}

export default function App() {
  const [page, setPage] = useState<Page>(getPageFromHash);
  const wallet = useWallet();

  // I keep the hash in sync whenever the page changes
  useEffect(() => {
    window.location.hash = page;
  }, [page]);

  // I handle browser back/forward navigation
  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav page={page} setPage={setPage} wallet={wallet} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {page === "dashboard"  && <Dashboard   wallet={wallet} />}
        {page === "club"       && <Club         wallet={wallet} />}
        {page === "players"    && <Players      wallet={wallet} />}
        {page === "transfers"  && <Transfers    wallet={wallet} />}
        {page === "loans"      && <Loans        wallet={wallet} />}
        {page === "deals"      && <Deals        wallet={wallet} />}
        {page === "special"    && <Special      wallet={wallet} />}
        {page === "admin"      && <League       wallet={wallet} />}
        {page === "portal"     && <PlayerPortal wallet={wallet} />}
        {page === "testing"    && <Testing />}
      </main>
      <Footer />
    </div>
  );
}

function Nav({ page, setPage, wallet }: { page: Page; setPage: (p: Page) => void; wallet: ReturnType<typeof useWallet> }) {
  const [isRegistrar, setIsRegistrar] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [isClub, setIsClub]           = useState(false);
  const [isPlayer, setIsPlayer]       = useState(false);

  useEffect(() => {
    if (!wallet.provider || !wallet.address) {
      setIsRegistrar(false); setIsAdmin(false); setIsClub(false); setIsPlayer(false);
      return;
    }
    (async () => {
      try {
        const registry       = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider!);
        const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
        const ADMIN_ROLE     = await registry.ADMIN_ROLE();
        const CLUB_ROLE      = await registry.CLUB_ROLE();
        const [isReg, isAdm, isClb] = await Promise.all([
          registry.hasRole(REGISTRAR_ROLE, wallet.address),
          registry.hasRole(ADMIN_ROLE,     wallet.address),
          registry.hasRole(CLUB_ROLE,      wallet.address),
        ]);
        setIsRegistrar(isReg);
        setIsAdmin(isAdm);
        setIsClub(isClb);
        // I detect player wallets via the walletToPlayer reverse mapping —
        // a non-zero result means this address is the registered player wallet
        // for that player ID. balanceOf() checked NFT ownership (the club),
        // not the player wallet stored in the Player struct.
        try {
          const pid = await registry.getPlayerByWallet(wallet.address);
          setIsPlayer(pid > 0n);
        } catch { setIsPlayer(false); }
      } catch {}
    })();
  }, [wallet.provider, wallet.address]);

  // I redirect away from pages the connected role has no access to,
  // so a club wallet that somehow lands on #players sees Overview instead.
  useEffect(() => {
    if (!wallet.isConnected) return;
    const clubPages:      Page[] = ["club", "transfers", "loans", "deals", "special"];
    const registrarPages: Page[] = ["players"];
    const adminPages:     Page[] = ["admin"];
    const playerPages:    Page[] = ["portal"];
    // Admin can visit any page — no redirect needed
    if (isAdmin) return;
    if (registrarPages.includes(page) && !isRegistrar) setPage("dashboard");
    if (adminPages.includes(page))                      setPage("dashboard");
    if (clubPages.includes(page)      && !isClub)       setPage("dashboard");
    if (playerPages.includes(page)    && !isPlayer)     setPage("dashboard");
  }, [page, isRegistrar, isAdmin, isClub, isPlayer, wallet.isConnected]);

  // I build the nav from the connected wallet's roles — each role sees only
  // the pages relevant to their function in the protocol.
  // Admin gets full visibility across all pages for oversight purposes,
  // but holds no club/registrar/player roles on-chain.
  const navItems: { key: Page; label: string }[] = isAdmin ? [
    { key: "dashboard", label: "Overview"  },
    { key: "club",      label: "Club"       },
    { key: "transfers", label: "Transfers"  },
    { key: "loans",     label: "Loans"      },
    { key: "deals",     label: "Deals"      },
    { key: "special",   label: "Special"    },
    { key: "players",   label: "Registrar"  },
    { key: "admin",     label: "Admin"      },
    { key: "testing",   label: "Testing"    },
  ] : [
    { key: "dashboard", label: "Overview" },
    { key: "testing",   label: "Testing"    },
    ...(isClub      ? [
      { key: "club"      as Page, label: "Club"      },
      { key: "transfers" as Page, label: "Transfers" },
      { key: "loans"     as Page, label: "Loans"     },
      { key: "deals"     as Page, label: "Deals"     },
      { key: "special"   as Page, label: "Special"   },
    ] : []),
    ...(isPlayer    ? [{ key: "portal"  as Page, label: "Player"    }] : []),
    ...(isRegistrar ? [{ key: "players" as Page, label: "Registrar" }] : []),
  ];

  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "0.08em", color: "var(--gold)" }}>TRANSFERIUM</span>
        <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-dim)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>TESTNET</span>
      </div>

      <nav style={{ display: "flex", gap: "0.25rem" }}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => setPage(item.key)} style={{
            background:    page === item.key ? "var(--bg-hover)" : "transparent",
            border:        page === item.key ? "1px solid var(--border-accent)" : "1px solid transparent",
            color:         page === item.key ? "var(--text-primary)" : "var(--text-secondary)",
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.75rem",
            letterSpacing: "0.08em",
            padding:       "6px 16px",
            borderRadius:  "var(--radius-sm)",
            cursor:        "pointer",
            textTransform: "uppercase" as const,
          }}>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <ConnectButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>TRANSFERIUM PROTOCOL — ARC TESTNET</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>SECURITY OVER SPEED. ALWAYS.</span>
    </footer>
  );
}
