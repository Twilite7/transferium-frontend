import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { CONTRACTS, EURC_ADDRESS } from "../config/contracts";
import { PLAYER_REGISTRY_ABI, TRANSFER_ESCROW_ABI, TRANSFER_WINDOW_ABI } from "../config/abis";

interface ListedPlayer {
  id:             bigint;
  name:           string;
  position:       string;
  nationality:    string;
  contractExpiry: bigint;
  weeklySalary:   bigint;
  askingPrice:    bigint;
  currentClub:    string;
}

interface Deal {
  id:                    bigint;
  playerId:              bigint;
  playerName:            string;
  buyingClub:            string;
  sellingClub:           string;
  paymentToken:          string;
  transferFee:           bigint;
  salaryGuaranteeAmount: bigint;
  sellOnBps:             bigint;
  sellerAgentBps:        bigint;
  buyerAgentBps:         bigint;
  state:                 number;
  createdAt:             bigint;
  approvedAt:            bigint;
  rejectionReason:       string;
}

const DEAL_STATES = ["NONE", "PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"];
const DEAL_COLORS: Record<string, string> = {
  PENDING:   "var(--amber)",
  APPROVED:  "var(--green)",
  COMPLETED: "var(--text-secondary)",
  REJECTED:  "var(--red)",
  CANCELLED: "var(--text-dim)",
};

const btn = (color: string, bg = "transparent") => ({
  background:    bg,
  border:        `1px solid ${color}`,
  color:         color,
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.7rem",
  letterSpacing: "0.06em",
  padding:       "5px 14px",
  borderRadius:  "var(--radius-sm)",
  cursor:        "pointer",
  whiteSpace:    "nowrap" as const,
});

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
};

const labelStyle = {
  fontFamily:    "var(--font-mono)",
  fontSize:      "0.65rem",
  color:         "var(--text-dim)",
  letterSpacing: "0.08em",
  marginBottom:  "0.4rem",
  display:       "block" as const,
};

