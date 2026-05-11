import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, TRANSFER_ESCROW_ABI, DEAL_ESCROW_ABI, TRANSFER_WINDOW_ABI, ERC20_ABI } from "../config/abis";

// ─── v2 State mappings ────────────────────────────────────────────────────────
const DEAL_STATES: Record<number, string> = {
  0:  "NONE",
  1:  "OFFER_CREATED",
  2:  "BID_SUBMITTED",
  3:  "NEGOTIATING",
  4:  "BID_ACCEPTED",
  5:  "AWAITING_CONSENT",
  6:  "AWAITING_MEDICAL",
  7:  "MEDICAL_RENEGO",
  8:  "MEDICAL_DISPUTE",
  9:  "HIJACK_WINDOW",
  10: "HIJACK_CONSENT",
  11: "HIJACK_MEDICAL",
  12: "MUTUAL_CANCEL",
  13: "FUNDING_PENDING",
  14: "FUNDED",
  15: "DISPUTE_WINDOW",
  16: "COMPLETED",
  17: "CANCELLED",
}
const DEAL_COLORS: Record<string, string> = {
  AWAITING_CONSENT:  "var(--amber)",
  AWAITING_MEDICAL:  "var(--amber)",
  MEDICAL_RENEGO:    "var(--amber)",
  MEDICAL_DISPUTE:   "var(--red)",
  HIJACK_WINDOW:     "var(--gold)",
  FUNDING_PENDING:   "var(--amber)",
  FUNDED:            "var(--green)",
  DISPUTE_WINDOW:    "var(--red)",
  COMPLETED:         "var(--text-secondary)",
  CANCELLED:         "var(--text-dim)",
}

const btn = (color: string, bg = "transparent") => ({
  background: bg, border: `1px solid ${color}`, color,
  fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.06em",
  padding: "5px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", whiteSpace: "nowrap" as const,
})

const inputStyle = {
  background: "var(--bg-primary)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
  fontFamily: "var(--font-mono)", fontSize: "0.8rem",
  padding: "8px 12px", outline: "none", width: "100%",
}

const labelStyle = {
  fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)",
  letterSpacing: "0.08em", marginBottom: "0.4rem", display: "block" as const,
}

interface ListedPlayer {
  id: bigint; name: string; position: string; nationality: string;
  contractExpiry: bigint; weeklySalary: bigint; askingPrice: bigint; currentClub: string;
}

interface Offer {
  id: bigint; playerId: bigint; playerName: string;
  sellingClub: string; paymentToken: string; askingPrice: bigint;
  sellOnBps: bigint; sellerAgentBps: bigint; minimumHijackIncrementBps: bigint;
  activeNegotiations: bigint; exists: boolean;
}

interface Bid {
  offerId: bigint; buyingClub: string; transferFee: bigint;
  salaryGuaranteeMonths: bigint; buyerAgentBps: bigint; status: number;
  roundNumber: bigint; isCounterFromSeller: boolean;
}

interface Deal {
  id: bigint; playerId: bigint; playerName: string;
  sellingClub: string; buyingClub: string; paymentToken: string;
  transferFee: bigint; salaryGuaranteeAmount: bigint;
  state: number; stateDeadline: bigint; acceptedAt: bigint;
}

