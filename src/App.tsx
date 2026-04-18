import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { Dashboard } from "./pages/Dashboard";
import { Players }   from "./pages/Players";
import { Transfers } from "./pages/Transfers";
import { Loans }     from "./pages/Loans";
import "./index.css";

type Page = "dashboard" | "players" | "transfers" | "loans";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const wallet = useWallet();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav page={page} setPage={setPage} wallet={wallet} />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {page === "dashboard"  && <Dashboard wallet={wallet} />}
        {page === "players"    && <Players   wallet={wallet} />}
        {page === "transfers"  && <Transfers wallet={wallet} />}
        {page === "loans"      && <Loans     wallet={wallet} />}
      </main>
      <Footer />
    </div>
  );
}

function Nav({ page, setPage, wallet }: { page: Page; setPage: (p: Page) => void; wallet: ReturnType<typeof useWallet> }) {
  const navItems: { key: Page; label: string }[] = [
    { key: "dashboard", label: "Overview"  },
    { key: "players",   label: "Players"   },
    { key: "transfers", label: "Transfers" },
    { key: "loans",     label: "Loans"     },
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
        {wallet.isConnected && !wallet.isCorrectNetwork && (
          <button onClick={wallet.switchNetwork} style={{ background: "transparent", border: "1px solid var(--amber)", color: "var(--amber)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "5px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
            SWITCH NETWORK
          </button>
        )}
        <button
          onClick={wallet.isConnected ? wallet.disconnect : wallet.connect}
          disabled={wallet.isConnecting}
          style={{
            background:    wallet.isConnected ? "transparent" : "var(--gold)",
            border:        wallet.isConnected ? "1px solid var(--border-accent)" : "none",
            color:         wallet.isConnected ? "var(--text-secondary)" : "var(--bg-primary)",
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.75rem",
            letterSpacing: "0.06em",
            padding:       "6px 16px",
            borderRadius:  "var(--radius-sm)",
            cursor:        wallet.isConnecting ? "wait" : "pointer",
          }}>
          {wallet.isConnecting ? "CONNECTING..." : wallet.isConnected ? `${wallet.address?.slice(0,6)}...${wallet.address?.slice(-4)}` : "CONNECT WALLET"}
        </button>
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
