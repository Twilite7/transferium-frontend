import { useWallet } from "../hooks/useWallet";
export function Special({ wallet: _wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return <div style={{ padding: "2rem" }}><p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>SPECIAL TRANSFERS — coming soon</p></div>;
}
