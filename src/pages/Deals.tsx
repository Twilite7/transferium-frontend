import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { DEAL_ESCROW_ABI, TRANSFER_ESCROW_ABI, INSTALLMENT_ESCROW_ABI } from "../config/abis";
import { waitForTx } from "../utils/waitForTx";
import { sendWithMemo } from "../utils/sendWithMemo";
import { parseError } from "../utils/parseError";

const DEAL_STATES: Record<number, string> = {
  0:  "NONE", 1: "OFFER_CREATED", 2: "BID_SUBMITTED", 3: "NEGOTIATING",
  4:  "BID_ACCEPTED", 5: "AWAITING_CONSENT", 6: "AWAITING_MEDICAL",
  7:  "MEDICAL_RENEGOTIATION", 8: "MEDICAL_DISPUTE", 9: "HIJACK_WINDOW",
  10: "AWAITING_HIJACK_CONSENT", 11: "AWAITING_HIJACK_MEDICAL",
  12: "MUTUAL_CANCEL_PROPOSED", 13: "FUNDING_PENDING", 14: "FUNDED",
  15: "DISPUTE_WINDOW", 16: "COMPLETED", 17: "CANCELLED",
};

const STATE_COLOR: Record<string, string> = {
  AWAITING_CONSENT:    "var(--gold)",
  AWAITING_MEDICAL:    "var(--gold)",
  FUNDING_PENDING:     "var(--amber)",
  FUNDED:              "var(--green)",
  COMPLETED:           "var(--text-secondary)",
  CANCELLED:           "var(--red)",
  DISPUTE_WINDOW:      "var(--amber)",
  MEDICAL_DISPUTE:     "var(--red)",
  MEDICAL_RENEGOTIATION: "var(--amber)",
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

const mono = (size = "0.75rem", color = "var(--text-primary)") => ({
  fontFamily: "var(--font-mono)", fontSize: size, color,
});

interface Installment { amount: bigint; dueDate: bigint; paid: boolean; }
interface Deal {
  id: bigint; playerId: bigint; playerName: string;
  sellingClub: string; buyingClub: string; paymentToken: string;
  transferFee: bigint; signingBonusAmount: bigint;
  state: number; stateDeadline: bigint;
  installments: Installment[];
}

export function Deals({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [deals, setDeals]     = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!wallet.provider || !wallet.address) return;
    setLoading(true);
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.provider);
      const total      = Number(await dealEscrow.totalDeals());
      const result: Deal[] = [];

      for (let i = 1; i <= total; i++) {
        try {
          const d = await dealEscrow.getDealView(i);
          if (!d.exists) continue;
          const isInvolved =
            d.buyingClub.toLowerCase()  === wallet.address!.toLowerCase() ||
            d.sellingClub.toLowerCase() === wallet.address!.toLowerCase();
          if (!isInvolved) continue;

          // I load installments up to index 8 — stop at first zero-amount slot
          const installments: Installment[] = [];
          for (let j = 0; j < 8; j++) {
            try {
              const inst = await dealEscrow.getInstallment(i, j);
              if (inst.amount === 0n) break;
              installments.push({ amount: inst.amount, dueDate: inst.dueDate, paid: inst.paid });
            } catch { break; }
          }
          if (installments.length === 0) {
            installments.push({ amount: d.transferFee, dueDate: 0n, paid: false });
          }

          // I try to get playerId via getExpiryView which exposes it indirectly — 
          // DealView doesn't include playerId so we label with deal id for now
          let playerName = `Deal #${i}`;
          // Try getClaimable as a proxy to confirm deal exists — playerId not in DealView
          // We'll use 0n as placeholder; the player name comes from installment context
          result.push({
            id: BigInt(i), playerId: 0n, playerName,
            sellingClub: d.sellingClub, buyingClub: d.buyingClub,
            paymentToken: d.paymentToken, transferFee: d.transferFee,
            signingBonusAmount: 0n,
            state: Number(d.state), stateDeadline: d.stateDeadline,
            installments,
          });
        } catch {}
      }
      setDeals(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [wallet.provider, wallet.address]);

  useEffect(() => { load(); }, [load]);

  async function fundDeal(d: Deal) {
    if (!wallet.signer) return;
    setTxStatus(`Funding deal #${d.id}...`);
    try {
      const token     = new ethers.Contract(d.paymentToken, ["function approve(address,uint256) external returns (bool)"], wallet.signer);
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer);
      const firstInst  = d.installments[0]?.amount ?? d.transferFee;
      const total      = firstInst; // signingBonus funded separately by player wallet
      setTxStatus("Approving token...");
      await waitForTx(await token.approve(CONTRACTS.DealEscrow, total), wallet.provider!);
      setTxStatus(`Funding deal #${d.id}...`);
      // Memo-wrapped so this funding event carries a searchable label —
      // the biggest money-movement step in the protocol.
      const tx = await sendWithMemo(
        wallet.signer, CONTRACTS.DealEscrow, dealEscrow.interface,
        "fundDeal", [d.id], `deal_fund:deal_${d.id}`
      );
      await waitForTx(tx, wallet.provider!);
      setTxStatus(`Deal #${d.id} funded.`);
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function payInstallment(d: Deal, index: number) {
    if (!wallet.signer) return;
    setTxStatus(`Paying installment ${index + 1}...`);
    try {
      const inst             = d.installments[index];
      const token            = new ethers.Contract(d.paymentToken, ["function approve(address,uint256) external returns (bool)"], wallet.signer);
      const installmentEscrow = new ethers.Contract(CONTRACTS.InstallmentEscrow, INSTALLMENT_ESCROW_ABI, wallet.signer);
      setTxStatus("Approving token...");
      await waitForTx(await token.approve(CONTRACTS.InstallmentEscrow, inst.amount), wallet.provider!);
      setTxStatus(`Paying installment ${index + 1}...`);
      await waitForTx(await installmentEscrow.payInstallment(d.id, index), wallet.provider!);
      setTxStatus(`Installment ${index + 1} paid.`);
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function claimSigningBonus(d: Deal) {
    if (!wallet.signer) return;
    setTxStatus("Claiming signing bonus...");
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer);
      await waitForTx(await dealEscrow.claimSigningBonus(d.id), wallet.provider!);
      setTxStatus("Signing bonus claimed.");
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function processExpiry(d: Deal) {
    if (!wallet.signer) return;
    setTxStatus("Processing expiry...");
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await waitForTx(await escrow.processExpiry(d.id), wallet.provider!);
      setTxStatus("Expiry processed.");
      await load();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  const isBuyer  = (d: Deal) => d.buyingClub.toLowerCase()  === wallet.address?.toLowerCase();
  
  const stateName = (d: Deal) => DEAL_STATES[d.state] ?? "UNKNOWN";
  const stateColor = (d: Deal) => STATE_COLOR[stateName(d)] ?? "var(--text-dim)";
  const fmt = (n: bigint) => `€${(Number(n) / 1e6).toLocaleString()}`;
  const fmtDate = (ts: bigint) => ts > 0n ? new Date(Number(ts) * 1000).toLocaleDateString() : "—";
  const now = BigInt(Math.floor(Date.now() / 1000));

  const active   = deals.filter(d => d.state < 16);
  const complete = deals.filter(d => d.state >= 16);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>DEALS</h1>
      <p style={{ ...mono("0.8rem", "var(--text-secondary)"), marginBottom: "2rem" }}>
        Active deal tracking, installment schedules, and workflow actions
      </p>

      {txStatus && (
        <p style={{ ...mono("0.75rem", "var(--text-secondary)"), marginBottom: "1rem",
          padding: "0.6rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          {txStatus}
        </p>
      )}

      {loading && <p style={mono("0.75rem", "var(--text-dim)")}>Loading deals...</p>}

      {!loading && deals.length === 0 && (
        <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>
          NO DEALS FOUND
        </p>
      )}

      {[{ label: "ACTIVE", list: active }, { label: "COMPLETED / CANCELLED", list: complete }].map(section => (
        section.list.length === 0 ? null : (
          <div key={section.label} style={{ marginBottom: "2rem" }}>
            <p style={{ ...mono("0.6rem", "var(--text-dim)"), letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              {section.label}
            </p>
            {section.list.map(d => {
              const key = d.id.toString();
              const isOpen = expanded === key;
              const name = stateName(d);
              return (
                <div key={key} style={{
                  background: "var(--bg-card)", border: `1px solid ${isOpen ? "var(--border-accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)", marginBottom: "1rem", overflow: "hidden",
                }}>
                  {/* Header */}
                  <div onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ padding: "1.25rem 1.75rem", cursor: "pointer", display: "flex",
                      justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                      <div>
                        <p style={mono("0.95rem")}>{d.playerName}</p>
                        <p style={mono("0.65rem", "var(--text-dim)")}>Deal #{key} · {isBuyer(d) ? "BUYING" : "SELLING"}</p>
                      </div>
                      <span style={{ ...mono("0.65rem"), padding: "3px 10px",
                        border: `1px solid ${stateColor(d)}`, borderRadius: "var(--radius-sm)",
                        color: stateColor(d), letterSpacing: "0.08em" }}>
                        {name.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                      <p style={mono("0.85rem", "var(--gold)")}>{fmt(d.transferFee)}</p>
                      <span style={mono("0.7rem", "var(--text-dim)")}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "1.25rem 1.75rem" }}>
                      {/* Parties */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                        {[
                          { label: "SELLING CLUB", value: `${d.sellingClub.slice(0,8)}...${d.sellingClub.slice(-6)}` },
                          { label: "BUYING CLUB",  value: `${d.buyingClub.slice(0,8)}...${d.buyingClub.slice(-6)}` },
                          { label: "DEADLINE",     value: d.stateDeadline > 0n ? fmtDate(d.stateDeadline) : "—" },
                        ].map(f => (
                          <div key={f.label}>
                            <span style={{ ...mono("0.58rem", "var(--text-dim)"), letterSpacing: "0.08em", display: "block", marginBottom: "0.25rem" }}>{f.label}</span>
                            <span style={mono("0.75rem")}>{f.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Installment schedule */}
                      {d.installments.length > 1 && (
                        <div style={{ marginBottom: "1.25rem" }}>
                          <p style={{ ...mono("0.6rem", "var(--text-dim)"), letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                            INSTALLMENT SCHEDULE ({d.installments.filter(i => i.paid).length}/{d.installments.length} PAID)
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {d.installments.map((inst, idx) => {
                              const overdue = !inst.paid && inst.dueDate > 0n && now > inst.dueDate;
                              const due     = !inst.paid && inst.dueDate > 0n && now <= inst.dueDate;
                              return (
                                <div key={idx} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "0.5rem 0.75rem",
                                  background: inst.paid ? "rgba(45,206,137,0.05)" : overdue ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${inst.paid ? "var(--green)" : overdue ? "var(--red)" : "var(--border)"}`,
                                  borderRadius: "var(--radius-sm)",
                                }}>
                                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <span style={mono("0.65rem", "var(--text-dim)")}>#{idx + 1}</span>
                                    <span style={mono("0.75rem")}>{fmt(inst.amount)}</span>
                                    <span style={mono("0.65rem", "var(--text-dim)")}>
                                      {inst.dueDate > 0n ? `Due ${fmtDate(inst.dueDate)}` : "Due at funding"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    {inst.paid && <span style={{ ...mono("0.6rem", "var(--green)") }}>✓ PAID</span>}
                                    {overdue && <span style={{ ...mono("0.6rem", "var(--red)") }}>OVERDUE</span>}
                                    {due && isBuyer(d) && d.state === 16 && (
                                      <button onClick={() => payInstallment(d, idx)} style={btn("var(--gold)", "rgba(201,168,76,0.08)")}>
                                        PAY
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        {/* Fund */}
                        {d.state === 13 && isBuyer(d) && (
                          <button onClick={() => fundDeal(d)} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>
                            FUND DEAL
                          </button>
                        )}
                        {/* Claim salary guarantee */}
                        {d.state === 16 && isBuyer(d) && d.signingBonusAmount > 0n && (
                          <button onClick={() => claimSigningBonus(d)} style={btn("var(--gold)", "rgba(201,168,76,0.08)")}>
                            CLAIM SIGNING BONUS
                          </button>
                        )}
                        {/* Process expiry */}
                        {d.stateDeadline > 0n && now > d.stateDeadline && d.state < 16 && (
                          <button onClick={() => processExpiry(d)} style={btn("var(--text-dim)")}>
                            PROCESS EXPIRY
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ))}
    </div>
  );
}
