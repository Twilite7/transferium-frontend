import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, VERIFICATION_MANAGER_ABI } from "../config/abis";

interface Props {
  wallet:    ReturnType<typeof useWallet>;
  playerId:  bigint;
  player:    { isVerified: boolean; medicalClearance: boolean; medicalVerified: boolean; playerWallet: string; verificationActive: boolean; };
  legalDocs: { documentsVerified: boolean; registrationContractHash: string; fifaTMSHash: string; workPermitHash: string; };
  medicalDocumentHash: string;
  onRefresh: () => Promise<void>;
}

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background:    disabled ? "transparent" : bg,
  border:        `1px solid ${disabled ? "var(--border)" : color}`,
  color:         disabled ? "var(--text-dim)" : color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  letterSpacing: "0.08em",
  padding:       "5px 14px",
  borderRadius:  "var(--radius-sm)",
  cursor:        disabled ? "not-allowed" : "pointer",
  whiteSpace:    "nowrap" as const,
  opacity:       disabled ? 0.5 : 1,
});

const ZERO_BYTES32 = "0x" + "0".repeat(64);

export function RegistrarPanel({ wallet, playerId, player, legalDocs, medicalDocumentHash, onRefresh }: Props) {
  const [status, setStatus]         = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [claimableBalance, setClaimableBalance] = useState(0n);
  const [currentFee, setCurrentFee]             = useState(0n);
  const [feeInput, setFeeInput]                 = useState("");
  const [playerInfo, setPlayerInfo] = useState<{
    name: string; position: string; nationality: string;
    contractExpiry: bigint; weeklySalary: bigint; club: string; clubName: string;
    verificationRequest: { feePaid: bigint; deadline: bigint; active: boolean; pauseSnapshot: bigint; } | null;
  } | null>(null);

  useEffect(() => {
    if (!wallet.provider) return;
    fetchPlayerInfo();
  }, [playerId, wallet.provider]);

  async function fetchPlayerInfo() {
    if (!wallet.provider) return;
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const vmgr     = new ethers.Contract(CONTRACTS.VerificationManager, VERIFICATION_MANAGER_ABI, wallet.provider);
      const [raw, club] = await Promise.all([
        registry.getPlayer(playerId),
        registry.currentClub(playerId).catch(() => ethers.ZeroAddress),
      ]);
      let clubName = "";
      try { clubName = await registry.getClubName(club); } catch {}
      let verReq = null;
      try {
        const req = await vmgr.getVerificationRequest(playerId);
        verReq = { feePaid: req.feePaid, deadline: req.deadline, active: req.active, pauseSnapshot: req.pauseSnapshot };
      } catch {}
      setPlayerInfo({
        name: raw.name, position: raw.position, nationality: raw.nationality,
        contractExpiry: raw.contractExpiry, weeklySalary: raw.weeklySalary,
        club, clubName, verificationRequest: verReq,
      });
      // I fetch the registrar's claimable balance and current fee from PlayerRegistry
      try {
        const [bal, fee] = await Promise.all([
          registry.getRegistrarClaimable(wallet.address),
          registry.getRegistrarFee(wallet.address),
        ]);
        setClaimableBalance(bal ?? 0n);
        setCurrentFee(fee ?? 0n);
      } catch { setClaimableBalance(0n); setCurrentFee(0n); }
    } catch {}
  }

  function getVmgr() {
    if (!wallet.signer) throw new Error("Wallet not connected");
    return new ethers.Contract(CONTRACTS.VerificationManager, VERIFICATION_MANAGER_ABI, wallet.signer);
  }

  async function verifyMedicalClearance() {
    setStatus("Verifying medical clearance...");
    try {
      await waitForTx(await getVmgr().verifyMedicalClearance(playerId), wallet.provider!);
      setStatus("Medical clearance verified.");
      setExpanded(null); await onRefresh(); await fetchPlayerInfo();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function verifyLegalDocuments() {
    setStatus("Verifying legal documents...");
    try {
      await waitForTx(await getVmgr().verifyLegalDocuments(playerId), wallet.provider!);
      setStatus("Legal documents verified.");
      setExpanded(null); await onRefresh();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function verifyPlayer() {
    setStatus("Completing player verification...");
    try {
      await waitForTx(await getVmgr().verifyPlayer(playerId), wallet.provider!);
      setStatus("Player verification complete. Fees distributed.");
      setExpanded(null); await onRefresh(); await fetchPlayerInfo();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function rejectVerification() {
    const reason = rejectionReason.trim();
    if (!reason) { setStatus("A rejection reason is required — the club needs to know what to fix."); return; }
    if (reason.length > 512) { setStatus("Rejection reason must be 512 characters or fewer."); return; }
    setStatus("Rejecting verification...");
    try {
      await waitForTx(await getVmgr().rejectVerification(playerId, reason), wallet.provider!);
      setStatus("Verification rejected. Fee retained by registrar and protocol.");
      setRejectionReason("");
      setExpanded(null); await onRefresh(); await fetchPlayerInfo();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  async function setVerificationFee() {
    const parsed = parseFloat(feeInput);
    if (isNaN(parsed) || parsed < 0) { setStatus("Enter a valid fee amount in EURC."); return; }
    const feeWei = BigInt(Math.round(parsed * 1_000_000));
    setStatus("Setting verification fee...");
    try {
      if (!wallet.signer) throw new Error("Wallet not connected");
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.setVerificationFee(feeWei), wallet.provider!);
      setStatus(`Verification fee set to ${parsed.toFixed(6)} EURC.`);
      setCurrentFee(feeWei);
      setFeeInput("");
    } catch (err: any) { setStatus(parseError(err)); }
  }
  async function withdrawRegistrarFees() {
    setStatus("Withdrawing registrar fees...");
    try {
      if (!wallet.signer) throw new Error("Wallet not connected");
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.signer);
      await waitForTx(await registry.withdrawRegistrarFees(), wallet.provider!);
      setStatus(`Withdrawn ${ethers.formatUnits(claimableBalance, 6)} EURC to your wallet.`);
      setClaimableBalance(0n);
    } catch (err: any) { setStatus(parseError(err)); }
  }
  async function resetPlayerWallet() {
    setStatus("Resetting player wallet...");
    try {
      await waitForTx(await getVmgr().resetPlayerWallet(playerId), wallet.provider!);
      setStatus("Player wallet reset to zero. Club can now set a new wallet address.");
      setExpanded(null); await onRefresh();
    } catch (err: any) { setStatus(parseError(err)); }
  }

  const sectionStyle = (key: string) => ({
    border:       `1px solid ${expanded === key ? "var(--border-accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    marginBottom: "0.5rem",
    overflow:     "hidden" as const,
  });

  const sectionHeader = (key: string, title: string, done: boolean) => (
    <div
      onClick={() => setExpanded(expanded === key ? null : key)}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem", cursor: "pointer", background: expanded === key ? "rgba(255,255,255,0.03)" : "transparent" }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: done ? "var(--green)" : "var(--text-secondary)" }}>
        {done ? "✓ " : ""}{title}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
        {expanded === key ? "▲" : "▼"}
      </span>
    </div>
  );

  const hasActiveRequest = player.verificationActive && playerInfo?.verificationRequest?.active;
  const requestDeadline  = playerInfo?.verificationRequest?.deadline;
  const deadlineExpired  = requestDeadline ? BigInt(Math.floor(Date.now() / 1000)) > requestDeadline : false;
  const medDone          = player.medicalClearance && player.medicalVerified;
  const legalDone        = legalDocs.documentsVerified;

  return (
    <div style={{ background: "rgba(201,168,76,0.03)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", marginTop: "0.75rem" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
        REGISTRAR ACTIONS — PLAYER #{playerId.toString()}
      </p>

      {playerInfo && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>PLAYER INFORMATION</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 1.5rem" }}>
            {[
              ["NAME",            playerInfo.name],
              ["POSITION",        playerInfo.position],
              ["NATIONALITY",     playerInfo.nationality],
              ["CLUB",            (playerInfo.clubName ? playerInfo.clubName + " — " : "") + playerInfo.club.slice(0,10) + "..." + playerInfo.club.slice(-6)],
              ["CONTRACT EXPIRY", new Date(Number(playerInfo.contractExpiry) * 1000).toLocaleDateString()],
              ["WEEKLY SALARY",   playerInfo.weeklySalary > 0n ? ethers.formatUnits(playerInfo.weeklySalary, 6) + " EURC" : "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.58rem", color: "var(--text-dim)", letterSpacing: "0.08em", display: "block" }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-primary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasActiveRequest && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--gold)" }}>
            ⚡ VERIFICATION REQUEST ACTIVE
            {requestDeadline && ` — deadline: ${new Date(Number(requestDeadline) * 1000).toLocaleString()}`}
            {deadlineExpired && <span style={{ color: "var(--red)" }}> — EXPIRED</span>}
          </p>
          {(playerInfo?.verificationRequest?.feePaid ?? 0n) > 0n && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Fee locked: {ethers.formatUnits(playerInfo!.verificationRequest!.feePaid, 6)} EURC
            </p>
          )}
          {/* ── Submitted document hashes for off-chain cross-check ── */}
          <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.3rem" }}>
            {[
              { label: "MEDICAL HASH",   value: medicalDocumentHash },
              { label: "REG CONTRACT",   value: legalDocs.registrationContractHash },
              { label: "FIFA TMS",       value: legalDocs.fifaTMSHash },
              { label: "WORK PERMIT",    value: legalDocs.workPermitHash },
            ]
            .filter(h => h.value && h.value !== "0x" + "0".repeat(64))
            .map(h => (
              <div key={h.label} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--text-dim)", letterSpacing: "0.08em", minWidth: "90px", flexShrink: 0 }}>{h.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-secondary)", wordBreak: "break-all" as const }}>{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasActiveRequest && !player.isVerified && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
            Waiting for club to submit a verification request and pay the verification fee.
          </p>
        </div>
      )}

      <div style={sectionStyle("medical")}>
        {sectionHeader("medical", "Step 1: Verify Medical Clearance", medDone)}
        {expanded === "medical" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            {!player.medicalClearance ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>Club has not submitted medical clearance yet.</p>
            ) : medDone ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)" }}>✓ Medical clearance already verified.</p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                  Review the submitted medical document hash off-chain. Call this only after completing your off-chain review.
                </p>
                <button onClick={verifyMedicalClearance} disabled={!hasActiveRequest} style={btn("var(--green)", "rgba(45,206,137,0.08)", !hasActiveRequest)}>
                  VERIFY MEDICAL CLEARANCE
                </button>
                {!hasActiveRequest && <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>Requires an active verification request from the club.</p>}
              </>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle("legal")}>
        {sectionHeader("legal", "Step 2: Verify Legal Documents", legalDone)}
        {expanded === "legal" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            {legalDocs.registrationContractHash === ZERO_BYTES32 ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>Club has not submitted legal document hashes yet.</p>
            ) : legalDone ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)" }}>✓ Legal documents already verified.</p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                  Review the submitted document hashes against the physical documents off-chain.
                </p>
                <button onClick={verifyLegalDocuments} disabled={!hasActiveRequest} style={btn("var(--green)", "rgba(45,206,137,0.08)", !hasActiveRequest)}>
                  VERIFY LEGAL DOCUMENTS
                </button>
                {!hasActiveRequest && <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>Requires an active verification request from the club.</p>}
              </>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle("verify")}>
        {sectionHeader("verify", "Step 3: Final Player Verification", player.isVerified)}
        {expanded === "verify" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            {player.isVerified ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)" }}>✓ Player is fully verified.</p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                  Both medical and legal verification must be complete before this step. Completing this action distributes the verification fee.
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={verifyPlayer} disabled={!hasActiveRequest || !medDone || !legalDone}
                    style={btn("var(--green)", "rgba(45,206,137,0.08)", !hasActiveRequest || !medDone || !legalDone)}>
                    APPROVE &amp; VERIFY PLAYER
                  </button>
                  <button
                    onClick={() => setExpanded((expanded as string | null) === "reject" ? "verify" : "reject")}
                    disabled={!hasActiveRequest}
                    style={btn("var(--red)", (expanded as string | null) === "reject" ? "rgba(239,68,68,0.08)" : "transparent", !hasActiveRequest)}>
                    REJECT VERIFICATION
                  </button>
                </div>
                {(!medDone || !legalDone) && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--amber)", marginTop: "0.35rem" }}>
                    Complete medical and legal verification steps first.
                  </p>
                )}
                {(expanded as string | null) === "reject" && (
                  <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--red)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                      REJECTION REASON — required, stored on-chain in the event log
                    </p>
                    <textarea
                      rows={3}
                      maxLength={512}
                      placeholder="e.g. Medical document hash does not match the submitted report. FIFA TMS reference could not be verified."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      style={{
                        background:   "var(--bg-primary)",
                        border:       `1px solid ${rejectionReason.trim() ? "var(--border)" : "var(--red)"}`,
                        borderRadius: "var(--radius-sm)",
                        color:        "var(--text-primary)",
                        fontFamily:   "var(--font-mono)",
                        fontSize:     "0.75rem",
                        padding:      "7px 10px",
                        outline:      "none",
                        width:        "100%",
                        resize:       "vertical" as const,
                        lineHeight:   "1.5",
                        marginBottom: "0.5rem",
                        boxSizing:    "border-box" as const,
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <button
                        onClick={rejectVerification}
                        disabled={!rejectionReason.trim()}
                        style={btn("var(--red)", "rgba(239,68,68,0.08)", !rejectionReason.trim())}>
                        CONFIRM REJECTION
                      </button>
                      <button
                        onClick={() => { setExpanded("verify"); setRejectionReason(""); }}
                        style={btn("var(--text-dim)")}>
                        CANCEL
                      </button>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginLeft: "auto" }}>
                        {rejectionReason.length}/512
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div style={sectionStyle("feesettings")}>
        {sectionHeader("feesettings", "Verification Fee Settings", false)}
        {(expanded as string | null) === "feesettings" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: "1.6", marginBottom: "0.75rem" }}>
              Set the EURC fee clubs pay when they request player verification. The fee is
              locked in escrow during the 72-hour window and split between you and the protocol
              treasury on completion or rejection. A fee of 0 means free verification.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)", whiteSpace: "nowrap" as const }}>
                Current fee:
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: currentFee > 0n ? "var(--gold)" : "var(--text-dim)" }}>
                {currentFee > 0n ? ethers.formatUnits(currentFee, 6) + " EURC" : "Not set (free)"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="number"
                min="0"
                step="0.000001"
                placeholder="e.g. 5.00"
                value={feeInput}
                onChange={e => setFeeInput(e.target.value)}
                style={{
                  background:   "var(--bg-primary)",
                  border:       "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color:        "var(--text-primary)",
                  fontFamily:   "var(--font-mono)",
                  fontSize:     "0.75rem",
                  padding:      "5px 10px",
                  outline:      "none",
                  width:        "140px",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--text-dim)" }}>EURC</span>
              <button
                onClick={setVerificationFee}
                disabled={!feeInput.trim()}
                style={btn("var(--gold)", "rgba(201,168,76,0.08)", !feeInput.trim())}>
                SET FEE
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={sectionStyle("walletreset")}>
        {sectionHeader("walletreset", "Emergency: Reset Player Wallet", false)}
        {expanded === "walletreset" && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--amber)", marginBottom: "0.75rem" }}>
              ⚠ Use only if the player reports a compromised wallet. This resets the wallet address to zero — the club must then set a new wallet via the Club panel.
            </p>
            <button onClick={resetPlayerWallet} style={btn("var(--red)")}>RESET PLAYER WALLET</button>
          </div>
        )}
      </div>

      {/* ── Claimable fee balance ── */}
      {claimableBalance > 0n && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(45,206,137,0.06)", border: "1px solid var(--green)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", marginTop: "0.75rem" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--green)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>CLAIMABLE FEES</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--green)" }}>
              {ethers.formatUnits(claimableBalance, 6)} EURC
            </p>
          </div>
          <button onClick={withdrawRegistrarFees} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>
            WITHDRAW FEES
          </button>
        </div>
      )}

      {status && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
          {status}
        </p>
      )}
    </div>
  );
}
