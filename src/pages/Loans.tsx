import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { LOAN_ESCROW_ABI, PLAYER_REGISTRY_ABI } from "../config/abis";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";

const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const LOAN_STATES: Record<number, string> = {
  0: "NONE", 1: "PENDING", 2: "ACTIVE", 3: "COMPLETED",
  4: "EXPIRED", 5: "RECALLED", 6: "REJECTED", 7: "CANCELLED",
};
const STATE_COLOR: Record<string, string> = {
  PENDING: "var(--gold)", ACTIVE: "var(--green)", COMPLETED: "var(--text-secondary)",
  EXPIRED: "var(--text-dim)", RECALLED: "var(--red)", REJECTED: "var(--red)", CANCELLED: "var(--text-dim)",
};

interface Player { id: bigint; name: string; currentClub: string; }
interface Loan {
  id: bigint; playerId: bigint; playerName: string;
  parentClub: string; borrowingClub: string; paymentToken: string;
  loanFee: bigint; loanStart: bigint; loanExpiry: bigint;
  hasOptionToBuy: boolean; optionPrice: bigint; state: number;
  recallRequestedAt: bigint; loanFeeClaimed: boolean; rejectionReason: string;
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
  fontFamily: "var(--font-mono)", fontSize: "0.75rem",
  padding: "7px 10px", outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)",
  letterSpacing: "0.08em", marginBottom: "0.35rem", display: "block",
};
const btn = (color: string, bg = "transparent") => ({
  background: bg, border: `1px solid ${color}`, color,
  fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em",
  padding: "5px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer",
  whiteSpace: "nowrap" as const,
});

