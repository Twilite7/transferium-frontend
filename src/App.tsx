import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACTS } from "./config/contracts";
import { PLAYER_REGISTRY_ABI } from "./config/abis";
import { useWallet } from "./hooks/useWallet";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Dashboard } from "./pages/Dashboard";
import { Club }     from "./pages/Club";
import { Transfers } from "./pages/Transfers";
import { Loans }     from "./pages/Loans";
import { League }       from "./pages/League";
import { PlayerPortal } from "./pages/PlayerPortal";
import "./index.css";

type Page = "dashboard" | "players" | "transfers" | "loans" | "league" | "portal";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const wallet = useWallet();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav page={page} setPage={setPage} wallet={wallet} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {page === "dashboard"  && <Dashboard wallet={wallet} />}
        {page === "players"    && <Club       wallet={wallet} />}
        {page === "transfers"  && <Transfers wallet={wallet} />}
        {page === "loans"      && <Loans     wallet={wallet} />}
        {page === "league"    && <League    wallet={wallet} />}
        {page === "portal"    && <PlayerPortal wallet={wallet} />}
      </main>
      <Footer />
    </div>
  );
}

function Nav({ page, setPage, wallet }: { page: Page; setPage: (p: Page) => void; wallet: ReturnType<typeof useWallet> }) {
  const [isRegistrar, setIsRegistrar] = useState(false);

  useEffect(() => {
    if (!wallet.provider || !wallet.address) { setIsRegistrar(false); return; }
    (async () => {
      try {
        const registry       = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider!);
        const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
        setIsRegistrar(await registry.hasRole(REGISTRAR_ROLE, wallet.address));
      } catch {}
    })();
  }, [wallet.provider, wallet.address]);

  const navItems: { key: Page; label: string }[] = [
    { key: "dashboard", label: "Overview"  },
    { key: "players",   label: "Club"      },
    { key: "transfers", label: "Transfers" },
    { key: "loans",     label: "Loans"     },
    { key: "portal",    label: "Player"    },
    ...(isRegistrar ? [{ key: "league" as Page, label: "League" }] : []),
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