export function Transfers({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [listedPlayers, setListedPlayers]     = useState<ListedPlayer[]>([])
  const [myOffers, setMyOffers]               = useState<Offer[]>([])
  const [myDeals, setMyDeals]                 = useState<Deal[]>([])
  const [offerBids, setOfferBids]             = useState<Record<string, Bid[]>>({})
  const [loading, setLoading]                 = useState(false)
  const [windowOpen, setWindowOpen]           = useState(false)
  const [selectedPlayer, setSelectedPlayer]   = useState<ListedPlayer | null>(null)
  const [selectedOffer, setSelectedOffer]     = useState<Offer | null>(null)
  const [txStatus, setTxStatus]               = useState<string | null>(null)
  const [tab, setTab]                         = useState<"market" | "offers" | "deals">("market")

  // Offer form
  const [offerForm, setOfferForm] = useState({
    askingPrice: "", sellOnBps: "0", sellOnRecipient: "",
    sellerAgentBps: "0", sellerAgent: "", minimumHijackIncrementBps: "500",
  })
  const [addOns, setAddOns] = useState<{ description: string; amount: string; toPlayer: boolean }[]>([])
  const [addOnForm, setAddOnForm] = useState({ desc: "", amount: "", toPlayer: false })

  // Bid form
  const [bidForm, setBidForm] = useState({
    transferFee: "", sellOnBps: "0", sellOnRecipient: "",
    sellerAgentBps: "0", sellerAgent: "", buyerAgentBps: "0",
    buyerAgent: "", salaryGuaranteeMonths: "0",
  })

  useEffect(() => {
    if (!wallet.provider) return
    loadAll()
  }, [wallet.provider, wallet.address])

  async function loadAll() {
    if (!wallet.provider) return
    setLoading(true)
    try {
      const registry   = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider)
      const escrow     = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.provider)
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow,     DEAL_ESCROW_ABI,     wallet.provider)
      const win        = new ethers.Contract(CONTRACTS.TransferWindow,  TRANSFER_WINDOW_ABI, wallet.provider)

      const [open, totalPlayers, totalOffers, totalDeals] = await Promise.all([
        win.isWindowOpen(),
        registry.totalPlayers(),
        escrow.totalOffers(),
        dealEscrow.totalDeals(),
      ])
      setWindowOpen(open)

      // I load listed players for the market
      const listed: ListedPlayer[] = []
      for (let i = 1; i <= Number(totalPlayers); i++) {
        try {
          const p = await registry.getPlayer(i)
          if (!p.isListed) continue
          const owner = await registry.ownerOf(i)
          listed.push({
            id: p.id, name: p.name, position: p.position, nationality: p.nationality,
            contractExpiry: p.contractExpiry, weeklySalary: p.weeklySalary,
            askingPrice: p.askingPrice, currentClub: owner,
          })
        } catch {}
      }
      setListedPlayers(listed)

      if (!wallet.address) return

      // I load my offers (as selling club)
      const offers: Offer[] = []
      const bidsMap: Record<string, Bid[]> = {}
      for (let i = 1; i <= Number(totalOffers); i++) {
        try {
          const o = await escrow.getOffer(i)
          if (!o.exists) continue
          if (o.sellingClub.toLowerCase() !== wallet.address.toLowerCase()) continue
          let playerName = `Player #${o.playerId}`
          try { const p = await registry.getPlayer(o.playerId); playerName = p.name } catch {}
          const offer: Offer = {
            id: BigInt(i), playerId: o.playerId, playerName,
            sellingClub: o.sellingClub, paymentToken: o.paymentToken,
            askingPrice: o.askingPrice, sellOnBps: o.sellOnBps,
            sellerAgentBps: o.sellerAgentBps,
            minimumHijackIncrementBps: o.minimumHijackIncrementBps,
            activeNegotiations: o.activeNegotiations, exists: o.exists,
          }
          offers.push(offer)
          // I load bids for each of my offers
          try {
            const bids = await escrow.getAllBids(i)
            bidsMap[i.toString()] = bids.map((b: any) => ({
              offerId: b.offerId, buyingClub: b.buyingClub,
              transferFee: b.transferFee, salaryGuaranteeMonths: b.salaryGuaranteeMonths,
              buyerAgentBps: b.buyerAgentBps, status: Number(b.status),
              roundNumber: b.roundNumber, isCounterFromSeller: b.isCounterFromSeller,
            }))
          } catch {}
        } catch {}
      }
      setMyOffers(offers)
      setOfferBids(bidsMap)

      // I load my deals (as buying or selling club) from DealEscrow
      const deals: Deal[] = []
      for (let i = 1; i <= Number(totalDeals); i++) {
        try {
          const d = await dealEscrow.getDeal(i)
          const isInvolved =
            d.buyingClub.toLowerCase()  === wallet.address.toLowerCase() ||
            d.sellingClub.toLowerCase() === wallet.address.toLowerCase()
          if (!isInvolved) continue
          let playerName = `Player #${d.playerId}`
          try { const p = await registry.getPlayer(d.playerId); playerName = p.name } catch {}
          deals.push({
            id: BigInt(i), playerId: d.playerId, playerName,
            sellingClub: d.sellingClub, buyingClub: d.buyingClub,
            paymentToken: d.paymentToken, transferFee: d.transferFee,
            salaryGuaranteeAmount: d.salaryGuaranteeAmount,
            state: Number(d.state), stateDeadline: d.stateDeadline,
            acceptedAt: d.acceptedAt,
          })
        } catch {}
      }
      setMyDeals(deals)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function createOffer() {
    if (!wallet.signer || !selectedPlayer) return
    setTxStatus("Creating offer...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      const formattedAddOns = addOns.map(a => ({
        description: a.description,
        amount: ethers.parseUnits(a.amount, 6),
        toPlayer: a.toPlayer, triggered: false,
      }))
      const tx = await escrow.createOffer(
        selectedPlayer.id, EURC_ADDRESS,
        ethers.parseUnits(offerForm.askingPrice, 6),
        parseInt(offerForm.sellOnBps) || 0,
        offerForm.sellOnRecipient || ethers.ZeroAddress,
        parseInt(offerForm.sellerAgentBps) || 0,
        offerForm.sellerAgent || ethers.ZeroAddress,
        parseInt(offerForm.minimumHijackIncrementBps) || 500,
        formattedAddOns
      )
      setTxStatus("Waiting for confirmation...")
      await tx.wait()
      setTxStatus("Offer created.")
      setSelectedPlayer(null)
      setAddOns([])
      setOfferForm({ askingPrice: "", sellOnBps: "0", sellOnRecipient: "", sellerAgentBps: "0", sellerAgent: "", minimumHijackIncrementBps: "500" })
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function submitBid(offerId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Submitting bid...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      const tx = await escrow.submitBid(
        offerId,
        ethers.parseUnits(bidForm.transferFee, 6),
        parseInt(bidForm.sellOnBps) || 0,
        bidForm.sellOnRecipient || ethers.ZeroAddress,
        parseInt(bidForm.sellerAgentBps) || 0,
        bidForm.sellerAgent || ethers.ZeroAddress,
        parseInt(bidForm.buyerAgentBps) || 0,
        bidForm.buyerAgent || ethers.ZeroAddress,
        parseInt(bidForm.salaryGuaranteeMonths) || 0
      )
      setTxStatus("Waiting for confirmation...")
      await tx.wait()
      setTxStatus("Bid submitted.")
      setSelectedOffer(null)
      setBidForm({ transferFee: "", sellOnBps: "0", sellOnRecipient: "", sellerAgentBps: "0", sellerAgent: "", buyerAgentBps: "0", buyerAgent: "", salaryGuaranteeMonths: "0" })
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function acceptBid(offerId: bigint, buyingClub: string) {
    if (!wallet.signer) return
    setTxStatus("Accepting bid...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.acceptBid(offerId, buyingClub)).wait()
      setTxStatus("Bid accepted. Deal created in DealEscrow.")
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function rejectBid(offerId: bigint, buyingClub: string) {
    if (!wallet.signer) return
    setTxStatus("Rejecting bid...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.rejectBid(offerId, buyingClub)).wait()
      setTxStatus("Bid rejected.")
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function fundDeal(dealId: bigint, deal: Deal) {
    if (!wallet.signer) return
    setTxStatus("Approving EURC...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      const token      = new ethers.Contract(EURC_ADDRESS, ERC20_ABI, wallet.signer)
      const total      = deal.transferFee + deal.salaryGuaranteeAmount
      await (await token.approve(CONTRACTS.DealEscrow, total)).wait()
      setTxStatus("Funding deal...")
      await (await dealEscrow.fundDeal(dealId)).wait()
      setTxStatus("Deal funded.")
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function withdrawClaimable() {
    if (!wallet.signer) return
    setTxStatus("Withdrawing...")
    try {
      const dealEscrow = new ethers.Contract(CONTRACTS.DealEscrow, DEAL_ESCROW_ABI, wallet.signer)
      await (await dealEscrow.withdrawClaimable(EURC_ADDRESS)).wait()
      setTxStatus("Withdrawn successfully.")
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  async function processExpiry(dealId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Processing expiry...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.processExpiry(dealId)).wait()
      setTxStatus("Expiry processed.")
      await loadAll()
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`)
    }
  }

  const isBuyer  = (d: Deal) => d.buyingClub.toLowerCase()  === wallet.address?.toLowerCase()
  const isExpired = (d: Deal) => d.stateDeadline > 0n && BigInt(Math.floor(Date.now() / 1000)) > d.stateDeadline

  const TabBtn = ({ t, label }: { t: typeof tab; label: string }) => (
    <button onClick={() => setTab(t)} style={{
      background:    tab === t ? "var(--bg-hover)" : "transparent",
      border:        tab === t ? "1px solid var(--border-accent)" : "1px solid transparent",
      color:         tab === t ? "var(--text-primary)" : "var(--text-secondary)",
      fontFamily:    "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.08em",
      padding:       "6px 18px", borderRadius: "var(--radius-sm)", cursor: "pointer",
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>TRANSFERS</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Permanent transfer marketplace — offers, bids, negotiation, and deal execution
        </p>
      </div>

      {!wallet.isConnected ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>WALLET NOT CONNECTED</p>
        </div>
      ) : (
        <div>
          {/* Window status */}
          <div style={{ border: `1px solid ${windowOpen ? "var(--green)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "1rem 1.5rem", background: "var(--bg-card)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: windowOpen ? "var(--green)" : "var(--text-dim)", boxShadow: windowOpen ? "0 0 8px var(--green)" : "none" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: windowOpen ? "var(--green)" : "var(--text-dim)" }}>
              TRANSFER WINDOW — {windowOpen ? "OPEN" : "CLOSED"}
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem" }}>
            <TabBtn t="market" label="MARKET" />
            <TabBtn t="offers" label={`MY OFFERS (${myOffers.length})`} />
            <TabBtn t="deals"  label={`MY DEALS (${myDeals.length})`} />
          </div>

          {loading && <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading...</p>}

          {/* ── MARKET TAB ────────────────────────────────────────────────── */}
          {tab === "market" && !loading && (
            <div>
              {listedPlayers.length === 0 ? (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO PLAYERS LISTED</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                  {listedPlayers.map(p => {
                    const isOwn = p.currentClub.toLowerCase() === wallet.address?.toLowerCase()
                    const sel   = selectedPlayer?.id === p.id
                    return (
                      <div key={p.id.toString()} style={{ background: "var(--bg-card)", border: `1px solid ${sel ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", transition: "border-color 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                          <div>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", marginBottom: "0.2rem" }}>{p.name}</p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{p.position} · {p.nationality}</p>
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>#{p.id.toString()}</span>
                        </div>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
                          €{(Number(p.askingPrice) / 1e6).toLocaleString()}
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" as const }}>
                          {/* Selling club creates offer */}
                          {isOwn && windowOpen && (
                            <button onClick={() => setSelectedPlayer(sel ? null : p)} style={btn(sel ? "var(--gold)" : "var(--text-secondary)", sel ? "rgba(201,168,76,0.1)" : "transparent")}>
                              {sel ? "▼ FILL OFFER" : "CREATE OFFER"}
                            </button>
                          )}
                          {/* Buying club places bid on existing offer */}
                          {!isOwn && windowOpen && (
                            <button onClick={() => {
                              // I find the active offer for this player to attach bid to
                              // I fetch the offerId on-chain — listedPlayers don't carry it
                              ;(async () => {
                                try {
                                  const esc = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.provider!)
                                  const offerId: bigint = await esc.getPlayerOffer(p.id)
                                  if (offerId === 0n) { alert("No active offer found for this player."); return; }
                                  setSelectedOffer({ id: offerId, playerId: p.id, playerName: p.name, sellingClub: p.currentClub, paymentToken: EURC_ADDRESS, askingPrice: p.askingPrice, sellOnBps: 0n, sellerAgentBps: 0n, minimumHijackIncrementBps: 500n, activeNegotiations: 0n, exists: true })
                                } catch { alert("Failed to load offer. Try again."); }
                              })()
                            }} style={btn("var(--text-secondary)")}>
                              PLACE BID
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Offer creation form */}
              {selectedPlayer && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-lg)", padding: "2rem", marginBottom: "2rem" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                    CREATE OFFER — {selectedPlayer.name.toUpperCase()}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div><label style={labelStyle}>ASKING PRICE (€)</label>
                      <input type="number" placeholder="e.g. 50000000" value={offerForm.askingPrice} onChange={e => setOfferForm(p => ({ ...p, askingPrice: e.target.value }))} style={inputStyle} />
                    </div>
                    <div><label style={labelStyle}>SELL-ON BPS (0–2000)</label>
                      <input type="number" placeholder="e.g. 500" value={offerForm.sellOnBps} onChange={e => setOfferForm(p => ({ ...p, sellOnBps: e.target.value }))} style={inputStyle} />
                    </div>
                    <div><label style={labelStyle}>MIN HIJACK INCREMENT BPS</label>
                      <input type="number" placeholder="e.g. 500" value={offerForm.minimumHijackIncrementBps} onChange={e => setOfferForm(p => ({ ...p, minimumHijackIncrementBps: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  {parseInt(offerForm.sellOnBps) > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={labelStyle}>SELL-ON RECIPIENT</label>
                      <input type="text" placeholder="0x..." value={offerForm.sellOnRecipient} onChange={e => setOfferForm(p => ({ ...p, sellOnRecipient: e.target.value }))} style={inputStyle} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div><label style={labelStyle}>SELLER AGENT BPS</label>
                      <input type="number" value={offerForm.sellerAgentBps} onChange={e => setOfferForm(p => ({ ...p, sellerAgentBps: e.target.value }))} style={inputStyle} />
                    </div>
                    <div><label style={labelStyle}>SELLER AGENT ADDRESS</label>
                      <input type="text" placeholder="0x..." value={offerForm.sellerAgent} onChange={e => setOfferForm(p => ({ ...p, sellerAgent: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  {/* Add-ons */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginBottom: "1rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>PERFORMANCE ADD-ONS</p>
                    {addOns.map((a, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.5rem 1rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>{a.description} — €{parseFloat(a.amount).toLocaleString()} → {a.toPlayer ? "Player" : "Club"}</span>
                        <button onClick={() => setAddOns(prev => prev.filter((_, j) => j !== i))} style={btn("var(--red)")}>✕</button>
                      </div>
                    ))}
                    {addOns.length < 10 && (
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                        <div><label style={labelStyle}>CONDITION</label>
                          <input type="text" placeholder="e.g. 15+ goals" value={addOnForm.desc} onChange={e => setAddOnForm(p => ({ ...p, desc: e.target.value }))} style={inputStyle} />
                        </div>
                        <div><label style={labelStyle}>AMOUNT (€)</label>
                          <input type="number" value={addOnForm.amount} onChange={e => setAddOnForm(p => ({ ...p, amount: e.target.value }))} style={inputStyle} />
                        </div>
                        <div><label style={labelStyle}>PAID TO</label>
                          <select value={addOnForm.toPlayer ? "player" : "club"} onChange={e => setAddOnForm(p => ({ ...p, toPlayer: e.target.value === "player" }))} style={{ ...inputStyle, cursor: "pointer" }}>
                            <option value="club">Selling Club</option>
                            <option value="player">Player Wallet</option>
                          </select>
                        </div>
                        <button onClick={() => { if (!addOnForm.desc || !addOnForm.amount) return; setAddOns(prev => [...prev, { description: addOnForm.desc, amount: addOnForm.amount, toPlayer: addOnForm.toPlayer }]); setAddOnForm({ desc: "", amount: "", toPlayer: false }) }} style={btn("var(--green)")}>+ ADD</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button onClick={createOffer} disabled={!offerForm.askingPrice} style={{ ...btn("var(--gold)", offerForm.askingPrice ? "rgba(201,168,76,0.1)" : "transparent"), padding: "8px 24px", fontSize: "0.75rem" }}>CREATE OFFER</button>
                    <button onClick={() => { setSelectedPlayer(null); setAddOns([]) }} style={{ ...btn("var(--text-dim)"), padding: "8px 24px", fontSize: "0.75rem" }}>CANCEL</button>
                  </div>
                </div>
              )}

              {/* Bid form — for buying clubs, offerId needed from market */}
              {selectedOffer && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: "2rem", marginBottom: "2rem" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                    SUBMIT BID — {selectedOffer.playerName.toUpperCase()} · OFFER #{selectedOffer.id.toString()}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div><label style={labelStyle}>TRANSFER FEE (€)</label>
                      <input type="number" placeholder="e.g. 50000000" value={bidForm.transferFee} onChange={e => setBidForm(p => ({ ...p, transferFee: e.target.value }))} style={inputStyle} />
                    </div>
                    <div><label style={labelStyle}>SALARY GUARANTEE (MONTHS)</label>
                      <input type="number" placeholder="0–24" value={bidForm.salaryGuaranteeMonths} onChange={e => setBidForm(p => ({ ...p, salaryGuaranteeMonths: e.target.value }))} style={inputStyle} />
                    </div>
                    <div><label style={labelStyle}>BUYER AGENT BPS</label>
                      <input type="number" value={bidForm.buyerAgentBps} onChange={e => setBidForm(p => ({ ...p, buyerAgentBps: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  {parseInt(bidForm.buyerAgentBps) > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={labelStyle}>BUYER AGENT ADDRESS</label>
                      <input type="text" placeholder="0x..." value={bidForm.buyerAgent} onChange={e => setBidForm(p => ({ ...p, buyerAgent: e.target.value }))} style={inputStyle} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button onClick={() => submitBid(selectedOffer.id)} disabled={!bidForm.transferFee} style={{ ...btn("var(--gold)", bidForm.transferFee ? "rgba(201,168,76,0.1)" : "transparent"), padding: "8px 24px", fontSize: "0.75rem" }}>SUBMIT BID</button>
                    <button onClick={() => setSelectedOffer(null)} style={{ ...btn("var(--text-dim)"), padding: "8px 24px", fontSize: "0.75rem" }}>CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OFFERS TAB ────────────────────────────────────────────────── */}
          {tab === "offers" && !loading && (
            <div>
              {myOffers.length === 0 ? (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO ACTIVE OFFERS</p>
                </div>
              ) : myOffers.map(offer => {
                const bids = offerBids[offer.id.toString()] ?? []
                const activeBids = bids.filter(b => b.status === 2) // NEGOTIATING
                return (
                  <div key={offer.id.toString()} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem 2rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", marginBottom: "0.2rem" }}>{offer.playerName}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          Offer #{offer.id.toString()} · Asking: <span style={{ color: "var(--gold)" }}>€{(Number(offer.askingPrice) / 1e6).toLocaleString()}</span> · {activeBids.length} active bid{activeBids.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {activeBids.length > 0 && (
                      <div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>BIDS</p>
                        {activeBids.map(bid => (
                          <div key={bid.buyingClub} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
                            <div>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
                                {bid.buyingClub.slice(0, 8)}...{bid.buyingClub.slice(-6)} — <span style={{ color: "var(--gold)" }}>€{(Number(bid.transferFee) / 1e6).toLocaleString()}</span>
                              </p>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
                                Salary guarantee: {bid.salaryGuaranteeMonths.toString()} months · Round {bid.roundNumber.toString()} · {bid.isCounterFromSeller ? "Waiting for buyer" : "Your turn"}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              {!bid.isCounterFromSeller && (
                                <button onClick={() => acceptBid(offer.id, bid.buyingClub)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>ACCEPT</button>
                              )}
                              <button onClick={() => rejectBid(offer.id, bid.buyingClub)} style={btn("var(--red)")}>REJECT</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── DEALS TAB ─────────────────────────────────────────────────── */}
          {tab === "deals" && !loading && (
            <div>
              {myDeals.length === 0 ? (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO ACTIVE DEALS</p>
                </div>
              ) : myDeals.map(d => {
                const stateLabel = DEAL_STATES[d.state] ?? "UNKNOWN"
                const stateColor = DEAL_COLORS[stateLabel] ?? "var(--text-dim)"
                const buyer  = isBuyer(d)
                const expired = isExpired(d)
                const deadline = d.stateDeadline > 0n
                  ? new Date(Number(d.stateDeadline) * 1000).toLocaleString("en-GB")
                  : null

                return (
                  <div key={d.id.toString()} style={{ background: "var(--bg-card)", border: `1px solid ${stateColor === "var(--text-dim)" ? "var(--border)" : stateColor + "66"}`, borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                          {d.playerName} — <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>€{(Number(d.transferFee) / 1e6).toLocaleString()}</span>
                        </p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          Deal #{d.id.toString()} · {buyer ? "Buying" : "Selling"}
                          {deadline && ` · Deadline: ${deadline}`}
                        </p>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${stateColor}`, color: stateColor }}>
                        {stateLabel}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                      {/* Buying club funds deal */}
                      {buyer && d.state === 13 && (
                        <button onClick={() => fundDeal(d.id, d)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>FUND DEAL</button>
                      )}
                      {/* Withdraw claimable on completed/cancelled */}
                      {(d.state === 16 || d.state === 17) && (
                        <button onClick={withdrawClaimable} style={btn("var(--gold)")}>WITHDRAW CLAIMABLE</button>
                      )}
                      {/* Anyone can process expiry */}
                      {expired && d.state < 16 && (
                        <button onClick={() => processExpiry(d.id)} style={btn("var(--text-secondary)")}>PROCESS EXPIRY</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {txStatus && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>{txStatus}</p>
          )}
        </div>
      )}
    </div>
  )
}