export function Loans({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loans, setLoans]       = useState<Loan[]>([]);
  const [players, setPlayers]   = useState<Player[]>([]);
  const [isLeague, setIsLeague] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [tab, setTab]           = useState<"all" | "mine">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    playerId: "", parentClub: "", loanFee: "", loanDurationDays: "180",
    hasOptionToBuy: false, optionPrice: "",
  });

  useEffect(() => { if (wallet.provider) loadAll(); }, [wallet.provider, wallet.address]);

  async function loadAll() {
    if (!wallet.provider) return;
    setLoading(true);
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.provider);

      const LEAGUE_ROLE = await loanEscrow.LEAGUE_ROLE();
      setIsLeague(wallet.address ? await loanEscrow.hasRole(LEAGUE_ROLE, wallet.address) : false);

      const total = await registry.totalPlayers();
      const pList: Player[] = [];
      for (let i = 1n; i <= total; i++) {
        try { const p = await registry.getPlayer(i); pList.push({ id: i, name: p.name, currentClub: p.currentClub }); } catch {}
      }
      setPlayers(pList);

      const totalLoans = await loanEscrow.totalLoans();
      const lList: Loan[] = [];
      for (let i = 1n; i <= totalLoans; i++) {
        try {
          const l = await loanEscrow.getLoan(i);
          let playerName = `Player #${l.playerId}`;
          try { const p = await registry.getPlayer(l.playerId); playerName = p.name; } catch {}
          lList.push({
            id: i, playerId: l.playerId, playerName,
            parentClub: l.parentClub, borrowingClub: l.borrowingClub,
            paymentToken: l.paymentToken, loanFee: l.loanFee,
            loanStart: l.loanStart, loanExpiry: l.loanExpiry,
            hasOptionToBuy: l.hasOptionToBuy, optionPrice: l.optionPrice,
            state: Number(l.state), recallRequestedAt: l.recallRequestedAt,
            loanFeeClaimed: l.loanFeeClaimed, rejectionReason: l.rejectionReason,
          });
        } catch {}
      }
      setLoans(lList);
    } catch (err: any) { setTxStatus(parseError(err)); }
    finally { setLoading(false); }
  }

  async function createLoan() {
    if (!wallet.signer) return;
    setTxStatus("Approving loan fee...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      const token      = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer);
      const fee        = ethers.parseUnits(form.loanFee, 6);
      const duration   = BigInt(parseInt(form.loanDurationDays) * 86400);
      const optPrice   = form.hasOptionToBuy && form.optionPrice ? ethers.parseUnits(form.optionPrice, 6) : 0n;
      await (await token.approve(CONTRACTS.LoanEscrow, fee)).wait();
      setTxStatus("Creating loan...");
      await waitForTx(
        await loanEscrow.createLoan(
          BigInt(form.playerId), form.parentClub, EURC_ADDRESS,
          fee, duration, form.hasOptionToBuy, optPrice
        ),
        wallet.provider!
      );
      setTxStatus("Loan created.");
      setShowForm(false);
      setForm({ playerId: "", parentClub: "", loanFee: "", loanDurationDays: "180", hasOptionToBuy: false, optionPrice: "" });
      await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function approveLoan(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Approving loan...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.approveLoan(id), wallet.provider!);
      setTxStatus("Loan approved."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function rejectLoan(id: bigint, reason: string) {
    if (!wallet.signer) return;
    setTxStatus("Rejecting loan...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.rejectLoan(id, reason), wallet.provider!);
      setTxStatus("Loan rejected."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function cancelLoan(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Cancelling...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.cancelLoan(id), wallet.provider!);
      setTxStatus("Loan cancelled."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function requestRecall(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Requesting recall...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.requestRecall(id), wallet.provider!);
      setTxStatus("Recall requested."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function executeRecall(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Executing recall...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.executeRecall(id), wallet.provider!);
      setTxStatus("Player recalled."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function exerciseOption(id: bigint, optionPrice: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Approving option payment...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      const token      = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer);
      await (await token.approve(CONTRACTS.LoanEscrow, optionPrice)).wait();
      setTxStatus("Exercising option to buy...");
      await waitForTx(await loanEscrow.exerciseOption(id), wallet.provider!);
      setTxStatus("Option exercised — player permanently transferred."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function claimLoanFee(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Claiming loan fee...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.claimLoanFee(id), wallet.provider!);
      setTxStatus("Fee claimed."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function settleLoanExpiry(id: bigint) {
    if (!wallet.signer) return;
    setTxStatus("Settling expiry...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.settleLoanExpiry(id), wallet.provider!);
      setTxStatus("Loan settled."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  async function withdrawClaimable() {
    if (!wallet.signer) return;
    setTxStatus("Withdrawing...");
    try {
      const loanEscrow = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      await waitForTx(await loanEscrow.withdrawClaimable(EURC_ADDRESS), wallet.provider!);
      setTxStatus("Withdrawn."); await loadAll();
    } catch (err: any) { setTxStatus(parseError(err)); }
  }

  const addr = wallet.address?.toLowerCase();
  const myLoans = loans.filter(l =>
    l.parentClub.toLowerCase() === addr || l.borrowingClub.toLowerCase() === addr
  );
  const displayed = tab === "mine" ? myLoans : loans.filter(l => l.state <= 2);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  const TabBtn = ({ t, label }: { t: typeof tab; label: string }) => (
    <button onClick={() => setTab(t)} style={{
      background: tab === t ? "var(--bg-hover)" : "transparent",
      border: tab === t ? "1px solid var(--border-accent)" : "1px solid transparent",
      color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
      fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.08em",
      padding: "6px 18px", borderRadius: "var(--radius-sm)", cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <div>
      <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>LOANS</h1>
          <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
            Loan deals — fee escrow, recall clauses, and option to buy
          </p>
        </div>
        <button onClick={() => setShowForm(f => !f)} style={{ ...btn("var(--gold)", showForm ? "rgba(201,168,76,0.1)" : "transparent"), padding: "8px 24px", fontSize: "0.75rem" }}>
          {showForm ? "CANCEL" : "+ CREATE LOAN"}
        </button>
      </div>

      {/* Create loan form */}
      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: "2rem", marginBottom: "2rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>CREATE LOAN</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>PLAYER</label>
              <select value={form.playerId} onChange={e => {
                const p = players.find(x => x.id.toString() === e.target.value);
                setForm(f => ({ ...f, playerId: e.target.value, parentClub: p?.currentClub ?? "" }));
              }} style={inputStyle}>
                <option value="">Select player...</option>
                {players.map(p => <option key={p.id.toString()} value={p.id.toString()}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>LOAN FEE (€)</label>
              <input type="number" placeholder="e.g. 500000" value={form.loanFee}
                onChange={e => setForm(f => ({ ...f, loanFee: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DURATION (DAYS)</label>
              <input type="number" placeholder="180" value={form.loanDurationDays}
                onChange={e => setForm(f => ({ ...f, loanDurationDays: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <label style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.hasOptionToBuy}
                onChange={e => setForm(f => ({ ...f, hasOptionToBuy: e.target.checked, optionPrice: "" }))} />
              OPTION TO BUY
            </label>
            {form.hasOptionToBuy && (
              <div style={{ flex: 1 }}>
                <input type="number" placeholder="Option price (€)" value={form.optionPrice}
                  onChange={e => setForm(f => ({ ...f, optionPrice: e.target.value }))} style={inputStyle} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={createLoan} disabled={!form.playerId || !form.loanFee}
              style={{ ...btn("var(--gold)", "rgba(201,168,76,0.1)"), padding: "8px 24px", fontSize: "0.75rem" }}>
              CREATE LOAN
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem" }}>
        <TabBtn t="all"  label="ACTIVE MARKET" />
        <TabBtn t="mine" label={`MY LOANS (${myLoans.length})`} />
      </div>

      {loading && <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading...</p>}

      {!loading && displayed.length === 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO LOANS</p>
        </div>
      )}

      {!loading && displayed.map(l => {
        const stateLabel = LOAN_STATES[l.state] ?? "UNKNOWN";
        const stateColor = STATE_COLOR[stateLabel] ?? "var(--text-dim)";
        const isParent   = l.parentClub.toLowerCase() === addr;
        const isBorrower = l.borrowingClub.toLowerCase() === addr;
        const expiry     = l.loanExpiry > 0n ? new Date(Number(l.loanExpiry) * 1000).toLocaleDateString("en-GB") : "—";
        const isExpired  = l.loanExpiry > 0n && nowSec > l.loanExpiry;
        const recallReady = l.recallRequestedAt > 0n && nowSec > l.recallRequestedAt + 259200n; // 3 days

        return (
          <div key={l.id.toString()} style={{
            background: "var(--bg-card)",
            border: `1px solid ${stateColor === "var(--text-dim)" ? "var(--border)" : stateColor + "44"}`,
            borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", marginBottom: "0.75rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                  {l.playerName} — <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>
                    €{(Number(l.loanFee) / 1e6).toLocaleString()}
                  </span>
                  {l.hasOptionToBuy && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)", marginLeft: "0.75rem" }}>
                      · OPTION €{(Number(l.optionPrice) / 1e6).toLocaleString()}
                    </span>
                  )}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                  Loan #{l.id.toString()} · Expiry: {expiry}
                  {l.rejectionReason && ` · Rejected: ${l.rejectionReason}`}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                  {l.parentClub.slice(0, 8)}...{l.parentClub.slice(-6)} → {l.borrowingClub.slice(0, 8)}...{l.borrowingClub.slice(-6)}
                </p>
              </div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em",
                padding: "3px 10px", borderRadius: "var(--radius-sm)",
                border: `1px solid ${stateColor}`, color: stateColor,
              }}>{stateLabel}</span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {/* League: approve/reject pending loans */}
              {isLeague && l.state === 1 && (
                <>
                  <button onClick={() => approveLoan(l.id)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>APPROVE</button>
                  <button onClick={() => {
                    const reason = window.prompt("Rejection reason:");
                    if (reason !== null) rejectLoan(l.id, reason);
                  }} style={btn("var(--red)", "rgba(239,68,68,0.1)")}>REJECT</button>
                </>
              )}
              {/* Borrowing club: cancel pending */}
              {isBorrower && l.state === 1 && (
                <button onClick={() => cancelLoan(l.id)} style={btn("var(--text-secondary)")}>CANCEL</button>
              )}
              {/* Parent club: recall active loan */}
              {isParent && l.state === 2 && l.recallRequestedAt === 0n && (
                <button onClick={() => requestRecall(l.id)} style={btn("var(--gold)")}>REQUEST RECALL</button>
              )}
              {/* Execute recall after notice period */}
              {isParent && l.state === 2 && recallReady && (
                <button onClick={() => executeRecall(l.id)} style={btn("var(--red)", "rgba(239,68,68,0.1)")}>EXECUTE RECALL</button>
              )}
              {/* Borrowing club: exercise option to buy */}
              {isBorrower && l.state === 2 && l.hasOptionToBuy && (
                <button onClick={() => exerciseOption(l.id, l.optionPrice)} style={btn("var(--gold)", "rgba(201,168,76,0.1)")}>EXERCISE OPTION</button>
              )}
              {/* Parent club: claim fee once active */}
              {isParent && l.state >= 2 && !l.loanFeeClaimed && (
                <button onClick={() => claimLoanFee(l.id)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>CLAIM FEE</button>
              )}
              {/* Settle expiry */}
              {l.state === 2 && isExpired && (
                <button onClick={() => settleLoanExpiry(l.id)} style={btn("var(--text-secondary)")}>SETTLE EXPIRY</button>
              )}
              {/* Withdraw claimable */}
              {(isParent || isBorrower) && (l.state === 3 || l.state === 4 || l.state === 5) && (
                <button onClick={withdrawClaimable} style={btn("var(--gold)")}>WITHDRAW CLAIMABLE</button>
              )}
            </div>
          </div>
        );
      })}

      {txStatus && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>
          {txStatus}
        </p>
      )}
    </div>
  );
}
