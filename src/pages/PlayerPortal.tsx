import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, DEAL_ESCROW_ABI } from "../config/abis";
import { waitForTx } from "../utils/waitForTx";
import { parseError } from "../utils/parseError";

// ─── Deal state labels ────────────────────────────────────────────────────────
const DEAL_STATES: Record<number, string> = {
  5:  "AWAITING YOUR CONSENT",
  6:  "AWAITING MEDICAL",
  7:  "MEDICAL RENEGOTIATION",
  8:  "MEDICAL DISPUTE",
  9:  "HIJACK WINDOW",
  10: "AWAITING YOUR CONSENT (HIJACK)",
  11: "AWAITING HIJACK MEDICAL",
  13: "FUNDING PENDING",
  14: "FUNDED — DISPUTE WINDOW OPEN",
  15: "DISPUTE IN PROGRESS",
  16: "COMPLETED",
  17: "CANCELLED",
}

const DEAL_COLORS: Record<number, string> = {
  5:  "var(--gold)",
  10: "var(--gold)",
  6:  "var(--amber)",
  7:  "var(--amber)",
  8:  "var(--red)",
  14: "var(--green)",
  16: "var(--text-dim)",
  17: "var(--text-dim)",
}

interface ActiveDeal {
  dealId:               bigint;
  playerId:             bigint;
  playerName:           string;
  sellingClub:          string;
  buyingClub:           string;
  paymentToken:         string;
  transferFee:          bigint;
  signingBonusAmount:    bigint;
  signingBonusClaimed:   boolean;
  state:                number;
  stateDeadline:        bigint;
  medicalHash:          string;
  medicalOutcome:       number;
}

const btn = (color: string, bg = "transparent", disabled = false) => ({
  background:    disabled ? "transparent" : bg,
  border:        `1px solid ${disabled ? "var(--border)" : color}`,
  color:         disabled ? "var(--text-dim)" : color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.7rem",
  letterSpacing: "0.06em",
  padding:       "6px 16px",
  borderRadius:  "var(--radius-sm)",
  cursor:        disabled ? "not-allowed" : "pointer",
  whiteSpace:    "nowrap" as const,
})

const inputStyle = {
  background:   "var(--bg-primary)",
  border:       "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color:        "var(--text-primary)",
  fontFamily:   "var(--font-mono)",
  fontSize:     "0.8rem",
  padding:      "8px 12px",
  outline:      "none",
  width:        "100%",
}

const labelStyle = {
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.6rem",
  color:         "var(--text-dim)",
  letterSpacing: "0.08em",
  marginBottom:  "0.35rem",
  display:       "block" as const,
}

