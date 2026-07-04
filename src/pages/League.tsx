import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import {
  PLAYER_REGISTRY_ABI,
  TRANSFER_ESCROW_ABI,
  LOAN_ESCROW_ABI,
  TRANSFER_WINDOW_ABI,
  DEAL_ESCROW_ABI,
  COMPETING_BID_MANAGER_ABI,
} from "../config/abis";
import { parseError } from "../utils/parseError";
import { waitForTx } from "../utils/waitForTx";

const input = {
  background:   "var(--bg-primary)",
  border:       "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color:        "var(--text-primary)",
  fontFamily:   "var(--font-mono)",
  fontSize:     "0.8rem",
  padding:      "8px 12px",
  outline:      "none",
  width:        "100%",
};

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background:    disabled ? "transparent" : bg,
  border:        `1px solid ${disabled ? "var(--border)" : color}`,
  color:         disabled ? "var(--text-dim)" : color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  letterSpacing: "0.08em",
  padding:       "6px 16px",
  borderRadius:  "var(--radius-sm)",
  cursor:        disabled ? "not-allowed" : "pointer",
  whiteSpace:    "nowrap" as const,
  opacity:       disabled ? 0.5 : 1,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>{title}</p>
      {children}
    </div>
  );
}

export function League({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [isAdmin, setIsAdmin]   = useState(false);
  const [status, setStatus]     = useState<string | null>(null);

  const [regClubAddr, setRegClubAddr]           = useState("");
  const [regClubName, setRegClubName]           = useState("");
  const [regRegistrarAddr, setRegRegistrarAddr] = useState("");
  const [deregClubAddr, setDeregClubAddr]       = useState("");
  const [regRole, setRegRole]                   = useState("");
  const [revokeRole, setRevokeRole]             = useState("");
  const [newRegFee, setNewRegFee]               = useState("");
  const [newListFee, setNewListFee]             = useState("");
  const [newBaseFee, setNewBaseFee]             = useState("");
  const [newProtoBps, setNewProtoBps]           = useState("");
  const [winLabel, setWinLabel]                 = useState("");
  const [winOpens, setWinOpens]                 = useState("");
  const [winCloses, setWinCloses]               = useState("");
  const [winType, setWinType]                   = useState(0);
  const [withdrawToken, setWithdrawToken]       = useState(EURC_ADDRESS);
  const [withdrawAmount, setWithdrawAmount]     = useState("");
  const [feeScheduleInfo, setFeeScheduleInfo]   = useState<{ pending: bigint; effectiveAt: bigint } | null>(null);
  const [feeBalances, setFeeBalances]           = useState<{ PlayerRegistry: bigint; TransferEscrow: bigint; LoanEscrow: bigint } | null>(null);
  const [loadingBalances, setLoadingBalances]   = useState(false);
  const [cbDepositBps, setCbDepositBps]         = useState("");
  const [cbCounterBps, setCbCounterBps]         = useState("");
  const [cbMatchWindow, setCbMatchWindow]       = useState("");
  const [cbFundWindow, setCbFundWindow]         = useState("");

  useEffect(() => {
    if (!wallet.provider || !wallet.address) return;
    checkAdmin();
    loadFeeSchedule();
    loadFeeBalances();
  }, [wallet.provider, wallet.address]);

  async function loadFeeBalances() {
    if (!wallet.provider) return;
    setLoadingBalances(true);
    try {
      const eurc = new ethers.Contract(withdrawToken || EURC_ADDRESS, ["function balanceOf(address) view returns (uint256)"], wallet.provider);
      const [pr, te, le] = await Promise.all([
        eurc.balanceOf(CONTRACTS.PlayerRegistry),
        eurc.balanceOf(CONTRACTS.TransferEscrow),
        eurc.balanceOf(CONTRACTS.LoanEscrow),
      ]);
      setFeeBalances({ PlayerRegistry: pr, TransferEscrow: te, LoanEscrow: le });
    } catch { setFeeBalances(null); }
    finally { setLoadingBalances(false); }
  }

  async function checkAdmin() {
    if (!wallet.provider || !wallet.address) return;
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const ADMIN_ROLE = await registry.ADMIN_ROLE();
      setIsAdmin(await registry.hasRole(ADMIN_ROLE, wallet.address));
    } catch {}
  }

  async function loadFeeSchedule() {
    if (!wallet.provider) return;
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const [pending, effectiveAt] = await Promise.all([
        registry._pendingBaseVerificationFee?.().catch(() => null),
        registry._pendingBaseVerificationFeeEffectiveAt?.().catch(() => null),
      ]);
      if (pending !== null && pending !== undefined) {
        setFeeScheduleInfo({ pending, effectiveAt });
      }
    } catch {}
  }

  async function registerClub() {
    if (!wallet.signer) return;
    try { ethers.getAddress(regClubAddr); } catch { setStatus("Invalid club wallet address."); return; }
    try { ethers.getAddress(regRegistrarAddr); } catch { setStatus("Invalid registrar address."); return; }
    if (!regClubName.trim()) { setStatus("Club name is required."); return; }
    setStatus("Registering club...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.registerClub(regClubAddr, regClubName.trim(), regRegistrarAddr), wallet.provider!);
      const escrow    = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      const loan      = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      const CLUB_ROLE = await escrow.CLUB_ROLE();
      setStatus("Granting CLUB_ROLE on TransferEscrow...");
      await waitForTx(await escrow.grantRole(CLUB_ROLE, regClubAddr), wallet.provider!);
      setStatus("Granting CLUB_ROLE on LoanEscrow...");
      await waitForTx(await loan.grantRole(CLUB_ROLE, regClubAddr), wallet.provider!);
      setStatus(`Club "${regClubName.trim()}" registered with registrar ${regRegistrarAddr.slice(0,8)}...`);
      setRegClubAddr(""); setRegClubName(""); setRegRegistrarAddr("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function deregisterClub() {
    if (!wallet.signer) return;
    try { ethers.getAddress(deregClubAddr); } catch { setStatus("Invalid club address."); return; }
    setStatus("Deregistering club...");
    try {
      const registry  = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.deregisterClub(deregClubAddr), wallet.provider!);
      const escrow    = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      const loan      = new ethers.Contract(CONTRACTS.LoanEscrow, LOAN_ESCROW_ABI, wallet.signer);
      const CLUB_ROLE = await escrow.CLUB_ROLE();
      for (const c of [escrow, loan]) {
        const has = await c.hasRole(CLUB_ROLE, deregClubAddr);
        if (has) await waitForTx(await c.revokeRole(CLUB_ROLE, deregClubAddr), wallet.provider!);
      }
      setStatus(`Club ${deregClubAddr.slice(0,8)}... deregistered.`);
      setDeregClubAddr("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function grantRegistrarRole() {
    if (!wallet.signer) return;
    try { ethers.getAddress(regRole); } catch { setStatus("Invalid address."); return; }
    setStatus("Granting registrar role...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.grantRegistrarRole(regRole), wallet.provider!);
      setStatus(`REGISTRAR_ROLE granted to ${regRole.slice(0,8)}...`);
      setRegRole("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function revokeRegistrarRole() {
    if (!wallet.signer) return;
    try { ethers.getAddress(revokeRole); } catch { setStatus("Invalid address."); return; }
    setStatus("Revoking registrar role...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.revokeRegistrarRole(revokeRole), wallet.provider!);
      setStatus(`REGISTRAR_ROLE revoked from ${revokeRole.slice(0,8)}...`);
      setRevokeRole("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function setFee(fn: string, value: string, label: string) {
    if (!wallet.signer || !value) return;
    setStatus(`Setting ${label}...`);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const units = ethers.parseUnits(value, 6);
      await waitForTx(await registry[fn](units), wallet.provider!);
      setStatus(`${label} set to ${value} EURC.`);
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function scheduleBaseFee() {
    if (!wallet.signer || !newBaseFee) return;
    setStatus("Scheduling base verification fee update...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      const units = ethers.parseUnits(newBaseFee, 6);
      await waitForTx(await registry.scheduleBaseVerificationFee(units), wallet.provider!);
      setStatus(`Base verification fee scheduled: ${newBaseFee} EURC — takes effect in 10 days.`);
      setNewBaseFee("");
      await loadFeeSchedule();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function activateBaseFee() {
    if (!wallet.signer) return;
    setStatus("Activating scheduled base verification fee...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.activateBaseVerificationFee(), wallet.provider!);
      setStatus("Base verification fee activated.");
      setFeeScheduleInfo(null);
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function setProtocolFeeBps() {
    if (!wallet.signer || !newProtoBps) return;
    const bps = parseInt(newProtoBps);
    if (isNaN(bps) || bps < 0 || bps > 2000) { setStatus("Protocol fee must be 0–2000 bps (0–20%)."); return; }
    setStatus("Setting protocol fee...");
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.setProtocolFeeBps(bps), wallet.provider!);
      setStatus(`Protocol fee set to ${bps} bps (${(bps / 100).toFixed(2)}%).`);
      setNewProtoBps("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function scheduleWindow() {
    if (!wallet.signer || !winLabel || !winOpens || !winCloses) return;
    setStatus("Scheduling transfer window...");
    try {
      const win    = new ethers.Contract(CONTRACTS.TransferWindow, TRANSFER_WINDOW_ABI, wallet.signer);
      const opens  = Math.floor(new Date(winOpens).getTime() / 1000);
      const closes = Math.floor(new Date(winCloses).getTime() / 1000);
      if (opens <= Math.floor(Date.now() / 1000)) { setStatus("Open time must be in the future."); return; }
      if (closes <= opens) { setStatus("Close time must be after open time."); return; }
      await waitForTx(await win.scheduleWindow(winLabel.trim(), opens, closes, winType), wallet.provider!);
      setStatus(`Window "${winLabel}" scheduled.`);
      setWinLabel(""); setWinOpens(""); setWinCloses("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function advanceActiveWindow() {
    if (!wallet.signer) return;
    setStatus("Advancing active window pointer...");
    try {
      const win = new ethers.Contract(CONTRACTS.TransferWindow, TRANSFER_WINDOW_ABI, wallet.signer);
      await waitForTx(await win.advanceActiveWindow(), wallet.provider!);
      setStatus("Active window pointer advanced.");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function setDealTimer(which: number, seconds: number) {
    if (!wallet.signer) return;
    setStatus(`Setting timer ${which} to ${seconds}s...`);
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer);
      await waitForTx(await dealEscrow.setTimer(which, BigInt(seconds)), wallet.provider!);
      setStatus(`Timer ${which} set to ${seconds} second(s).`);
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function setCbConfig(fn: string, value: string, isSeconds = false) {
    if (!wallet.signer || !value) return;
    setStatus(`Setting ${fn}...`);
    try {
      const mgr = new ethers.Contract(CONTRACTS.CompetingBidManager, COMPETING_BID_MANAGER_ABI, wallet.signer);
      const parsed = isSeconds ? BigInt(value) : BigInt(value);
      await waitForTx(await (mgr as any)[fn](parsed), wallet.provider!);
      setStatus(`${fn} updated.`);
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function withdrawFees(contractName: string, contractAddr: string, abi: any) {
    if (!wallet.signer || !withdrawAmount) return;
    setStatus(`Withdrawing from ${contractName}...`);
    try {
      const c = new ethers.Contract(contractAddr, abi, wallet.signer);
      const units = ethers.parseUnits(withdrawAmount, 6);
      await waitForTx(await c.withdrawFees(withdrawToken, units), wallet.provider!);
      setStatus(`Withdrawn ${withdrawAmount} EURC from ${contractName}.`);
      await loadFeeBalances();
      setWithdrawAmount("");
    } catch (err: any) { setStatus(parseError(err)); }
  }

  if (!wallet.isConnected) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>Connect your wallet to access admin management.</p>
    </div>
  );

  if (!isAdmin) return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--red)" }}>Access restricted to protocol admin only.</p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>ADMIN</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Protocol administration — club registration, registrar management, fees, transfer windows
        </p>
      </div>

      <Section title="REGISTER CLUB">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>CLUB WALLET ADDRESS</p>
            <input type="text" placeholder="0x..." value={regClubAddr} onChange={e => setRegClubAddr(e.target.value.trim())} style={input} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>CLUB NAME</p>
            <input type="text" placeholder="e.g. FC Barcelona" value={regClubName} onChange={e => setRegClubName(e.target.value)} style={input} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>ASSIGNED REGISTRAR ADDRESS</p>
            <input type="text" placeholder="0x..." value={regRegistrarAddr} onChange={e => setRegRegistrarAddr(e.target.value.trim())} style={input} />
          </div>
          <button onClick={registerClub} style={btn("var(--green)", "rgba(45,206,137,0.08)")}>REGISTER</button>
        </div>
      </Section>

      <Section title="DEREGISTER CLUB (must have no active players)">
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input type="text" placeholder="Club wallet address 0x..." value={deregClubAddr} onChange={e => setDeregClubAddr(e.target.value.trim())} style={input} />
          <button onClick={deregisterClub} disabled={!deregClubAddr} style={btn("var(--red)", "transparent", !deregClubAddr)}>DEREGISTER</button>
        </div>
      </Section>

      <Section title="REGISTRAR ROLE MANAGEMENT">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "0.75rem", alignItems: "end" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>GRANT REGISTRAR_ROLE TO</p>
            <input type="text" placeholder="0x..." value={regRole} onChange={e => setRegRole(e.target.value.trim())} style={input} />
          </div>
          <button onClick={grantRegistrarRole} disabled={!regRole} style={btn("var(--green)", "rgba(45,206,137,0.08)", !regRole)}>GRANT</button>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>REVOKE REGISTRAR_ROLE FROM</p>
            <input type="text" placeholder="0x..." value={revokeRole} onChange={e => setRevokeRole(e.target.value.trim())} style={input} />
          </div>
          <button onClick={revokeRegistrarRole} disabled={!revokeRole} style={btn("var(--red)", "transparent", !revokeRole)}>REVOKE</button>
        </div>
      </Section>

      <Section title="FEE CONFIGURATION (amounts in EURC)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>REGISTRATION FEE (EURC)</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="number" placeholder="e.g. 0.5" value={newRegFee} onChange={e => setNewRegFee(e.target.value)} style={input} />
              <button onClick={() => setFee("setRegistrationFee", newRegFee, "Registration fee")} disabled={!newRegFee} style={btn("var(--gold)", "rgba(201,168,76,0.08)", !newRegFee)}>SET</button>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>LISTING FEE (EURC)</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="number" placeholder="e.g. 0.1" value={newListFee} onChange={e => setNewListFee(e.target.value)} style={input} />
              <button onClick={() => setFee("setListingFee", newListFee, "Listing fee")} disabled={!newListFee} style={btn("var(--gold)", "rgba(201,168,76,0.08)", !newListFee)}>SET</button>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>PROTOCOL FEE (bps — max 2000 = 20%)</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="number" placeholder="e.g. 200" value={newProtoBps} onChange={e => setNewProtoBps(e.target.value)} style={input} />
              <button onClick={setProtocolFeeBps} disabled={!newProtoBps} style={btn("var(--gold)", "rgba(201,168,76,0.08)", !newProtoBps)}>SET</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>
            BASE VERIFICATION FEE — 10-DAY SCHEDULE (registrars may not charge more than 120% of this)
          </p>
          {feeScheduleInfo && feeScheduleInfo.effectiveAt > 0n && (
            <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", marginBottom: "0.75rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--gold)" }}>
                Pending: {ethers.formatUnits(feeScheduleInfo.pending, 6)} EURC — effective at {new Date(Number(feeScheduleInfo.effectiveAt) * 1000).toLocaleString()}
              </p>
              <button onClick={activateBaseFee} style={{ ...btn("var(--green)"), marginTop: "0.5rem" }}>ACTIVATE NOW (if effective time has passed)</button>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input type="number" placeholder="e.g. 1.0" value={newBaseFee} onChange={e => setNewBaseFee(e.target.value)} style={input} />
            <button onClick={scheduleBaseFee} disabled={!newBaseFee} style={btn("var(--gold)", "rgba(201,168,76,0.08)", !newBaseFee)}>SCHEDULE</button>
          </div>
        </div>
      </Section>

      <Section title="TRANSFER WINDOW MANAGEMENT">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px auto", gap: "0.75rem", alignItems: "end", marginBottom: "1rem" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>WINDOW LABEL</p>
            <input type="text" placeholder="e.g. Summer 2026" value={winLabel} onChange={e => setWinLabel(e.target.value)} style={input} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>OPENS AT</p>
            <input type="datetime-local" value={winOpens} onChange={e => setWinOpens(e.target.value)} style={input} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>CLOSES AT</p>
            <input type="datetime-local" value={winCloses} onChange={e => setWinCloses(e.target.value)} style={input} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>TYPE</p>
            <select value={winType} onChange={e => setWinType(parseInt(e.target.value))} style={{ ...input, cursor: "pointer" }}>
              <option value={0}>STANDARD</option>
              <option value={1}>EXCEPTIONAL</option>
              <option value={2}>EMERGENCY</option>
            </select>
          </div>
          <button onClick={scheduleWindow} disabled={!winLabel || !winOpens || !winCloses} style={btn("var(--green)", "rgba(45,206,137,0.08)", !winLabel || !winOpens || !winCloses)}>SCHEDULE</button>
        </div>
        <button onClick={advanceActiveWindow} style={btn("var(--text-secondary)")}>ADVANCE ACTIVE WINDOW POINTER</button>
      </Section>

      <Section title="DEAL TIMERS (TESTNET)">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Override deal state timeouts. On testnet set these low for faster testing. Timer indices: 0=consent, 1=medical, 2=unused, 3=dispute, 4=medical renegotiation, 5=funding window.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {[
            { which: 0, label: "CONSENT (72h default)" },
            { which: 1, label: "MEDICAL (72h default)" },
            { which: 2, label: "UNUSED (was hijack)" },
            { which: 3, label: "RENEGOTIATION (72h default)" },
            { which: 4, label: "MED RENEGOTIATION (72h default)" },
            { which: 5, label: "FUNDING WINDOW (72h default)" },
          ].map(({ which, label }) => (
            <div key={which} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>TIMER {which} — {label}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setDealTimer(which, 60)} style={btn("var(--red)", "rgba(239,68,68,0.08)")}>
                  1 MIN
                </button>
                <button onClick={() => setDealTimer(which, 3600)} style={btn("var(--amber)", "rgba(201,168,76,0.08)")}>
                  1 HR
                </button>
                <button onClick={() => setDealTimer(which, 259200)} style={btn("var(--text-dim)")}>
                  RESET (72H)
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="COMPETING BID CONFIG">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
          Configure CompetingBidManager parameters. Deposit BPS are basis points (1000 = 10%).
          Windows are in seconds.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {([
            { label: "COMPETING DEPOSIT BPS", val: cbDepositBps, set: setCbDepositBps, fn: "setCompetingDepositBps", hint: "e.g. 1000 = 10%" },
            { label: "COUNTER DEPOSIT BPS",   val: cbCounterBps, set: setCbCounterBps, fn: "setCounterDepositBps",   hint: "e.g. 1000 = 10%" },
            { label: "MATCHING WINDOW (secs)", val: cbMatchWindow, set: setCbMatchWindow, fn: "setMatchingWindow",    hint: "e.g. 86400 = 24h", isSeconds: true },
            { label: "FUNDING WINDOW (secs)",  val: cbFundWindow,  set: setCbFundWindow,  fn: "setThirdPartyFundingWindow", hint: "e.g. 259200 = 72h", isSeconds: true },
          ] as const).map(({ label, val, set, fn, hint, isSeconds }: any) => (
            <div key={fn} style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>{label}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input type="number" placeholder={hint} value={val}
                  onChange={e => set(e.target.value)}
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 8px", outline: "none", width: "100%" }} />
                <button onClick={() => setCbConfig(fn, val, isSeconds)} disabled={!val}
                  style={btn("var(--gold)", !val ? "transparent" : "rgba(201,168,76,0.08)", !val)}>
                  SET
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="WITHDRAW PROTOCOL FEES">
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
          Protocol fees accumulate in each contract separately. Withdraw to the treasury address set in each contract.
        </p>
        {/* ── Accumulated balance display ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
          {([
            { label: "PLAYERREGISTRY",  key: "PlayerRegistry"  as const },
            { label: "TRANSFERESCROW",  key: "TransferEscrow"  as const },
            { label: "LOANESCROW",      key: "LoanEscrow"      as const },
          ]).map(({ label, key }) => {
            const bal = feeBalances?.[key];
            const hasBalance = bal !== undefined && bal > 0n;
            return (
              <div key={key} style={{
                background: hasBalance ? "rgba(201,168,76,0.06)" : "var(--bg-primary)",
                border: `1px solid ${hasBalance ? "var(--gold-dim)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem 1rem",
              }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>{label}</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: hasBalance ? "var(--gold)" : "var(--text-dim)" }}>
                  {loadingBalances ? "..." : bal !== undefined ? ethers.formatUnits(bal, 6) + " EURC" : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <button onClick={loadFeeBalances} disabled={loadingBalances}
          style={{ ...btn("var(--text-dim)", "transparent", loadingBalances), marginBottom: "1rem", fontSize: "0.6rem" }}>
          {loadingBalances ? "REFRESHING..." : "↻ REFRESH BALANCES"}
        </button>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>TOKEN ADDRESS (EURC)</p>
            <input type="text" value={withdrawToken} onChange={e => setWithdrawToken(e.target.value.trim())} style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginBottom: "0.35rem" }}>AMOUNT (EURC)</p>
            <input type="number" placeholder="e.g. 100" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={input} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
          {[
            { label: "PlayerRegistry", addr: CONTRACTS.PlayerRegistry, abi: PLAYER_REGISTRY_ABI },
            { label: "TransferEscrow", addr: CONTRACTS.TransferEscrow, abi: TRANSFER_ESCROW_ABI },
            { label: "LoanEscrow",     addr: CONTRACTS.LoanEscrow,     abi: LOAN_ESCROW_ABI     },
          ].map(c => (
            <button key={c.label} onClick={() => withdrawFees(c.label, c.addr, c.abi)}
              disabled={!withdrawAmount}
              style={btn("var(--gold)", "rgba(201,168,76,0.06)", !withdrawAmount)}>
              FROM {c.label.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>

      {status && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          {status}
        </p>
      )}
    </div>
  );
}
