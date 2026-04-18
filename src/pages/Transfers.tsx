import { useWallet } from "../hooks/useWallet";

export function Transfers({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>TRANSFERS</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Permanent transfer deals — escrow, approval, and fund settlement
        </p>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>COMING NEXT SESSION</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.75rem" }}>
          Create deal → League approval → Dispute window → Fund settlement
        </p>
      </div>
    </div>
  );
}
