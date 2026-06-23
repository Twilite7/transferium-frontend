import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { parseError } from "../utils/parseError";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, TRANSFER_ESCROW_ABI, DEAL_ESCROW_ABI, TRANSFER_WINDOW_ABI } from "../config/abis";

// ─── v2 State mappings ────────────────────────────────────────────────────────

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
  signingBonusMonths: bigint; buyerAgentBps: bigint; status: number;
  roundNumber: bigint; isCounterFromSeller: boolean;
}

interface Deal {
  id: bigint; playerId: bigint; playerName: string;
  sellingClub: string; buyingClub: string; paymentToken: string;
  transferFee: bigint; signingBonusAmount: bigint;
  state: number; stateDeadline: bigint; acceptedAt: bigint;
}

export function Transfers({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [listedPlayers, setListedPlayers]     = useState<ListedPlayer[]>([])
  const [myOffers, setMyOffers]               = useState<Offer[]>([])
  const [offerBids, setOfferBids]             = useState<Record<string, Bid[]>>({})
  const [loading, setLoading]                 = useState(false)
  const [windowOpen, setWindowOpen]           = useState(false)
  const [selectedPlayer, setSelectedPlayer]   = useState<ListedPlayer | null>(null)
  const [selectedOffer, setSelectedOffer]     = useState<Offer | null>(null)
  const [myBids, setMyBids]                   = useState<Record<string, Bid>>({})
  const [txStatus, setTxStatus]               = useState<string | null>(null)
  const [tab, setTab]                         = useState<"market" | "offers" | "league">("market")
  const [isLeague, setIsLeague]               = useState(false)
  const [isClub, setIsClub]                   = useState(false)
  const [leagueOffers, setLeagueOffers]       = useState<{ offer: Offer; bids: Bid[] }[]>([])

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
    buyerAgent: "", signingBonusMonths: "0",
  })
  const [installmentRows, setInstallmentRows] = useState<{ amount: string; dueDate: string }[]>([
    { amount: "", dueDate: "" }
  ])

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
          // I load bids for each of my offers — getAllBids checks msg.sender
          // so it must be called via signer, not provider
          try {
            const escrowSigned = wallet.signer
              ? new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
              : escrow
            const bids = await escrowSigned.getAllBids(i)
            bidsMap[i.toString()] = bids.map((b: any) => ({
              offerId: b.offerId, buyingClub: b.buyingClub,
              transferFee: b.transferFee, signingBonusMonths: b.signingBonusMonths,
              buyerAgentBps: b.buyerAgentBps, status: Number(b.status),
              roundNumber: b.roundNumber, isCounterFromSeller: b.isCounterFromSeller,
            }))
          } catch (e: any) { console.error("getAllBids failed for offer", i, e?.message ?? e) }
        } catch {}
      }
      setMyOffers(offers)
      setOfferBids(bidsMap)
      // I fetch my own active bids keyed by playerId for the market tab
      if (wallet.address) {
        const bidsForMe: Record<string, Bid> = {}
        for (let i = 1; i <= Number(totalOffers); i++) {
          try {
            const o = await escrow.getOffer(i)
            if (!o.exists) continue
            const escrowSigned = wallet.signer
              ? new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
              : escrow
            const bid = await escrowSigned.getBid(i, wallet.address)
            if (Number(bid.status) === 1 || Number(bid.status) === 2) {
              bidsForMe[o.playerId.toString()] = {
                offerId: BigInt(i), buyingClub: wallet.address,
                transferFee: bid.transferFee, signingBonusMonths: bid.signingBonusMonths,
                buyerAgentBps: bid.buyerAgentBps, status: Number(bid.status),
                roundNumber: bid.roundNumber, isCounterFromSeller: bid.isCounterFromSeller,
              }
            }
          } catch {}
        }
        setMyBids(bidsForMe)
      }
      // League queue — all offers with active bids
      const LEAGUE_ROLE = await escrow.LEAGUE_ROLE()
      const CLUB_ROLE   = await registry.CLUB_ROLE()
      const [leagueCheck, clubCheck] = await Promise.all([
        wallet.address ? escrow.hasRole(LEAGUE_ROLE, wallet.address) : Promise.resolve(false),
        wallet.address ? registry.hasRole(CLUB_ROLE, wallet.address) : Promise.resolve(false),
      ])
      setIsLeague(leagueCheck)
      setIsClub(clubCheck)
      if (leagueCheck) {
        const lOffers: { offer: Offer; bids: Bid[] }[] = []
        for (let i = 1; i <= Number(totalOffers); i++) {
          try {
            const o = await escrow.getOffer(i)
            if (!o.exists) continue
            const bids = await escrow.getAllBids(i)
            const activeBids = bids.filter((b: any) => Number(b.status) >= 1 && Number(b.status) <= 3)
            if (activeBids.length === 0) continue
            let playerName = `Player #${o.playerId}`
            try { const p = await registry.getPlayer(o.playerId); playerName = p.name } catch {}
            lOffers.push({
              offer: {
                id: BigInt(i), playerId: o.playerId, playerName,
                sellingClub: o.sellingClub, paymentToken: o.paymentToken,
                askingPrice: o.askingPrice, sellOnBps: o.sellOnBps,
                sellerAgentBps: o.sellerAgentBps,
                minimumHijackIncrementBps: o.minimumHijackIncrementBps,
                activeNegotiations: o.activeNegotiations, exists: o.exists,
              },
              bids: activeBids.map((b: any) => ({
                offerId: b.offerId, buyingClub: b.buyingClub,
                transferFee: b.transferFee, signingBonusMonths: b.signingBonusMonths,
                buyerAgentBps: b.buyerAgentBps, status: Number(b.status),
                roundNumber: b.roundNumber, isCounterFromSeller: b.isCounterFromSeller,
              })),
            })
          } catch {}
        }
        setLeagueOffers(lOffers)
      }

      // I load my deals via getDealView — only fields exposed in DealView are available
      const deals: Deal[] = []
      for (let i = 1; i <= Number(totalDeals); i++) {
        try {
          const d = await dealEscrow.getDealView(i)
          if (!d.exists) continue
          const isInvolved =
            d.buyingClub.toLowerCase()  === wallet.address.toLowerCase() ||
            d.sellingClub.toLowerCase() === wallet.address.toLowerCase()
          if (!isInvolved) continue
          // I get playerId from the deal via getExpiryView which exposes more fields
          let playerId = 0n
          let playerName = `Deal #${i}`
          // DealView does not expose playerId — label with deal id
          deals.push({
            id: BigInt(i), playerId,  playerName,
            sellingClub: d.sellingClub, buyingClub: d.buyingClub,
            paymentToken: d.paymentToken, transferFee: d.transferFee,
            signingBonusAmount: 0n,
            state: Number(d.state), stateDeadline: d.stateDeadline,
            acceptedAt: 0n,
          })
        } catch {}
      }
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
      // I compute the timestamp right before submission (not at form-open time) and
      // use a 10-minute buffer to absorb wallet confirmation delay + block time —
      // a stale base here causes the contract to revert with InvalidAmount() since
      // due dates must be strictly in the future relative to block.timestamp at execution.
      const nowSec = Math.floor(Date.now() / 1000)
      const SAFETY_BUFFER_SECS = 600
      const instAmounts  = installmentRows.map(r => ethers.parseUnits(r.amount || bidForm.transferFee || "0", 6))
      const instDueDates: bigint[] = []
      let lastDueDate = nowSec + SAFETY_BUFFER_SECS
      for (const r of installmentRows) {
        const explicit = r.dueDate ? Math.floor(new Date(r.dueDate).getTime() / 1000) : null
        // If no explicit date, or the explicit date doesn't clear the previous one
        // (or the safety buffer for the first row), fall back to strictly increasing
        // dates spaced 1 day apart from the last valid due date.
        const dueDate = explicit !== null && explicit > lastDueDate ? explicit : lastDueDate + 86400
        instDueDates.push(BigInt(dueDate))
        lastDueDate = dueDate
      }
      const tx = await escrow.submitBid(
        offerId,
        ethers.parseUnits(bidForm.transferFee, 6),
        parseInt(bidForm.sellOnBps) || 0,
        bidForm.sellOnRecipient || ethers.ZeroAddress,
        parseInt(bidForm.sellerAgentBps) || 0,
        bidForm.sellerAgent || ethers.ZeroAddress,
        parseInt(bidForm.buyerAgentBps) || 0,
        bidForm.buyerAgent || ethers.ZeroAddress,
        parseInt(bidForm.signingBonusMonths) || 0,
        instAmounts,
        instDueDates,
      )
      setTxStatus("Waiting for confirmation...")
      await tx.wait()
      setTxStatus("Bid submitted.")
      setSelectedOffer(null)
      setBidForm({ transferFee: "", sellOnBps: "0", sellOnRecipient: "", sellerAgentBps: "0", sellerAgent: "", buyerAgentBps: "0", buyerAgent: "", signingBonusMonths: "0" })
      setInstallmentRows([{ amount: "", dueDate: "" }])
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

  async function withdrawBid(offerId: bigint) {
    if (!wallet.signer) return
    setTxStatus("Withdrawing bid...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.withdrawBid(offerId)).wait()
      setTxStatus("Bid withdrawn.")
      await loadAll()
    } catch (err: any) { setTxStatus(parseError(err)) }
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

  async function resolveDeadlock(dealId: bigint, op: number, newFee: string) {
    if (!wallet.signer) return
    setTxStatus("Resolving deadlock...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.resolveDeadlock(dealId, op, newFee ? ethers.parseUnits(newFee, 6) : 0n)).wait()
      setTxStatus("Deadlock resolved."); await loadAll()
    } catch (err: any) { setTxStatus(parseError(err)) }
  }

  async function processNewWindow() {
    if (!wallet.signer) return
    setTxStatus("Processing new window...")
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer)
      await (await escrow.processNewWindow([])).wait()
      setTxStatus("Window processed."); await loadAll()
    } catch (err: any) { setTxStatus(parseError(err)) }
  }

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
            {isLeague && <TabBtn t="league" label={`LEAGUE QUEUE (${leagueOffers.length})`} />}
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
                              {sel ? "▼ CREATE OFFER" : "CREATE OFFER"}
                            </button>
                          )}
                          {/* Buying club places bid on existing offer */}
                          {!isOwn && windowOpen && (
                            <button onClick={async () => {
                              try {
                                const esc = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.provider!)
                                const offerId: bigint = await esc.getPlayerOffer(p.id)
                                if (offerId === 0n) { alert("No active offer found for this player."); return; }
                                if (myBids[p.id.toString()]) {
                                  await withdrawBid(offerId)
                                } else {
                                  setSelectedOffer({ id: offerId, playerId: p.id, playerName: p.name, sellingClub: p.currentClub, paymentToken: EURC_ADDRESS, askingPrice: p.askingPrice, sellOnBps: 0n, sellerAgentBps: 0n, minimumHijackIncrementBps: 500n, activeNegotiations: 0n, exists: true })
                                }
                              } catch { alert("Failed to load offer. Try again."); }
                            }} style={btn(myBids[p.id.toString()] ? "var(--red)" : "var(--text-secondary)")}>
                              {myBids[p.id.toString()] ? "WITHDRAW BID" : "PLACE BID"}
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
                    <div><label style={labelStyle}>SIGNING BONUS (MONTHS)</label>
                      <input type="number" placeholder="0–24" value={bidForm.signingBonusMonths} onChange={e => setBidForm(p => ({ ...p, signingBonusMonths: e.target.value }))} style={inputStyle} />
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
                  {/* Installment schedule */}
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                      INSTALLMENT SCHEDULE ({installmentRows.length} payment{installmentRows.length !== 1 ? "s" : ""})
                    </p>
                    {installmentRows.map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", marginBottom: "0.4rem", alignItems: "end" }}>
                        <div>
                          {idx === 0 && <label style={labelStyle}>AMOUNT (€)</label>}
                          <input type="number" placeholder={bidForm.transferFee || "0"}
                            value={row.amount}
                            onChange={e => setInstallmentRows(rows => rows.map((r, i) => i === idx ? { ...r, amount: e.target.value } : r))}
                            style={inputStyle} />
                        </div>
                        <div>
                          {idx === 0 && <label style={labelStyle}>DUE DATE</label>}
                          <input type="date"
                            value={row.dueDate}
                            onChange={e => setInstallmentRows(rows => rows.map((r, i) => i === idx ? { ...r, dueDate: e.target.value } : r))}
                            style={inputStyle} />
                        </div>
                        <button
                          onClick={() => setInstallmentRows(rows => rows.length === 1 ? rows : rows.filter((_, i) => i !== idx))}
                          style={{ ...btn("var(--red)"), padding: "6px 10px", alignSelf: "end" }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => setInstallmentRows(rows => [...rows, { amount: "", dueDate: "" }])}
                      style={{ ...btn("var(--text-secondary)"), marginTop: "0.25rem", fontSize: "0.6rem", padding: "4px 12px" }}>
                      + ADD INSTALLMENT
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {isClub ? (
                      <button onClick={() => submitBid(selectedOffer.id)} disabled={!bidForm.transferFee}
                        style={{ ...btn("var(--gold)", bidForm.transferFee ? "rgba(201,168,76,0.1)" : "transparent"), padding: "8px 24px", fontSize: "0.75rem" }}>
                        SUBMIT BID
                      </button>
                    ) : (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
                        Connect a wallet with CLUB_ROLE to submit a bid.
                      </p>
                    )}
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
                                Salary guarantee: {bid.signingBonusMonths.toString()} months · Round {bid.roundNumber.toString()} · {bid.isCounterFromSeller ? "Waiting for buyer" : "Your turn"}
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

          {/* ── LEAGUE TAB ── */}
          {tab === "league" && !loading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
                  OFFERS WITH ACTIVE NEGOTIATIONS
                </p>
                <button onClick={processNewWindow} style={{ ...btn("var(--gold)"), fontSize: "0.65rem", padding: "5px 14px" }}>
                  PROCESS NEW WINDOW
                </button>
              </div>
              {leagueOffers.length === 0 ? (
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>NO ACTIVE NEGOTIATIONS</p>
                </div>
              ) : leagueOffers.map(({ offer, bids }) => (
                <div key={offer.id.toString()} style={{ background: "var(--bg-card)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", marginBottom: "0.75rem" }}>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                    {offer.playerName} — <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>
                      €{(Number(offer.askingPrice) / 1e6).toLocaleString()}
                    </span>
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
                    Offer #{offer.id.toString()} · {bids.length} active bid{bids.length !== 1 ? "s" : ""}
                  </p>
                  {bids.map((bid, idx) => {
                    const BID_STATUS = ["NONE","ACTIVE","NEGOTIATING","ACCEPTED","REJECTED","WITHDRAWN"]
                    return (
                      <div key={idx} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                          {bid.buyingClub.slice(0,10)}...{bid.buyingClub.slice(-6)} ·
                          €{(Number(bid.transferFee) / 1e6).toLocaleString()} ·
                          Round {bid.roundNumber.toString()} · {BID_STATUS[bid.status]}
                          {bid.isCounterFromSeller ? " · Waiting on buyer" : " · Waiting on seller"}
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                          <button onClick={() => acceptBid(offer.id, bid.buyingClub)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>ACCEPT BID</button>
                          <button onClick={() => rejectBid(offer.id, bid.buyingClub)} style={btn("var(--red)")}>REJECT BID</button>
                          <button onClick={() => {
                            const fee = window.prompt("Resolve fee (€, leave blank to cancel):")
                            const op  = window.prompt("Op: 0=cancel, 1=force seller fee, 2=force buyer fee") ?? "0"
                            if (fee !== null) resolveDeadlock(offer.id, parseInt(op), fee)
                          }} style={btn("var(--text-secondary)")}>RESOLVE DEADLOCK</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
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
