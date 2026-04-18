import { useWallet } from "../hooks/useWallet";

export function Loans({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>LOANS</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Loan deals — fee escrow, recall clauses, and option to buy
        </p>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>COMING NEXT SESSION</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.75rem" }}>
          Create loan → Approve → Recall / Expiry / Option to buy
        </p>
      </div>
    </div>
  );
}
