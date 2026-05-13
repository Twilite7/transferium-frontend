import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { SWAP_ESCROW_ABI, FREE_TRANSFER_ESCROW_ABI, PLAYER_REGISTRY_ABI } from "../config/abis";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";

const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const SWAP_STATES: Record<number,string> = {
  0:"NONE",1:"PROPOSED",2:"ACCEPTED",3:"PLAYER_A_CONSENTED",4:"BOTH_CONSENTED",
  5:"AWAITING_MEDICAL",6:"FUNDED",7:"DISPUTE",8:"COMPLETED",9:"CANCELLED",10:"MUTUAL_CANCEL_PROPOSED",
};
const FT_STATES: Record<number,string> = {
  0:"NONE",1:"PROPOSED",2:"PRE_CONTRACT_SIGNED",3:"DEPOSIT_LOCKED",
  4:"AWAITING_MEDICAL",5:"COMPLETED",6:"CANCELLED",
};

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background: disabled ? "transparent" : bg,
  border: `1px solid ${disabled ? "var(--border)" : color}`,
  color: disabled ? "var(--text-dim)" : color,
  fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em",
  padding: "5px 14px", borderRadius: "var(--radius-sm)",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  whiteSpace: "nowrap" as const,
});

const input = {
  background: "var(--bg-primary)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
  fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "8px 12px",
  outline: "none", width: "100%",
};

const mono = (size = "0.75rem", color = "var(--text-primary)") => ({
  fontFamily: "var(--font-mono)", fontSize: size, color,
});

const label = (text: string) => (
  <span style={{ ...mono("0.6rem", "var(--text-dim)"), letterSpacing: "0.08em", display: "block", marginBottom: "0.35rem" }}>
    {text}
  </span>
);

interface Swap {
  id: bigint; playerA: bigint; playerB: bigint;
  clubA: string; clubB: string; paymentToken: string;
  topUpAmount: bigint; state: number; stateDeadline: bigint;
  nameA: string; nameB: string;
}

interface FT {
  id: bigint; playerId: bigint; playerName: string;
  buyingClub: string; paymentToken: string;
  signingBonus: bigint; deposit: bigint; state: number; stateDeadline: bigint;
}