export function Transfers({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [listedPlayers, setListedPlayers] = useState<ListedPlayer[]>([]);
  const [myDeals, setMyDeals]             = useState<Deal[]>([]);
  const [pendingDeals, setPendingDeals]   = useState<Deal[]>([]);
  const [loading, setLoading]             = useState(false);
  const [windowOpen, setWindowOpen]       = useState(false);
  const [isLeague, setIsLeague]           = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<ListedPlayer | null>(null);
  const [txStatus, setTxStatus]           = useState<string | null>(null);
  const [rejectReason, setRejectReason]   = useState<Record<string, string>>({});

  // Deal form state
  const [form, setForm] = useState({
    transferFee:            "",
    salaryGuaranteeMonths:  "0",
    sellOnBps:              "0",
    sellOnRecipient:        "",
    sellerAgentBps:         "0",
    sellerAgent:            "",
    buyerAgentBps:          "0",
    buyerAgent:             "",
    addOnDesc:              "",
    addOnAmount:            "",
    addOnToPlayer:          false,
  });
  const [addOns, setAddOns] = useState<{ description: string; amount: string; toPlayer: boolean }[]>([]);

  useEffect(() => {
    if (!wallet.provider) return;
    loadAll();
  }, [wallet.provider, wallet.address]);

  async function loadAll() {
    if (!wallet.provider) return;
    setLoading(true);
    try {
      const registry = new ethers.Contract(CONTRACTS.PlayerRegistry, PLAYER_REGISTRY_ABI, wallet.provider);
      const escrow   = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.provider);
      const win      = new ethers.Contract(CONTRACTS.TransferWindow,  TRANSFER_WINDOW_ABI, wallet.provider);

      // I check window status and league role
      const [open, totalPlayers, totalDeals] = await Promise.all([
        win.isWindowOpen(),
        registry.totalPlayers(),
        escrow.totalDeals(),
      ]);
      setWindowOpen(open);

      if (wallet.address) {
        const LEAGUE_ROLE = await escrow.LEAGUE_ROLE();
        setIsLeague(await escrow.hasRole(LEAGUE_ROLE, wallet.address));
      }

      // I load all listed players for the market view
      const listed: ListedPlayer[] = [];
      for (let i = 1; i <= Number(totalPlayers); i++) {
        try {
          const p     = await registry.getPlayer(i);
          const owner = await registry.ownerOf(i);
          if (p.isListed) {
            listed.push({
              id:             p.id,
              name:           p.name,
              position:       p.position,
              nationality:    p.nationality,
              contractExpiry: p.contractExpiry,
              weeklySalary:   p.weeklySalary,
              askingPrice:    p.askingPrice,
              currentClub:    owner,
            });
          }
        } catch {}
      }
      setListedPlayers(listed);

      // I load deals relevant to connected wallet
      if (wallet.address) {
        const myD: Deal[]      = [];
        const pendingD: Deal[] = [];

        for (let i = 1; i <= Number(totalDeals); i++) {
          try {
            const d = await escrow.getDeal(i);
            const isInvolved = d.buyingClub.toLowerCase() === wallet.address.toLowerCase() ||
                               d.sellingClub.toLowerCase() === wallet.address.toLowerCase();

            // I fetch player name for display
            let playerName = `Player #${d.playerId}`;
            try {
              const p  = await registry.getPlayer(d.playerId);
              playerName = p.name;
            } catch {}

            const deal: Deal = {
              id:                    BigInt(i),
              playerId:              d.playerId,
              playerName,
              buyingClub:            d.buyingClub,
              sellingClub:           d.sellingClub,
              paymentToken:          d.paymentToken,
              transferFee:           d.transferFee,
              salaryGuaranteeAmount: d.salaryGuaranteeAmount,
              sellOnBps:             d.sellOnBps,
              sellerAgentBps:        d.sellerAgentBps,
              buyerAgentBps:         d.buyerAgentBps,
              state:                 Number(d.state),
              createdAt:             d.createdAt,
              approvedAt:            d.approvedAt,
              rejectionReason:       d.rejectionReason,
            };

            if (isInvolved) myD.push(deal);
            if (Number(d.state) === 1) pendingD.push(deal); // PENDING
          } catch {}
        }

        setMyDeals(myD);
        setPendingDeals(pendingD);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createDeal() {
    if (!wallet.signer || !selectedPlayer) return;
    setTxStatus("Approving EURC...");
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      const token  = new ethers.Contract(EURC_ADDRESS, ["function approve(address,uint256) external returns (bool)"], wallet.signer);

      const fee              = ethers.parseUnits(form.transferFee, 6);
      const guaranteeMonths  = parseInt(form.salaryGuaranteeMonths) || 0;
      const guaranteeAmount  = guaranteeMonths > 0
        ? selectedPlayer.weeklySalary * 4n * BigInt(guaranteeMonths)
        : 0n;
      const totalApprove     = fee + guaranteeAmount;

      await (await token.approve(CONTRACTS.TransferEscrow, totalApprove)).wait();
      setTxStatus("Creating deal...");

      const formattedAddOns = addOns.map(a => ({
        description: a.description,
        amount:      ethers.parseUnits(a.amount, 6),
        toPlayer:    a.toPlayer,
        triggered:   false,
      }));

      const tx = await escrow.createDeal(
        selectedPlayer.id,
        selectedPlayer.currentClub,
        EURC_ADDRESS,
        fee,
        guaranteeMonths,
        parseInt(form.sellOnBps) || 0,
        form.sellOnRecipient || ethers.ZeroAddress,
        parseInt(form.sellerAgentBps) || 0,
        form.sellerAgent || ethers.ZeroAddress,
        parseInt(form.buyerAgentBps) || 0,
        form.buyerAgent || ethers.ZeroAddress,
        formattedAddOns
      );

      setTxStatus("Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Deal created successfully.");
      setSelectedPlayer(null);
      setAddOns([]);
      setForm({ transferFee: "", salaryGuaranteeMonths: "0", sellOnBps: "0", sellOnRecipient: "", sellerAgentBps: "0", sellerAgent: "", buyerAgentBps: "0", buyerAgent: "", addOnDesc: "", addOnAmount: "", addOnToPlayer: false });
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function approveDeal(dealId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Approving deal #${dealId}...`);
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await (await escrow.approveDeal(dealId)).wait();
      setTxStatus(`Deal #${dealId} approved.`);
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function rejectDeal(dealId: bigint) {
    if (!wallet.signer) return;
    const reason = rejectReason[dealId.toString()];
    if (!reason) { setTxStatus("Enter a rejection reason first."); return; }
    setTxStatus(`Rejecting deal #${dealId}...`);
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await (await escrow.rejectDeal(dealId, reason)).wait();
      setTxStatus(`Deal #${dealId} rejected.`);
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function claimFunds(dealId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Claiming funds for deal #${dealId}...`);
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await (await escrow.claimFunds(dealId)).wait();
      setTxStatus(`Funds claimed for deal #${dealId}.`);
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function cancelDeal(dealId: bigint) {
    if (!wallet.signer) return;
    setTxStatus(`Cancelling deal #${dealId}...`);
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await (await escrow.cancelDeal(dealId)).wait();
      setTxStatus(`Deal #${dealId} cancelled.`);
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  async function withdrawClaimable() {
    if (!wallet.signer) return;
    setTxStatus("Withdrawing claimable balance...");
    try {
      const escrow = new ethers.Contract(CONTRACTS.TransferEscrow, TRANSFER_ESCROW_ABI, wallet.signer);
      await (await escrow.withdrawClaimable(EURC_ADDRESS)).wait();
      setTxStatus("Withdrawn successfully.");
      await loadAll();
    } catch (err: any) {
      setTxStatus(`Error: ${err.reason ?? err.message}`);
    }
  }

  const canClaimFunds = (d: Deal) => {
    if (d.state !== 2) return false; // must be APPROVED
    const windowEnd = Number(d.approvedAt) + 48 * 3600;
    return Date.now() / 1000 > windowEnd;
  };

  const disputeTimeRemaining = (d: Deal) => {
    const windowEnd = Number(d.approvedAt) + 48 * 3600;
    const remaining = windowEnd - Date.now() / 1000;
    if (remaining <= 0) return null;
    const hours = Math.floor(remaining / 3600);
    const mins  = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "3.5rem", color: "var(--gold)", marginBottom: "0.5rem" }}>TRANSFERS</h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Permanent transfer deals — escrow, approval, and fund settlement
        </p>
      </div>

      {!wallet.isConnected ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "4rem", textAlign: "center", background: "var(--bg-card)" }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text-dim)" }}>WALLET NOT CONNECTED</p>
        </div>
      ) : loading ? (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", fontSize: "0.8rem" }}>Loading...</p>
      ) : (
        <div>
          {/* Transfer Window Status */}
          <div style={{
            border:        `1px solid ${windowOpen ? "var(--green)" : "var(--border)"}`,
            borderRadius:  "var(--radius-lg)",
            padding:       "1rem 1.5rem",
            background:    "var(--bg-card)",
            marginBottom:  "2rem",
            display:       "flex",
            alignItems:    "center",
            gap:           "0.75rem",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: windowOpen ? "var(--green)" : "var(--text-dim)", boxShadow: windowOpen ? "0 0 8px var(--green)" : "none" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: windowOpen ? "var(--green)" : "var(--text-dim)" }}>
              TRANSFER WINDOW — {windowOpen ? "OPEN" : "CLOSED"}
            </span>
            {!windowOpen && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "auto" }}>
                Deal creation is only permitted during an open transfer window
              </span>
            )}
          </div>

          {/* Transfer Market */}
          <div style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              TRANSFER MARKET — LISTED PLAYERS
            </p>
            {listedPlayers.length === 0 ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem", textAlign: "center", background: "var(--bg-card)" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--text-dim)" }}>NO PLAYERS LISTED</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {listedPlayers.map(p => (
                  <div key={p.id.toString()} style={{
                    background:   "var(--bg-card)",
                    border:       `1px solid ${selectedPlayer?.id === p.id ? "var(--gold)" : "var(--border)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding:      "1.25rem 1.5rem",
                    cursor:       windowOpen ? "pointer" : "default",
                    transition:   "border-color 0.15s",
                  }}
                    onClick={() => windowOpen && setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", marginBottom: "0.2rem" }}>{p.name}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                          {p.position} · {p.nationality}
                        </p>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>
                        #{p.id.toString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginBottom: "0.2rem" }}>ASKING PRICE</p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold)" }}>
                          €{(Number(p.askingPrice) / 1e6).toLocaleString()}
                        </p>
                      </div>
                      {p.weeklySalary > 0n && (
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginBottom: "0.2rem" }}>WEEKLY</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            €{(Number(p.weeklySalary) / 1e6).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.75rem" }}>
                      Contract expires {new Date(Number(p.contractExpiry) * 1000).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </p>
                    {windowOpen && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: selectedPlayer?.id === p.id ? "var(--gold)" : "var(--text-dim)", marginTop: "0.5rem" }}>
                        {selectedPlayer?.id === p.id ? "▼ Fill deal form below" : "Click to initiate deal"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deal Creation Form */}
          {selectedPlayer && windowOpen && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-lg)", padding: "2rem", marginBottom: "2.5rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: "1.5rem" }}>
                NEW DEAL — {selectedPlayer.name.toUpperCase()} #{selectedPlayer.id.toString()}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>TRANSFER FEE (€)</label>
                  <input type="number" placeholder="e.g. 50000000" value={form.transferFee}
                    onChange={e => setForm(p => ({ ...p, transferFee: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>SALARY GUARANTEE (MONTHS)</label>
                  <input type="number" placeholder="0–12" value={form.salaryGuaranteeMonths}
                    onChange={e => setForm(p => ({ ...p, salaryGuaranteeMonths: e.target.value }))}
                    style={inputStyle} />
                  {selectedPlayer.weeklySalary > 0n && parseInt(form.salaryGuaranteeMonths) > 0 && (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
                      = €{(Number(selectedPlayer.weeklySalary) * 4 * parseInt(form.salaryGuaranteeMonths) / 1e6).toLocaleString()} locked
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>SELL-ON CLAUSE (BPS)</label>
                  <input type="number" placeholder="0–2000 (e.g. 500 = 5%)" value={form.sellOnBps}
                    onChange={e => setForm(p => ({ ...p, sellOnBps: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {parseInt(form.sellOnBps) > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={labelStyle}>SELL-ON RECIPIENT ADDRESS</label>
                  <input type="text" placeholder="0x..." value={form.sellOnRecipient}
                    onChange={e => setForm(p => ({ ...p, sellOnRecipient: e.target.value }))}
                    style={inputStyle} />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>SELLER AGENT FEE (BPS)</label>
                  <input type="number" placeholder="0–1000" value={form.sellerAgentBps}
                    onChange={e => setForm(p => ({ ...p, sellerAgentBps: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>SELLER AGENT ADDRESS</label>
                  <input type="text" placeholder="0x..." value={form.sellerAgent}
                    onChange={e => setForm(p => ({ ...p, sellerAgent: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>BUYER AGENT FEE (BPS)</label>
                  <input type="number" placeholder="0–1000" value={form.buyerAgentBps}
                    onChange={e => setForm(p => ({ ...p, buyerAgentBps: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>BUYER AGENT ADDRESS</label>
                  <input type="text" placeholder="0x..." value={form.buyerAgent}
                    onChange={e => setForm(p => ({ ...p, buyerAgent: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {/* Add-ons */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                  PERFORMANCE ADD-ONS ({addOns.length}/10)
                </p>
                {addOns.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.5rem 1rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {a.description} — €{parseFloat(a.amount).toLocaleString()} → {a.toPlayer ? "Player" : "Selling Club"}
                    </span>
                    <button onClick={() => setAddOns(prev => prev.filter((_, j) => j !== i))} style={btn("var(--red)")}>✕</button>
                  </div>
                ))}
                {addOns.length < 10 && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                    <div>
                      <label style={labelStyle}>CONDITION</label>
                      <input type="text" placeholder="e.g. 15+ league goals" value={form.addOnDesc}
                        onChange={e => setForm(p => ({ ...p, addOnDesc: e.target.value }))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>AMOUNT (€)</label>
                      <input type="number" placeholder="e.g. 2000000" value={form.addOnAmount}
                        onChange={e => setForm(p => ({ ...p, addOnAmount: e.target.value }))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>PAID TO</label>
                      <select value={form.addOnToPlayer ? "player" : "club"}
                        onChange={e => setForm(p => ({ ...p, addOnToPlayer: e.target.value === "player" }))}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="club">Selling Club</option>
                        <option value="player">Player Wallet</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!form.addOnDesc || !form.addOnAmount) return;
                        setAddOns(prev => [...prev, { description: form.addOnDesc, amount: form.addOnAmount, toPlayer: form.addOnToPlayer }]);
                        setForm(p => ({ ...p, addOnDesc: "", addOnAmount: "", addOnToPlayer: false }));
                      }}
                      disabled={!form.addOnDesc || !form.addOnAmount}
                      style={btn("var(--green)", form.addOnDesc && form.addOnAmount ? "rgba(45,206,137,0.1)" : "transparent")}>
                      + ADD
                    </button>
                  </div>
                )}
              </div>

              {/* Summary */}
              {form.transferFee && (
                <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>DEAL SUMMARY</p>
                  <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" as const }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>Transfer fee: <span style={{ color: "var(--gold)" }}>€{parseFloat(form.transferFee).toLocaleString()}</span></span>
                    {parseInt(form.salaryGuaranteeMonths) > 0 && selectedPlayer.weeklySalary > 0n && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>Salary guarantee: <span style={{ color: "var(--amber)" }}>€{(Number(selectedPlayer.weeklySalary) * 4 * parseInt(form.salaryGuaranteeMonths) / 1e6).toLocaleString()}</span></span>
                    )}
                    {parseInt(form.sellOnBps) > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>Sell-on: <span style={{ color: "var(--text-secondary)" }}>{parseInt(form.sellOnBps) / 100}%</span></span>}
                    {addOns.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>Add-ons: <span style={{ color: "var(--text-secondary)" }}>{addOns.length}</span></span>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={createDeal} disabled={!form.transferFee}
                  style={{ ...btn("var(--gold)", form.transferFee ? "rgba(201,168,76,0.1)" : "transparent"), padding: "8px 24px", fontSize: "0.75rem" }}>
                  SUBMIT DEAL
                </button>
                <button onClick={() => { setSelectedPlayer(null); setAddOns([]); }}
                  style={{ ...btn("var(--text-dim)"), padding: "8px 24px", fontSize: "0.75rem" }}>
                  CANCEL
                </button>
              </div>

              {txStatus && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>{txStatus}</p>
              )}
            </div>
          )}

          {/* My Deals */}
          {myDeals.length > 0 && (
            <div style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                MY DEALS
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
                {myDeals.map(d => {
                  const stateLabel = DEAL_STATES[d.state] ?? "UNKNOWN";
                  const stateColor = DEAL_COLORS[stateLabel] ?? "var(--text-dim)";
                  const isBuyer    = d.buyingClub.toLowerCase() === wallet.address?.toLowerCase();
                  const isSeller   = d.sellingClub.toLowerCase() === wallet.address?.toLowerCase();
                  const timeLeft   = d.state === 2 ? disputeTimeRemaining(d) : null;

                  return (
                    <div key={d.id.toString()} style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                            {d.playerName} — <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold)" }}>€{(Number(d.transferFee) / 1e6).toLocaleString()}</span>
                          </p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                            Deal #{d.id.toString()} · {isBuyer ? "Buying" : "Selling"} · {new Date(Number(d.createdAt) * 1000).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${stateColor}`, color: stateColor }}>
                          {stateLabel}
                        </span>
                      </div>

                      {timeLeft && (
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--amber)", marginBottom: "0.75rem" }}>
                          ⏳ Dispute window: {timeLeft}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const }}>
                        {isBuyer && d.state === 1 && (
                          <button onClick={() => cancelDeal(d.id)} style={btn("var(--red)")}>CANCEL DEAL</button>
                        )}
                        {isSeller && d.state === 2 && canClaimFunds(d) && (
                          <button onClick={() => claimFunds(d.id)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>CLAIM FUNDS</button>
                        )}
                        {isSeller && d.state === 2 && !canClaimFunds(d) && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>Waiting for dispute window</span>
                        )}
                        {(isBuyer || isSeller) && (d.state === 3 || d.state === 4 || d.state === 5) && (
                          <button onClick={withdrawClaimable} style={btn("var(--gold)")}>WITHDRAW CLAIMABLE</button>
                        )}
                      </div>

                      {d.rejectionReason && (
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--red)", marginTop: "0.75rem" }}>
                          Rejection reason: {d.rejectionReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* League Queue */}
          {isLeague && pendingDeals.length > 0 && (
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                LEAGUE QUEUE — PENDING APPROVAL ({pendingDeals.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
                {pendingDeals.map(d => (
                  <div key={d.id.toString()} style={{ background: "var(--bg-card)", border: "1px solid var(--amber)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                          {d.playerName} — <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--gold)" }}>€{(Number(d.transferFee) / 1e6).toLocaleString()}</span>
                        </p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          Deal #{d.id.toString()} · Buyer: {d.buyingClub.slice(0, 8)}...{d.buyingClub.slice(-6)} · Seller: {d.sellingClub.slice(0, 8)}...{d.sellingClub.slice(-6)}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button onClick={() => approveDeal(d.id)} style={btn("var(--green)", "rgba(45,206,137,0.1)")}>APPROVE</button>
                        <button onClick={() => rejectDeal(d.id)} style={btn("var(--red)")}>REJECT</button>
                      </div>
                    </div>
                    <input type="text" placeholder="Rejection reason (required to reject)"
                      value={rejectReason[d.id.toString()] ?? ""}
                      onChange={e => setRejectReason(prev => ({ ...prev, [d.id.toString()]: e.target.value }))}
                      style={{ ...inputStyle, fontSize: "0.75rem" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {txStatus && !selectedPlayer && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "1.5rem" }}>{txStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}
