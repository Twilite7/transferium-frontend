// I keep human-readable ABIs here for the existing ethers.js pages.
// The full JSON ABIs (for wagmi hooks) live in src/config/*.json

export const PLAYER_REGISTRY_ABI = [
  "function registerPlayer(string name, string position, string nationality, uint256 contractExpiry, uint256 weeklySalary, string portraitCID) external payable returns (uint256)",
  "function setPortrait(uint256 playerId, string cid) external",
  "function listPlayer(uint256 playerId, uint256 askingPrice) external payable",
  "function delistPlayer(uint256 playerId) external",
  "function verifyPlayer(uint256 playerId) external",
  "function setMedicalClearance(uint256 playerId, bytes32 documentHash) external",
  "function submitLegalDocuments(uint256 playerId, bytes32 registrationContractHash, bytes32 identityDocumentHash, bytes32 fifaTMSHash, bytes32 workPermitHash) external",
  "function verifyLegalDocuments(uint256 playerId) external",
  "function setPlayerWallet(uint256 playerId, address playerWallet) external",
  "function updatePlayerWallet(uint256 playerId, address newWallet) external",
  "function setReleaseClause(uint256 playerId, uint256 amount) external",
  "function extendContract(uint256 playerId, uint256 newExpiry) external",
  "function getPlayer(uint256 playerId) external view returns (tuple(uint256 id, string name, string position, string nationality, uint256 contractExpiry, uint256 weeklySalary, address playerWallet, bool isVerified, bool isListed, bool medicalClearance, bytes32 medicalDocumentHash, uint256 askingPrice, uint256 releaseClause, uint256 registeredAt, string portraitCID))",
  "function getLegalDocuments(uint256 playerId) external view returns (tuple(bytes32 registrationContractHash, bytes32 identityDocumentHash, bytes32 fifaTMSHash, bytes32 workPermitHash, bool documentsVerified))",
  "function getClubPlayers(address club) external view returns (uint256[])",
  "function totalPlayers() external view returns (uint256)",
  "function registrationFee() external view returns (uint256)",
  "function listingFee() external view returns (uint256)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
  "function CLUB_ROLE() external view returns (bytes32)",
  "function REGISTRAR_ROLE() external view returns (bytes32)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function currentClub(uint256 playerId) external view returns (address)",
] as const

// ─── TransferEscrow v2 ────────────────────────────────────────────────────────
export const TRANSFER_ESCROW_ABI = [
  // Offer flow
  "function createOffer(uint256 playerId, address paymentToken, uint256 askingPrice, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 minimumHijackIncrementBps, tuple(string description, uint256 amount, bool toPlayer, bool triggered)[] addOns) external returns (uint256 offerId)",
  "function updateOffer(uint256 offerId, uint256 newAskingPrice, uint256 newSellOnBps, address newSellOnRecipient, uint256 newSellerAgentBps, address newSellerAgent, uint256 newMinimumHijackIncrementBps) external",
  "function withdrawOffer(uint256 offerId) external",
  "function acceptBid(uint256 offerId, address buyingClub) external",
  "function rejectBid(uint256 offerId, address buyingClub) external",
  "function counterBid(uint256 offerId, address buyingClub, uint256 newTransferFee, uint256 newSellOnBps, address newSellOnRecipient, uint256 newSellerAgentBps, address newSellerAgent) external",
  // Bid flow
  "function submitBid(uint256 offerId, uint256 transferFee, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 buyerAgentBps, address buyerAgent, uint256 salaryGuaranteeMonths) external",
  "function updateBid(uint256 offerId, uint256 newTransferFee, uint256 newSellOnBps, address newSellOnRecipient, uint256 newSellerAgentBps, address newSellerAgent, uint256 newBuyerAgentBps, address newBuyerAgent, uint256 newSalaryGuaranteeMonths) external",
  "function withdrawBid(uint256 offerId) external",
  // Hijack
  "function submitHijackBid(uint256 dealId, uint256 transferFee, uint256 buyerAgentBps, address buyerAgent, uint256 salaryGuaranteeMonths) external",
  // Expiry / renegotiation
  "function processExpiry(uint256 dealId) external",
  "function expireMutualCancel(uint256 dealId) external",
  "function walkAwayFromRenegotiation(uint256 dealId) external",
  "function resolveDeadlock(uint256 dealId, uint8 op, uint256 newFee) external",
  // Views
  "function getOffer(uint256 offerId) external view returns (tuple(uint256 playerId, address sellingClub, address paymentToken, uint256 askingPrice, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 minimumHijackIncrementBps, uint256 createdAt, uint256 activeNegotiations, bool exists))",
  "function getBid(uint256 offerId, address buyingClub) external view returns (tuple(uint256 offerId, address buyingClub, address paymentToken, uint256 transferFee, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 buyerAgentBps, address buyerAgent, uint256 salaryGuaranteeMonths, uint256 submittedAt, uint256 updatedAt, uint256 roundNumber, bool isCounterFromSeller, uint8 status))",
  "function getAllBids(uint256 offerId) external view returns (tuple(uint256 offerId, address buyingClub, address paymentToken, uint256 transferFee, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 buyerAgentBps, address buyerAgent, uint256 salaryGuaranteeMonths, uint256 submittedAt, uint256 updatedAt, uint256 roundNumber, bool isCounterFromSeller, uint8 status)[])",
  "function getPlayerOffer(uint256 playerId) external view returns (uint256)",
  "function getPlayerDeal(uint256 playerId) external view returns (uint256)",
  "function totalOffers() external view returns (uint256)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function CLUB_ROLE() external view returns (bytes32)",
  "function LEAGUE_ROLE() external view returns (bytes32)",
] as const