export function Special({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [tab, setTab]         = useState<"swaps"|"free">("swaps");
  const [swaps, setSwaps]     = useState<Swap[]>([]);
  const [fts, setFts]         = useState<FT[]>([]);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Swap form
  const [swapForm, setSwapForm] = useState({
    playerA: "", playerB: "", topUp: "0",
    agentABps: "0", agentA: "", agentBBps: "0", agentB: "",
  });

  // Free transfer form
  const [ftForm, setFtForm] = useState({
    playerId: "", signingBonus: "0",
    buyerAgentBps: "0", buyerAgent: "", sellerAgentBps: "0", sellerAgent: "",
  });

  const load = useCallback(async () => {
    if (!wallet.provider || !wallet.address) return;
    setLoading(true);
    try {
      const swapEscrow = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.provider);
      const ftEscrow   = new ethers.Contract(CONTRACTS.FreeTransfer, FREE_TRANSFER_ESCROW_ABI, wallet.provider);
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);

      // Load swaps
      const totalSwaps = Number(await swapEscrow.totalSwaps());
      const swapList: Swap[] = [];
      for (let i = 1; i <= totalSwaps; i++) {
        try {
          const s = await swapEscrow.getSwap(i);
          const isInvolved = s.clubA.toLowerCase() === wallet.address!.toLowerCase() ||
                             s.clubB.toLowerCase() === wallet.address!.toLowerCase();
          if (!isInvolved) continue;
          let nameA = `#${s.playerA}`, nameB = `#${s.playerB}`;
          try { nameA = (await registry.getPlayer(s.playerA)).name; } catch {}
          try { nameB = (await registry.getPlayer(s.playerB)).name; } catch {}
          swapList.push({ id: BigInt(i), playerA: s.playerA, playerB: s.playerB,
            clubA: s.clubA, clubB: s.clubB, paymentToken: s.paymentToken,
            topUpAmount: s.topUpAmount, state: Number(s.state), stateDeadline: s.stateDeadline,
            nameA, nameB });
        } catch {}
      }
      setSwaps(swapList);

      // Load free transfers
      const totalFTs = Number(await ftEscrow.totalFreeTransfers());
      const ftList: FT[] = [];
      for (let i = 1; i <= totalFTs; i++) {
        try {
          const ft = await ftEscrow.getFreeTransfer(i);
          const isInvolved = ft.buyingClub.toLowerCase() === wallet.address!.toLowerCase();
          if (!isInvolved) continue;
          let playerName = `#${ft.playerId}`;
          try { playerName = (await registry.getPlayer(ft.playerId)).name; } catch {}
          ftList.push({ id: BigInt(i), playerId: ft.playerId, playerName,
            buyingClub: ft.buyingClub, paymentToken: ft.paymentToken,
            signingBonus: ft.signingBonus, deposit: ft.deposit,
            state: Number(ft.state), stateDeadline: ft.stateDeadline });
        } catch {}
      }
      setFts(ftList);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [wallet.provider, wallet.address]);

  useEffect(() => { load(); }, [load]);

  async function proposeSwap() {
    if (!wallet.signer) return;
    setTxStatus("Proposing swap...");
    try {
      const escrow = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer);
      await waitForTx(await escrow.proposeSwap(
        BigInt(swapForm.playerA), BigInt(swapForm.playerB), EURC,
        ethers.parseUnits(swapForm.topUp || "0", 6),
        parseInt(swapForm.agentABps) || 0, swapForm.agentA || ethers.ZeroAddress,
        parseInt(swapForm.agentBBps) || 0, swapForm.agentB || ethers.ZeroAddress,
      ), wallet.provider!);
      setTxStatus("Swap proposed.");
      setSwapForm({ playerA: "", playerB: "", topUp: "0", agentABps: "0", agentA: "", agentBBps: "0", agentB: "" });
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function proposePreContract() {
    if (!wallet.signer) return;
    setTxStatus("Proposing pre-contract...");
    try {
      const escrow = new ethers.Contract(CONTRACTS.FreeTransfer, FREE_TRANSFER_ESCROW_ABI, wallet.signer);
      await waitForTx(await escrow.proposePreContract(
        BigInt(ftForm.playerId), EURC,
        ethers.parseUnits(ftForm.signingBonus || "0", 6),
        parseInt(ftForm.buyerAgentBps) || 0, ftForm.buyerAgent || ethers.ZeroAddress,
        parseInt(ftForm.sellerAgentBps) || 0, ftForm.sellerAgent || ethers.ZeroAddress,
      ), wallet.provider!);
      setTxStatus("Pre-contract proposed.");
      setFtForm({ playerId: "", signingBonus: "0", buyerAgentBps: "0", buyerAgent: "", sellerAgentBps: "0", sellerAgent: "" });
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function swapAction(fn: () => Promise<void>) {
    try { await fn(); await load(); }
    catch (err: any) { setTxStatus(parseError(err)); }
  }

  const fmt = (n: bigint) => `€${(Number(n) / 1e6).toLocaleString()}`;
  const now  = BigInt(Math.floor(Date.now() / 1000));

  const TabBtn = ({ t, label: l }: { t: "swaps"|"free"; label: string }) => (
    <button onClick={() => setTab(t)} style={{
      ...mono("0.7rem"), padding: "6px 18px", cursor: "pointer",
      background: tab === t ? "var(--bg-hover)" : "transparent",
      border: tab === t ? "1px solid var(--border-accent)" : "1px solid transparent",
      borderRadius: "var(--radius-sm)", letterSpacing: "0.08em",
    }}>{l}</button>
  );

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>SPECIAL TRANSFERS</h1>
      <p style={{ ...mono("0.8rem", "var(--text-secondary)"), marginBottom: "1.5rem" }}>
        Player swaps and free agent signings
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <TabBtn t="swaps" label="SWAPS" />
        <TabBtn t="free"  label="FREE AGENTS" />
      </div>

      {txStatus && (
        <p style={{ ...mono("0.75rem", "var(--text-secondary)"), marginBottom: "1rem",
          padding: "0.6rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          {txStatus}
        </p>
      )}

      {/* ── SWAPS TAB ── */}
      {tab === "swaps" && (
        <div>
          {/* Propose swap form */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
            <p style={{ ...mono("0.65rem", "var(--gold)"), letterSpacing: "0.1em", marginBottom: "1rem" }}>
              PROPOSE SWAP
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                {label("YOUR PLAYER ID")}
                <input style={input} type="number" placeholder="e.g. 1"
                  value={swapForm.playerA} onChange={e => setSwapForm(p => ({ ...p, playerA: e.target.value }))} />
              </div>
              <div>
                {label("THEIR PLAYER ID")}
                <input style={input} type="number" placeholder="e.g. 2"
                  value={swapForm.playerB} onChange={e => setSwapForm(p => ({ ...p, playerB: e.target.value }))} />
              </div>
              <div>
                {label("TOP-UP AMOUNT (€, you pay them)")}
                <input style={input} type="number" placeholder="0"
                  value={swapForm.topUp} onChange={e => setSwapForm(p => ({ ...p, topUp: e.target.value }))} />
              </div>
              <div>
                {label("YOUR AGENT BPS (0–1000)")}
                <input style={input} type="number" placeholder="0"
                  value={swapForm.agentABps} onChange={e => setSwapForm(p => ({ ...p, agentABps: e.target.value }))} />
              </div>
            </div>
            <button onClick={proposeSwap}
              disabled={!swapForm.playerA || !swapForm.playerB || !wallet.signer}
              style={{ ...btn("var(--gold)", "rgba(201,168,76,0.08)", !swapForm.playerA || !swapForm.playerB || !wallet.signer) }}>
              PROPOSE SWAP
            </button>
          </div>

          {/* Swap list */}
          {loading && <p style={mono("0.75rem", "var(--text-dim)")}>Loading...</p>}
          {!loading && swaps.length === 0 && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO SWAPS</p>
          )}
          {swaps.map(s => {
            const key   = `swap-${s.id}`;
            const isOpen = expanded === key;
            const isA   = s.clubA.toLowerCase() === wallet.address?.toLowerCase();
            return (
              <div key={key} style={{ background: "var(--bg-card)",
                border: `1px solid ${isOpen ? "var(--border-accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)", marginBottom: "1rem", overflow: "hidden" }}>
                <div onClick={() => setExpanded(isOpen ? null : key)}
                  style={{ padding: "1.25rem 1.75rem", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={mono("0.95rem")}>{s.nameA} ⇄ {s.nameB}</p>
                    <p style={mono("0.65rem", "var(--text-dim)")}>
                      Swap #{s.id.toString()} · {isA ? "YOU PROPOSED" : "INCOMING"}
                      {s.topUpAmount > 0n ? ` · Top-up: ${fmt(s.topUpAmount)}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <span style={{ ...mono("0.65rem"), padding: "3px 10px",
                      border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                      {SWAP_STATES[s.state]?.replace(/_/g, " ") ?? "UNKNOWN"}
                    </span>
                    <span style={mono("0.7rem", "var(--text-dim)")}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      {s.state === 1 && !isA && (
                        <>
                          <button onClick={() => swapAction(async () => {
                            const e = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer!);
                            setTxStatus("Accepting swap...");
                            await waitForTx(await e.acceptSwap(s.id), wallet.provider!);
                            setTxStatus("Swap accepted.");
                          })} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>ACCEPT</button>
                          <button onClick={() => swapAction(async () => {
                            const e = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer!);
                            setTxStatus("Rejecting swap...");
                            await waitForTx(await e.rejectSwap(s.id), wallet.provider!);
                            setTxStatus("Swap rejected.");
                          })} style={btn("var(--red)")}>REJECT</button>
                        </>
                      )}
                      {(s.state === 2 || s.state === 3) && (
                        <button onClick={() => swapAction(async () => {
                          const e = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer!);
                          setTxStatus("Consenting...");
                          await waitForTx(await e.consentToSwap(s.id), wallet.provider!);
                          setTxStatus("Consented.");
                        })} style={btn("var(--gold)", "rgba(201,168,76,0.08)")}>CONSENT</button>
                      )}
                      {s.state === 4 && (
                        <button onClick={() => swapAction(async () => {
                          const token = new ethers.Contract(s.paymentToken, ["function approve(address,uint256) external returns (bool)"], wallet.signer!);
                          const e = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer!);
                          if (s.topUpAmount > 0n && isA) {
                            setTxStatus("Approving token...");
                            await waitForTx(await token.approve(CONTRACTS.SwapEscrow, s.topUpAmount), wallet.provider!);
                          }
                          setTxStatus("Funding swap...");
                          await waitForTx(await e.fundSwap(s.id), wallet.provider!);
                          setTxStatus("Swap funded.");
                        })} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>FUND SWAP</button>
                      )}
                      {s.stateDeadline > 0n && now > s.stateDeadline && s.state < 8 && (
                        <button onClick={() => swapAction(async () => {
                          const e = new ethers.Contract(CONTRACTS.SwapEscrow, SWAP_ESCROW_ABI, wallet.signer!);
                          setTxStatus("Processing expiry...");
                          await waitForTx(await e.processExpiry(s.id), wallet.provider!);
                          setTxStatus("Done.");
                        })} style={btn("var(--text-dim)")}>PROCESS EXPIRY</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FREE AGENTS TAB ── */}
      {tab === "free" && (
        <div>
          {/* Propose pre-contract form */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
            <p style={{ ...mono("0.65rem", "var(--gold)"), letterSpacing: "0.1em", marginBottom: "1rem" }}>
              PROPOSE PRE-CONTRACT
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                {label("PLAYER ID")}
                <input style={input} type="number" placeholder="e.g. 3"
                  value={ftForm.playerId} onChange={e => setFtForm(p => ({ ...p, playerId: e.target.value }))} />
              </div>
              <div>
                {label("SIGNING BONUS (€)")}
                <input style={input} type="number" placeholder="0"
                  value={ftForm.signingBonus} onChange={e => setFtForm(p => ({ ...p, signingBonus: e.target.value }))} />
              </div>
              <div>
                {label("BUYER AGENT BPS")}
                <input style={input} type="number" placeholder="0"
                  value={ftForm.buyerAgentBps} onChange={e => setFtForm(p => ({ ...p, buyerAgentBps: e.target.value }))} />
              </div>
              <div>
                {label("SELLER AGENT BPS")}
                <input style={input} type="number" placeholder="0"
                  value={ftForm.sellerAgentBps} onChange={e => setFtForm(p => ({ ...p, sellerAgentBps: e.target.value }))} />
              </div>
            </div>
            <button onClick={proposePreContract}
              disabled={!ftForm.playerId || !wallet.signer}
              style={btn("var(--gold)", "rgba(201,168,76,0.08)", !ftForm.playerId || !wallet.signer)}>
              PROPOSE PRE-CONTRACT
            </button>
          </div>

          {/* FT list */}
          {loading && <p style={mono("0.75rem", "var(--text-dim)")}>Loading...</p>}
          {!loading && fts.length === 0 && (
            <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO FREE TRANSFERS</p>
          )}
          {fts.map(ft => {
            const key    = `ft-${ft.id}`;
            const isOpen = expanded === key;
            return (
              <div key={key} style={{ background: "var(--bg-card)",
                border: `1px solid ${isOpen ? "var(--border-accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)", marginBottom: "1rem", overflow: "hidden" }}>
                <div onClick={() => setExpanded(isOpen ? null : key)}
                  style={{ padding: "1.25rem 1.75rem", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={mono("0.95rem")}>{ft.playerName}</p>
                    <p style={mono("0.65rem", "var(--text-dim)")}>
                      FT #{ft.id.toString()} · Bonus: {fmt(ft.signingBonus)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <span style={{ ...mono("0.65rem"), padding: "3px 10px",
                      border: "1px solid var(--border-accent)", borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                      {FT_STATES[ft.state]?.replace(/_/g, " ") ?? "UNKNOWN"}
                    </span>
                    <span style={mono("0.7rem", "var(--text-dim)")}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      {ft.state === 1 && (
                        <button onClick={() => swapAction(async () => {
                          const e = new ethers.Contract(CONTRACTS.FreeTransfer, FREE_TRANSFER_ESCROW_ABI, wallet.signer!);
                          setTxStatus("Withdrawing proposal...");
                          await waitForTx(await e.withdrawPreContract(ft.id), wallet.provider!);
                          setTxStatus("Proposal withdrawn.");
                        })} style={btn("var(--red)")}>WITHDRAW PROPOSAL</button>
                      )}
                      {ft.state === 2 && (
                        <button onClick={() => swapAction(async () => {
                          const e = new ethers.Contract(CONTRACTS.FreeTransfer, FREE_TRANSFER_ESCROW_ABI, wallet.signer!);
                          setTxStatus("Locking deposit...");
                          if (ft.deposit > 0n) {
                            const token = new ethers.Contract(ft.paymentToken, ["function approve(address,uint256) external returns (bool)"], wallet.signer!);
                            await waitForTx(await token.approve(CONTRACTS.FreeTransfer, ft.deposit), wallet.provider!);
                          }
                          await waitForTx(await e.lockDeposit(ft.id), wallet.provider!);
                          setTxStatus("Deposit locked.");
                        })} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>LOCK DEPOSIT</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