export function PlayerPortal({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [myPlayers, setMyPlayers]   = useState<{ id: bigint; name: string; position: string }[]>([])
  const [activeDeals, setActiveDeals] = useState<ActiveDeal[]>([])
  const [loading, setLoading]       = useState(false)
  const [txStatus, setTxStatus]     = useState<string | null>(null)
  const [medicalHash, setMedicalHash] = useState("")
  const [medicalOutcome, setMedicalOutcome] = useState<number>(1) // 1=PASSED
  const [submittingMedical, setSubmittingMedical] = useState<bigint | null>(null)

  useEffect(() => {
    if (!wallet.provider || !wallet.address) return
    loadPortal()
  }, [wallet.provider, wallet.address])

  async function loadPortal() {
    if (!wallet.provider || !wallet.address) return
    setLoading(true)
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider)
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.provider)
      const total: bigint = await registry.totalPlayers()

      // I find players whose playerWallet matches the connected address
      const mine: { id: bigint; name: string; position: string }[] = []
      for (let i = 1; i <= Number(total); i++) {
        try {
          const p = await registry.getPlayer(i)
          if (p.playerWallet?.toLowerCase() === wallet.address?.toLowerCase()) {
            mine.push({ id: p.id, name: p.name, position: p.position })
          }
        } catch {}
      }
      setMyPlayers(mine)

      // I load active deals for each player
      const deals: ActiveDeal[] = []
      for (const player of mine) {
        try {
          const dealId: bigint = await dealEscrow.getPlayerDeal(player.id)
          if (dealId === 0n) continue
          const d = await dealEscrow.getDealView(dealId)
          const state = Number(d.state)
          // I skip completed/cancelled deals unless there's a claimable signing bonus
          if (state === 17) continue
          if (state === 16 && (d.signingBonusAmount ?? 0n) === 0n) continue
          deals.push({
            dealId,
            playerId:              player.id,
            playerName:            player.name,
            sellingClub:           d.sellingClub,
            buyingClub:            d.buyingClub,
            paymentToken:          d.paymentToken,
            transferFee:           d.transferFee,
            signingBonusAmount:    d.signingBonusAmount ?? 0n,
            signingBonusClaimed:   d.signingBonusClaimed ?? false,
            state,
            stateDeadline:         d.stateDeadline,
            medicalHash:           d.medicalHash,
            medicalOutcome:        Number(d.medicalOutcome),
          })
        } catch {}
      }
      setActiveDeals(deals)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function consentToTransfer(dealId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Consenting to transfer...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      await waitForTx(await dealEscrow.consentToTransfer(dealId), wallet.provider!)
      setTxStatus("Consent recorded. Medical stage begins.")
      await loadPortal()
    } catch (err: any) {
      setTxStatus(parseError(err))
    }
  }

  async function declineTransfer(dealId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Declining transfer...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      await waitForTx(await dealEscrow.declineTransfer(dealId), wallet.provider!)
      setTxStatus("Transfer declined. Deal cancelled.")
      await loadPortal()
    } catch (err: any) {
      setTxStatus(parseError(err))
    }
  }

  async function submitMedical(dealId: bigint) {
    if (!wallet.signer || !medicalHash) return
    setTxStatus("Submitting medical result...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      // I hash the document reference string to produce a bytes32
      const hashBytes = medicalHash.startsWith("0x") && medicalHash.length === 66
        ? medicalHash
        : ethers.id(medicalHash)
      await waitForTx(
        await dealEscrow.submitMedical(dealId, medicalOutcome, hashBytes),
        wallet.provider!
      )
      const labels = ["", "PASSED", "FAILED", "CONCERN"]
      setTxStatus(`Medical submitted: ${labels[medicalOutcome]}.`)
      setMedicalHash("")
      setSubmittingMedical(null)
      await loadPortal()
    } catch (err: any) {
      setTxStatus(parseError(err))
    }
  }

  async function claimSigningBonus(dealId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Claiming signing bonus...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      await waitForTx(await dealEscrow.claimSigningBonus(dealId), wallet.provider!)
      setTxStatus("Salary guarantee claimed.")
      await loadPortal()
    } catch (err: any) {
      setTxStatus(parseError(err))
    }
  }

  async function withdrawClaimable() {
    if (!wallet.signer) return
    setTxStatus("Withdrawing EURC...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      await waitForTx(await dealEscrow.withdrawClaimable(EURC_ADDRESS), wallet.provider!)
      setTxStatus("Withdrawn successfully.")
      await loadPortal()
    } catch (err: any) {
      setTxStatus(parseError(err))
    }
  }

  const deadline = (ts: bigint) => ts > 0n
    ? new Date(Number(ts) * 1000).toLocaleString("en-GB")
    : null

  const isExpired = (ts: bigint) =>
    ts > 0n && BigInt(Math.floor(Date.now() / 1000)) > ts

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>PLAYER PORTAL</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Consent to transfers, submit medicals, claim signing bonuss
        </p>
      </div>

      {!wallet.isConnected ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>CONNECT YOUR PLAYER WALLET</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.75rem" }}>
            Connect the wallet registered to your player profile
          </p>
        </div>
      ) : loading ? (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading...</p>
      ) : myPlayers.length === 0 ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO PLAYER PROFILE FOUND</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.75rem" }}>
            This wallet is not registered as a player wallet. Ask your club's registrar to link it.
          </p>
        </div>
      ) : (
        <div>
          {/* Player identity cards */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" as const }}>
            {myPlayers.map(p => (
              <div key={p.id.toString()} style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: "1rem 1.5rem", minWidth: "180px" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>PLAYER #{p.id.toString()}</p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", marginBottom: "0.2rem" }}>{p.name}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{p.position}</p>
              </div>
            ))}
          </div>

          {/* Active deals */}
          {activeDeals.length === 0 ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem", textAlign: "center", background: "var(--bg-card)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--text-dim)" }}>NO ACTIVE TRANSFERS</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>You will be notified here when a club accepts a bid for you</p>
            </div>
          ) : activeDeals.map(deal => {
            const stateLabel = DEAL_STATES[deal.state] ?? `STATE ${deal.state}`
            const stateColor = DEAL_COLORS[deal.state] ?? "var(--text-secondary)"
            const dl = deadline(deal.stateDeadline)
            const expired = isExpired(deal.stateDeadline)
            const needsConsent = deal.state === 5 || deal.state === 10
            const needsMedical = (deal.state === 6 || deal.state === 11) && deal.medicalHash === ("0x" + "0".repeat(64))
            const canClaim = deal.state === 16 && deal.signingBonusAmount > 0n && !deal.signingBonusClaimed
            const showWithdraw = deal.state === 16 || deal.state === 17

            return (
              <div key={deal.dealId.toString()} style={{ background: "var(--bg-card)", border: `1px solid ${stateColor}44`, borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "1.25rem" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", marginBottom: "0.25rem" }}>
                      {deal.playerName} — <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>€{(Number(deal.transferFee) / 1e6).toLocaleString()}</span>
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      Deal #{deal.dealId.toString()}
                      {dl && ` · Deadline: ${dl}`}
                      {expired && deal.state < 16 && <span style={{ color: "var(--red)" }}> · EXPIRED</span>}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${stateColor}`, color: stateColor }}>
                    {stateLabel}
                  </span>
                </div>

                {/* Deal info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  {[
                    { label: "SELLING CLUB", value: `${deal.sellingClub.slice(0,8)}...${deal.sellingClub.slice(-6)}` },
                    { label: "BUYING CLUB",  value: `${deal.buyingClub.slice(0,8)}...${deal.buyingClub.slice(-6)}` },
                    { label: "SALARY GUARANTEE", value: deal.signingBonusAmount > 0n ? `€${(Number(deal.signingBonusAmount) / 1e6).toLocaleString()}` : "None" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>{label}</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── CONSENT ACTIONS ───────────────────────────────────── */}
                {needsConsent && (
                  <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--gold)", marginBottom: "0.75rem", letterSpacing: "0.06em" }}>
                      ⚡ YOUR CONSENT IS REQUIRED
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      {deal.buyingClub.slice(0,8)}...{deal.buyingClub.slice(-6)} wants to sign you for €{(Number(deal.transferFee) / 1e6).toLocaleString()}.
                      {deal.signingBonusAmount > 0n && ` Includes €${(Number(deal.signingBonusAmount) / 1e6).toLocaleString()} signing bonus.`}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button onClick={() => consentToTransfer(deal.dealId)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>
                        ✓ CONSENT TO TRANSFER
                      </button>
                      <button onClick={() => declineTransfer(deal.dealId)} style={btn("var(--red)")}>
                        ✗ DECLINE
                      </button>
                    </div>
                  </div>
                )}

                {/* ── MEDICAL ACTIONS ───────────────────────────────────── */}
                {needsMedical && (
                  <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid #3b82f644", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#60a5fa", marginBottom: "0.75rem", letterSpacing: "0.06em" }}>
                      🏥 MEDICAL RESULT REQUIRED
                    </p>
                    {submittingMedical === deal.dealId ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
                          <div>
                            <label style={labelStyle}>DOCUMENT REFERENCE OR HASH</label>
                            <input
                              type="text"
                              placeholder="e.g. MED-2024-001 or 0x..."
                              value={medicalHash}
                              onChange={e => setMedicalHash(e.target.value)}
                              style={inputStyle}
                            />
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>
                              A reference string will be hashed on-chain. Pass a 0x bytes32 to use a raw hash.
                            </p>
                          </div>
                          <div>
                            <label style={labelStyle}>OUTCOME</label>
                            <select
                              value={medicalOutcome}
                              onChange={e => setMedicalOutcome(parseInt(e.target.value))}
                              style={{ ...inputStyle, cursor: "pointer" }}
                            >
                              <option value={1}>PASSED</option>
                              <option value={3}>CONCERN</option>
                              <option value={2}>FAILED</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <button onClick={() => submitMedical(deal.dealId)} disabled={!medicalHash} style={btn("var(--green)", medicalHash ? "rgba(45,206,137,0.1)" : "transparent", !medicalHash)}>
                            SUBMIT MEDICAL
                          </button>
                          <button onClick={() => { setSubmittingMedical(null); setMedicalHash("") }} style={btn("var(--text-dim)")}>
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setSubmittingMedical(deal.dealId)} style={btn("#60a5fa", "rgba(59,130,246,0.1)")}>
                        ENTER MEDICAL RESULT
                      </button>
                    )}
                  </div>
                )}

                {/* ── SALARY GUARANTEE CLAIM ────────────────────────────── */}
                {canClaim && (
                  <div style={{ background: "rgba(45,206,137,0.06)", border: "1px solid var(--green)44", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--green)", marginBottom: "0.75rem", letterSpacing: "0.06em" }}>
                      💰 SIGNING BONUS AVAILABLE
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      €{(Number(deal.signingBonusAmount) / 1e6).toLocaleString()} is ready to claim from your completed transfer.
                    </p>
                    <button onClick={() => claimSigningBonus(deal.dealId)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>
                      CLAIM SIGNING BONUS
                    </button>
                  </div>
                )}

                {/* ── WITHDRAW ─────────────────────────────────────────── */}
                {showWithdraw && (
                  <button onClick={withdrawClaimable} style={btn("var(--gold)")}>
                    WITHDRAW CLAIMABLE EURC
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {txStatus && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>
          {txStatus}
        </p>
      )}
    </div>
  )
}
