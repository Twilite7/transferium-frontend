export function Testing() {
  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  const tag = (color: string, bg: string, text: string) => (
    <span style={{
      display: "inline-block", fontSize: "0.62rem", padding: "3px 10px",
      borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)",
      letterSpacing: "0.08em", background: bg, color,
    }}>{text}</span>
  );

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem",
      marginBottom: "0.75rem", ...style,
    }}>{children}</div>
  );

  const cardTitle = (icon: string, children: React.ReactNode) => (
    <div style={{ ...mono, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span>{icon}</span>{children}
    </div>
  );

  const step = (num: string, children: React.ReactNode) => (
    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
      <span style={{ ...mono, fontSize: "0.6rem", color: "var(--text-dim)", minWidth: "20px", paddingTop: "2px", flexShrink: 0 }}>{num}</span>
      <span style={{ ...mono, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: "1.65" }}>{children}</span>
    </div>
  );

  const code = (s: string) => (
    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px", color: "var(--text-primary)" }}>{s}</code>
  );

  const section = (num: string, title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: "2rem" }}>
      <p style={{ ...mono, fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-dim)", borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem", marginBottom: "1rem" }}>
        {num} — {title}
      </p>
      {children}
    </div>
  );

  const grid2 = (children: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>{children}</div>
  );

  const banner = (color: string, bg: string, border: string, children: React.ReactNode) => (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", fontSize: "0.68rem", color, marginBottom: "0.75rem", lineHeight: "1.6", ...mono }}>
      {children}
    </div>
  );

  const hashBox = (label: string, input: string, hash: string) => (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.9rem", marginBottom: "0.5rem" }}>
      <p style={{ ...mono, fontSize: "0.58rem", color: "var(--text-dim)", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ ...mono, fontSize: "0.62rem", color: "var(--gold)", marginBottom: "0.2rem" }}>input: "{input}"</p>
      <p style={{ ...mono, fontSize: "0.62rem", color: "var(--text-primary)", wordBreak: "break-all", lineHeight: 1.6 }}>{hash}</p>
    </div>
  );

  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: "var(--gold)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
    >{label}</a>
  );

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <p style={{ ...mono, fontSize: "0.6rem", letterSpacing: "0.12em", color: "var(--text-dim)", marginBottom: "0.5rem" }}>TRANSFERIUM PROTOCOL — ARC TESTNET</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--gold)", marginBottom: "0.75rem", letterSpacing: "0.04em" }}>TESTER'S FIELD GUIDE</h1>
        <p style={{ ...mono, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "600px" }}>
          A complete walkthrough for setting up wallets, testing every protocol flow,
          stress-testing edge cases, and deliberately trying to break the system.
        </p>
      </div>

      {/* 01 Prerequisites */}
      {section("01", "PREREQUISITES & WALLET SETUP", <>
        {grid2(<>
          {card(<>
            {cardTitle("◈", "Wallets needed")}
            <div style={{ ...mono, fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
              You need <strong style={{ fontWeight: 500, color: "var(--text-primary)" }}>3–4 separate wallets</strong>. Use MetaMask or any WalletConnect wallet.
            </div>
            {step("W1", <>{code("Registrar")} — request REGISTRAR_ROLE via DM on {link("https://twitter.com/zenomurphy", "X @zenomurphy")}. Verifies player documents.</>)}
            {step("W2", <>{code("Club A")} — request CLUB_ROLE via DM. Registers and lists players.</>)}
            {step("W3", <>{code("Club B")} — request CLUB_ROLE via DM. Submits transfer bids.</>)}
            {step("W4", <>{code("Player")} — optional. Assigned as the player's personal wallet for consent and bonus claims. No role needed.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", "Network & gas")}
            {step("01", <>Add ARC Testnet to your wallet: Chain ID {code("5042002")}.</>)}
            {step("02", <>ARC uses <strong style={{ fontWeight: 500, color: "var(--text-primary)" }}>USDC as gas</strong> — not ETH. Get testnet USDC from {link("https://faucet.circle.com", "faucet.circle.com")}. Fund all wallets.</>)}
            {step("03", <>Get testnet EURC (the protocol's payment token) at {code("0x89B50855...D72a")}. Request from {link("https://twitter.com/zenomurphy", "@zenomurphy")} or the Circle faucet if EURC is listed.</>)}
            {step("04", <>Club A and Club B need at least {code("10 EURC")} each — covers registration (0.5), listing, and verification (2) fees.</>)}
          </>)}
        </>)}

        {card(<>
          {cardTitle("◈", "Document hashes — what to submit")}
          <p style={{ ...mono, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "0.75rem" }}>
            The protocol stores <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px" }}>bytes32</code> keccak256 hashes of off-chain documents — not the documents themselves.
            On testnet, generate hashes from any identifier string. Here are ready-to-use examples:
          </p>
          {hashBox("MEDICAL CLEARANCE HASH", "medical_report_cole_palmer_2025", "0x3d5a9f2c1b8e4a7f0d6c3b9e2a5f8c1d4b7e0a3f6c9d2b5e8a1f4c7d0b3e6a9f")}
          {hashBox("FIFA TMS REFERENCE HASH", "fifa_tms_ref_TRF2025001234", "0x7a2e5b8c1f4d0a9e3b6c2f5d8a1e4b7c0f3d6a9b2e5c8f1d4a7e0b3c6f9d2a5e")}
          {hashBox("WORK PERMIT HASH", "work_permit_GB_WP2025_88421", "0x1c4f7a2d5b8e0c3f6a9d2b5e8c1f4a7d0e3b6c9f2a5e8d1b4c7f0a3d6e9b2c5f")}
          {hashBox("REGISTRATION CONTRACT HASH", "reg_contract_chelsea_fc_2025_001", "0x9b2e5a8c1f4d7a0e3c6b9f2d5a8e1c4b7f0d3a6c9e2b5f8a1d4c7e0b3f6a9d2c")}
          <p style={{ ...mono, fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "0.75rem", lineHeight: 1.65 }}>
            To generate your own in the browser console or Node.js:{" "}
            {code('ethers.keccak256(ethers.toUtf8Bytes("your_document_identifier_here"))')}
            {" "}— use a unique string per document per player. Keep a record of your input strings; the registrar cross-checks the hash off-chain.
          </p>
        </>)}
      </>)}

      {/* 02 Happy path */}
      {section("02", "HAPPY PATH: FULL TRANSFER FLOW", <>
        {banner("var(--amber)", "rgba(201,168,76,0.08)", "var(--gold-dim)", <>
          ⚡ Complete these steps in order using the correct wallet for each phase. A transfer window must be open for bids to work — DM {link("https://twitter.com/zenomurphy", "@zenomurphy")} to schedule one if none is active.
        </>)}

        {card(<>
          {cardTitle("◈", <span>Phase 1 — Registrar sets fee <span style={{ marginLeft: "0.5rem" }}>{tag("var(--amber)", "rgba(201,168,76,0.12)", "wallet: Registrar")}</span></span>)}
          {step("01", <>Connect Registrar wallet → go to Registrar page → Verification Fee Settings → set fee to {code("2")} EURC (max allowed is 2.4 EURC, which is 120% of the 2 EURC base). Confirm transaction.</>)}
        </>)}

        {card(<>
          {cardTitle("◈", <span>Phase 2 — Player registration <span style={{ marginLeft: "0.5rem" }}>{tag("var(--green)", "rgba(45,206,137,0.08)", "wallet: Club A")}</span></span>)}
          {step("02", <>Club page → Register Player. Fill in name, position, nationality, contract expiry, weekly salary in EURC. Submit — deducts 0.5 EURC registration fee.</>)}
          {step("03", <>Submit Medical Clearance hash — use one of the example hashes above, or generate your own.</>)}
          {step("04", <>Submit Legal Documents — provide three separate hashes: registration contract, FIFA TMS reference, work permit.</>)}
          {step("05", <>Set Player Wallet to W4 address (or any wallet you control).</>)}
          {step("06", <>Request Verification — frontend auto-approves 2 EURC to VerificationManager (tx 1), then locks the fee in escrow (tx 2).</>)}
        </>)}

        {card(<>
          {cardTitle("◈", <span>Phase 3 — Verification <span style={{ marginLeft: "0.5rem" }}>{tag("var(--amber)", "rgba(201,168,76,0.12)", "wallet: Registrar")}</span></span>)}
          {step("07", <>Registrar page → find the player → expand Step 1 → Verify Medical Clearance. The panel shows the submitted hash — cross-check it matches the input string off-chain.</>)}
          {step("08", <>Expand Step 2 → Verify Legal Documents. Same hash-check for all three document hashes.</>)}
          {step("09", <>Expand Step 3 → Approve & Verify Player. Fee splits: 1.9 EURC claimable by registrar, 0.1 EURC to protocol treasury (at 5% protocol fee).</>)}
          {step("10", <>Claimable fee banner appears in green. Click Withdraw Fees to pull EURC to registrar wallet.</>)}
        </>)}

        {card(<>
          {cardTitle("◈", <span>Phase 4 — Transfer <span style={{ marginLeft: "0.5rem" }}>{tag("var(--green)", "rgba(45,206,137,0.08)", "wallet: Club A / Club B / Player")}</span></span>)}
          {step("11", <>{code("Club A")}: List player at an asking price on the Transfers page.</>)}
          {step("12", <>{code("Club B")}: Submit a bid. Up to 3 rounds of negotiation — try lowball, counter, accept to test the full negotiation flow.</>)}
          {step("13", <>{code("Club A")}: Accept the bid. A Deal is created in DealEscrow. Player consent is now required.</>)}
          {step("14", <>{code("Player wallet (W4)")}: Connect and go to Player page → give consent to the transfer. Deal moves to {code("AWAITING_MEDICAL")}. Competing bids are now open.</>)}
          {step("15", <>{code("Club B")}: Go to Deals page → submit medical pass (PASSED). Deal moves to {code("FUNDING_PENDING")}. Competing bids still open until funded.</>)}
          {step("16", <>{code("Club B")}: Fund the deal — approves and transfers agreed fee to escrow. Deal completes immediately — NFT transfers to Club B, fees distributed.</>)}
          {step("17", <>{code("Player wallet")}: Claim signing bonus on the Player page (if a signing bonus was agreed).</>)}
          {step("17b", <>Optional — test competing bid: after step 14, connect Club C wallet → Deals page → Submit Competing Bid with a higher fee. Club A can Accept, Club B can Match within 24h or let it expire.</>)}
        </>)}
      </>)}

      {/* 03 Alternate flows */}
      {section("03", "ALTERNATE FLOWS", <>
        {grid2(<>
          {card(<>
            {cardTitle("◈", "Loan flow")}
            {step("01", <>Club A proposes a loan via Loans page — set duration, loan fee, optional purchase clause amount.</>)}
            {step("02", <>Club B accepts and funds the loan fee.</>)}
            {step("03", <>Player gives consent. NFT temporarily transfers to Club B.</>)}
            {step("04", <>At loan end — Club B returns the player or triggers the purchase clause if one was set.</>)}
            {step("05", <>Test recall: Club A recalls the player mid-loan and verify the return fires correctly.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", "Swap flow")}
            {step("01", <>Register two verified players — one at Club A, one at Club B.</>)}
            {step("02", <>Club A proposes a player-for-player swap via Special page, with optional cash top-up.</>)}
            {step("03", <>Club B accepts. Both clubs fund their respective sides.</>)}
            {step("04", <>Both players consent. Both medicals pass. 48-hour dispute window runs.</>)}
            {step("05", <>On expiry, both NFTs atomically swap clubs in a single transaction.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", "Free transfer")}
            {step("01", <>Register a player with a contract expiry within 6 months of today.</>)}
            {step("02", <>Club B submits a free transfer proposal — no transfer fee, only a signing bonus.</>)}
            {step("03", <>Player signs via player wallet. Deposit locks — Club A cannot block it after this point.</>)}
            {step("04", <>Verify Club A withdrawal reverts after player consent is given.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", "Verification rejection")}
            {step("01", <>Club A submits a request with a mismatched hash — e.g. swap the medical hash for the work permit hash.</>)}
            {step("02", <>Registrar rejects with a reason: "Medical document hash does not match submitted report."</>)}
            {step("03", <>Verify the 2 EURC fee is distributed to registrar — not refunded to the club.</>)}
            {step("04", <>Club A resubmits with correct hashes — new request goes through successfully.</>)}
          </>)}
        </>)}
      </>)}

      {/* 04 Edge cases */}
      {section("04", "EDGE CASES & STRESS TESTS", <>
        {banner("var(--red)", "rgba(239,68,68,0.06)", "var(--red)", <>
          ⚠ These tests are designed to stress the system. Most will revert — that is the expected result. Confirm the revert reason matches what you expect.
        </>)}
        {grid2(<>
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "ACCESS CONTROL")}</>)}
            {step("T01", <>Register a player from a wallet without CLUB_ROLE → expect {code("AccessControlUnauthorizedAccount")}.</>)}
            {step("T02", <>Verify medical clearance from Club A wallet → expect revert.</>)}
            {step("T03", <>Call {code("withdrawRegistrarFees")} from Club A wallet → expect {code("AccessControlUnauthorizedAccount")}.</>)}
            {step("T04", <>Call {code("upgradeToAndCall")} on PlayerRegistry proxy from a non-admin wallet → expect revert.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "DUPLICATE & REPLAY")}</>)}
            {step("T05", <>Assign the same player wallet to two different players → expect {code("WalletAlreadyAssigned")}.</>)}
            {step("T06", <>Submit a second verification request while one is already active → expect {code("VerificationAlreadyActive")}.</>)}
            {step("T07", <>Try to verify an already-verified player → expect {code("PlayerAlreadyVerified")}.</>)}
            {step("T08", <>Submit a bid on a player who already has an active deal → expect revert.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "TIMING ATTACKS")}</>)}
            {step("T09", <>Submit a bid when no transfer window is open → expect {code("WindowNotOpen")}.</>)}
            {step("T10", <>Let the 72-hour verification window expire → call {code("claimVerificationRefund")} and verify full 2 EURC refund.</>)}
            {step("T11", <>Call {code("processExpiry")} before 48-hour dispute window ends → expect {code("DisputeWindowActive")}.</>)}
            {step("T12", <>Execute a wallet update before the 48-hour timelock → expect revert.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "ECONOMIC ATTACKS")}</>)}
            {step("T13", <>Set registrar fee above 2.4 EURC → expect {code("RegistrarFeeTooHigh")}.</>)}
            {step("T14", <>Fund a deal with less than the agreed fee → expect {code("InvalidAmount")}.</>)}
            {step("T15", <>Club A withdraws from a funded deal during dispute window → expect {code("MutualCancelOnly")}.</>)}
            {step("T16", <>Call {code("withdrawRegistrarFees")} with zero claimable balance → expect {code("NothingToWithdraw")}.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "STATE MACHINE")}</>)}
            {step("T17", <>Call Step 3 (verifyPlayer) before Steps 1 and 2 → expect {code("MedicalNotVerifiedInRequest")}.</>)}
            {step("T18", <>List a player who is not yet verified → expect revert.</>)}
            {step("T19", <>Give player consent before the deal is funded → expect revert.</>)}
            {step("T20", <>Submit medical pass before all parties have consented → expect revert.</>)}
          </>)}
          {card(<>
            {cardTitle("◈", <>{tag("var(--red)", "rgba(239,68,68,0.08)", "INPUT VALIDATION")}</>)}
            {step("T21", <>Submit a rejection with an empty reason field → expect {code("InvalidRejectionReason")}.</>)}
            {step("T22", <>Submit a rejection reason longer than 512 characters → expect {code("InvalidRejectionReason")}.</>)}
            {step("T23", <>Register a player with a zero FIFA ID hash → expect revert.</>)}
            {step("T24", <>Set protocol fee bps above 2000 → expect {code("FeeTooHigh")}.</>)}
          </>)}
        </>)}
      </>)}

      {/* 05 Hardhat */}
      {section("05", "CONTRACT-LEVEL TESTING (HARDHAT)", <>
        {card(<>
          {cardTitle("◈", "Running the test suite")}
          {step("01", <>{code("cd transferium-contracts && npx hardhat test")} — runs all 118 tests covering every contract path, escrow state machine, and security invariant.</>)}
          {step("02", <>{code('npx hardhat test --grep "revert"')} — runs only the revert and edge-case tests to verify every guard is in place.</>)}
          {step("03", <>{code("npx hardhat coverage")} — line-by-line coverage report. Target: 90%+ on core contracts.</>)}
          {step("04", <>{code("npx hardhat node")} in one terminal, then {code("npx hardhat run scripts/deploy_v3.ts --network localhost")} in another — full local testnet for rapid iteration without spending gas.</>)}
          {step("05", <>Use {code("evm_increaseTime")} and {code("evm_mine")} in Hardhat tests to fast-forward through the 48-hour dispute window and 72-hour verification timeout without waiting.</>)}
        </>)}
      </>)}

      {/* 06 Reporting */}
      {section("06", "REPORTING & CONTACT", <>
        {grid2(<>
          {card(<>
            {cardTitle("◈", "Found a bug?")}
            <p style={{ ...mono, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Note the wallet address, transaction hash, contract function called, and the exact error. Open an issue on{" "}
              {link("https://github.com/Twilite7/transferium-contracts", "GitHub (Twilite7/transferium-contracts)")}.
              For security vulnerabilities — reentrancy paths, access control gaps, economic exploits — DM {link("https://twitter.com/zenomurphy", "@zenomurphy")} on X before public disclosure.
            </p>
          </>)}
          {card(<>
            {cardTitle("◈", "Get access & contact")}
            <p style={{ ...mono, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "0.6rem" }}>
              DM {link("https://twitter.com/zenomurphy", "@zenomurphy on X")} to:
            </p>
            {step("→", <>Request CLUB_ROLE for your wallet address</>)}
            {step("→", <>Request REGISTRAR_ROLE for your wallet address</>)}
            {step("→", <>Request testnet EURC if the faucet doesn't cover it</>)}
            {step("→", <>Ask questions, suggest improvements, or propose collaboration</>)}
          </>)}
        </>)}
        {banner("var(--green)", "rgba(45,206,137,0.06)", "var(--green)", <>
          ✓ If you complete the full happy path end-to-end and all 24 edge case tests revert with the expected errors, the core protocol is working correctly on your setup.
        </>)}
      </>)}

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
        <p style={{ ...mono, fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          TRANSFERIUM PROTOCOL — ARC TESTNET — SECURITY OVER SPEED. ALWAYS.
        </p>
      </div>

    </div>
  );
}