// ─── DealEscrow v2 ────────────────────────────────────────────────────────────
export const DEAL_ESCROW_ABI = [
  // Player actions
  "function consentToTransfer(uint256 dealId) external",
  "function declineTransfer(uint256 dealId) external",
  "function submitMedical(uint256 dealId, uint8 outcome, bytes32 medicalHash) external",
  "function claimSalaryGuarantee(uint256 dealId) external",
  // Selling club actions
  "function acceptHijackBid(uint256 dealId) external",
  "function rejectHijackBid(uint256 dealId) external",
  "function acceptMedicalRenegotiation(uint256 dealId, uint256 newFee) external",
  "function rejectMedicalRenegotiation(uint256 dealId) external",
  "function escalateToLeague(uint256 dealId) external",
  // Buying club actions
  "function fundDeal(uint256 dealId) external",
  "function raiseDispute(uint256 dealId) external",
  "function proposeMutualCancel(uint256 dealId) external",
  "function confirmMutualCancel(uint256 dealId) external",
  "function depositAddOnFunds(uint256 dealId, uint256 amount) external",
  // League actions
  "function forceComplete(uint256 dealId) external",
  "function forceCancelDeal(uint256 dealId) external",
  "function resolveDispute(uint256 dealId) external",
  "function triggerAddOn(uint256 dealId, uint256 idx) external",
  "function freezeDeal(uint256 dealId) external",
  "function unfreezeDeal(uint256 dealId) external",
  // Withdraw
  "function withdrawClaimable(address token) external",
  // Views
  "function getDeal(uint256 dealId) external view returns (tuple(uint256 offerId, uint256 playerId, address sellingClub, address buyingClub, address paymentToken, uint256 transferFee, uint256 sellOnBps, address sellOnRecipient, uint256 sellerAgentBps, address sellerAgent, uint256 buyerAgentBps, address buyerAgent, uint256 salaryGuaranteeMonths, uint256 salaryGuaranteeAmount, bool salaryGuaranteeClaimed, uint256 minimumHijackIncrementBps, uint8 state, uint256 stateDeadline, uint256 acceptedAt, uint256 fundedAt, bytes32 medicalHash, uint8 medicalOutcome, bool frozen, uint256 frozenAt, uint256 hijackDeposit, address hijackDepositClub, address mutualCancelProposer, uint256 mutualCancelDeadline))",
  "function getDealAddOns(uint256 dealId) external view returns (tuple(string description, uint256 amount, bool toPlayer, bool triggered)[])",
  "function getPlayerDeal(uint256 playerId) external view returns (uint256)",
  "function getClaimable(address account, address token) external view returns (uint256)",
  "function getAddOnDeposit(uint256 dealId, address token) external view returns (uint256)",
  "function totalDeals() external view returns (uint256)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function LEAGUE_ROLE() external view returns (bytes32)",
  "function approveToken(address token) external",
  "function setProtocolFee(uint256 bps) external",
] as const

export const LOAN_ESCROW_ABI = [
  "function createLoan(uint256 playerId, address parentClub, address paymentToken, uint256 loanFee, uint256 loanDuration, bool hasOptionToBuy, uint256 optionPrice) external returns (uint256)",
  "function cancelLoan(uint256 loanId) external",
  "function approveLoan(uint256 loanId) external",
  "function rejectLoan(uint256 loanId, string reason) external",
  "function claimLoanFee(uint256 loanId) external",
  "function requestRecall(uint256 loanId) external",
  "function executeRecall(uint256 loanId) external",
  "function settleLoanExpiry(uint256 loanId) external",
  "function exerciseOption(uint256 loanId) external",
  "function withdrawClaimable(address token) external",
  "function getLoan(uint256 loanId) external view returns (tuple(uint256 playerId, address parentClub, address borrowingClub, address paymentToken, uint256 loanFee, uint256 loanStart, uint256 loanExpiry, bool hasOptionToBuy, uint256 optionPrice, uint8 state, uint256 createdAt, uint256 approvedAt, uint256 recallRequestedAt, bool loanFeeClaimed, string rejectionReason))",
  "function getClaimable(address account, address token) external view returns (uint256)",
  "function getActivePlayerLoan(uint256 playerId) external view returns (uint256)",
  "function totalLoans() external view returns (uint256)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function LEAGUE_ROLE() external view returns (bytes32)",
  "function CLUB_ROLE() external view returns (bytes32)",
] as const

export const TRANSFER_WINDOW_ABI = [
  "function isWindowOpen() external view returns (bool)",
  "function getActiveWindow() external view returns (tuple(uint256 id, string label, uint256 opensAt, uint256 closesAt, bool exists))",
  "function scheduleWindow(string label, uint256 opensAt, uint256 closesAt, uint8 windowType) external returns (uint256)",
  "function totalWindows() external view returns (uint256)",
] as const

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
] as const
