// I decode custom Solidity errors by matching the 4-byte selector against all known
// contract ABIs. This means error messages stay in sync with the contracts automatically
// and never need manual selector updates.

import PlayerRegistryABI      from "../config/PlayerRegistry.json";
import TransferEscrowABI      from "../config/TransferEscrow.json";
import DealEscrowABI          from "../config/DealEscrow.json";
import LoanEscrowABI          from "../config/LoanEscrow.json";
import SwapEscrowABI          from "../config/SwapEscrow.json";
import FreeTransferEscrowABI  from "../config/FreeTransferEscrow.json";
import InstallmentEscrowABI   from "../config/InstallmentEscrow.json";
import TransferWindowABI      from "../config/TransferWindow.json";
import VerificationManagerABI from "../config/VerificationManager.json";
import TerminationManagerABI  from "../config/TerminationManager.json";
import { ethers } from "ethers";

// ─── Human-readable messages for every custom error in the protocol ───────────

const ERROR_MESSAGES: Record<string, string> = {
  // ── PlayerRegistry ──────────────────────────────────────────────────────────
  "ReentrantCall":                    "Reentrant call detected. Please try again.",
  "ZeroAddress":                      "A required address is missing or invalid.",
  "ZeroAmount":                       "Amount must be greater than zero.",
  "EmptyString":                      "A required text field is empty.",
  "PlayerDoesNotExist":               "This player does not exist.",
  "PlayerAlreadyRegistered":          "A player with these details is already registered.",
  "FifaIdAlreadyRegistered":          "This FIFA / National ID is already registered to another player.",
  "FifaIdRequired":                   "FIFA / National ID is required to register a player.",
  "NameTooLong":                      "Player name exceeds the maximum length of 64 characters.",
  "CallerIsNotPlayerClub":            "You are not the club that owns this player.",
  "CallerIsNotPlayerWallet":          "You are not the registered wallet for this player.",
  "RegistrarNotAssignedToClub":       "No registrar is assigned to this club.",
  "RegistrarNotRegistered":           "This address does not hold a registrar role.",
  "RegistrarAlreadyRegistered":       "This address is already a registered registrar.",
  "ClubAlreadyRegistered":            "This club is already registered.",
  "ClubNotRegistered":                "This club is not registered.",
  "ClubHasActivePlayers":             "Cannot deregister a club that still has active players.",
  "VerificationAlreadyActive":        "A verification request is already in progress for this player.",
  "HashAlreadyUsed":                  "This document hash is already used by another player.",
  "HashesNotDistinct":                "All document hashes must be unique — duplicate hash detected.",
  "InvalidHashZero":                  "Document hash cannot be zero.",
  "PlayerNotVerified":                "This player must be fully verified before this action.",
  "PlayerAlreadyListed":              "This player is already listed on the market.",
  "PlayerNotListed":                  "This player is not currently listed.",
  "FeeTooHigh":                       "The fee you entered exceeds the maximum allowed.",
  "FeeBpsTooHigh":                    "The fee basis points exceed the maximum of 2000 (20%).",
  "RegistrarFeeTooHigh":              "Your verification fee exceeds 120% of the base verification fee.",
  "NothingToWithdraw":                "No fees available to withdraw.",
  "InsufficientProtocolBalance":      "Insufficient protocol balance for this withdrawal.",
  "NoPendingFeeSchedule":             "No fee schedule update is pending.",
  "FeeScheduleNotReady":              "The fee schedule update is not yet ready — 10-day delay applies.",
  "NoPendingTreasuryUpdate":          "No treasury update is pending.",
  "TreasuryUpdateNotReady":           "The treasury update is not yet ready — 48-hour delay applies.",
  "WalletUpdateAlreadyPending":       "A wallet update is already pending for this player.",
  "NoWalletUpdatePending":            "No wallet update is pending for this player.",
  "WalletUpdateNotReady":             "The 48-hour wallet update timelock has not elapsed yet.",
  "WalletUpdateAlreadySet":           "The new wallet address is the same as the current one.",
  "DirectTransferNotAllowed":         "Player NFTs cannot be transferred directly — use escrow.",

  // ── ProtocolFeeBase ─────────────────────────────────────────────────────────
  "ProtocolFeeTooHigh":               "Protocol fee exceeds the maximum of 20% (2000 bps).",

  // ── TransferEscrow ──────────────────────────────────────────────────────────
  "InvalidAddress":                   "A required address is missing or invalid.",
  "InvalidAmount":                    "An amount is invalid — check all numeric inputs.",
  "InvalidBps":                       "Basis points value is out of the allowed range.",
  "TokenNotApproved":                 "This payment token is not approved by the protocol.",
  "TokenAlreadyApproved":             "This token is already approved.",
  "TokenNotInList":                   "This token is not in the approved list.",
  "TransferWindowClosed":             "The transfer window is currently closed. No transfers are permitted.",
  "PlayerHasActiveOffer":             "This player already has an active transfer offer.",
  "PlayerHasActiveDeal":              "This player is already involved in an active deal.",
  "OfferNotFound":                    "Transfer offer not found.",
  "BidNotFound":                      "Bid not found or no longer active.",
  "WrongDealState":                   "This action is not permitted in the current deal state.",
  "NotSellingClub":                   "Only the selling club can perform this action.",
  "CannotBidOnOwnPlayer":             "You cannot bid on your own player.",
  "MaxNegotiationsReached":           "Maximum number of active negotiations reached for this offer.",
  "MaxNegotiationRoundsReached":      "Maximum negotiation rounds reached — accept or reject the current bid.",
  "NotYourTurnToCounter":             "It is not your turn to counter — waiting for the other party.",
  "BidCanOnlyBeUpdatedWhenNegotiating": "Bids can only be updated when in NEGOTIATING status.",
  "ClubTransferBanned":               "Your club is currently under a transfer ban.",
  "AlreadyHasActiveBid":              "You already have an active bid on this offer.",
  "BanAlreadyActive":                 "This club already has an active transfer ban.",
  "NoBanToLift":                      "This club does not have an active transfer ban.",
  "NoBanToDecrement":                 "This club is not in the banned clubs list.",
  "TooManyAddOns":                    "Maximum of 10 performance add-ons per offer.",
  "TimerTooShort":                    "Timer duration is below the minimum allowed.",
  "DealNotFound":                     "Deal not found.",
  "HijackWindowClosed":               "The hijack window is closed — no more hijack bids accepted.",
  "CannotHijackOwnDeal":              "You cannot hijack a deal you are already party to.",
  "BidNotHighEnough":                 "Hijack bid does not meet the minimum increment requirement.",
  "DealIsFrozen":                     "This deal is currently frozen by the league.",
  "NotBuyingClub":                    "Only the buying club can perform this action.",

  // ── DealEscrow ──────────────────────────────────────────────────────────────
  "NotPlayerWallet":                  "Only the player's registered wallet can perform this action.",
  "PlayerWalletNotSet":               "The player's wallet address has not been set yet.",
  "DealNotFrozen":                    "This deal is not currently frozen.",
  "ConsentWindowExpired":             "The player consent window has expired.",
  "MedicalWindowExpired":             "The medical submission window has expired.",
  "FundingWindowExpired":             "The funding window has expired — deal cannot be funded.",
  "DisputeWindowExpired":             "The dispute window has expired.",
  "MedicalAlreadySubmitted":          "Medical result has already been submitted for this deal.",
  "NothingToClaim":                   "No claimable balance for this token.",
  "NoSigningBonus":                   "This deal has no signing bonus.",
  "SigningBonusAlreadyClaimed":        "The signing bonus has already been claimed.",
  "AddOnNotFound":                    "Performance add-on not found.",
  "AddOnAlreadyTriggered":            "This performance add-on has already been triggered.",
  "MutualCancelAlreadyProposed":      "A mutual cancel proposal is already pending.",
  "MutualCancelNotProposed":          "No mutual cancel proposal is active.",
  "MutualCancelExpiredError":         "The mutual cancel proposal has expired.",
  "CannotConfirmOwnProposal":         "You cannot confirm your own mutual cancel proposal.",
  "SigningBonusNotExpired":           "The signing bonus claim window has not expired yet.",

  // ── LoanEscrow ──────────────────────────────────────────────────────────────
  "LoanNotFound":                     "Loan not found.",
  "LoanNotPending":                   "This loan is not in pending state.",
  "LoanNotActive":                    "This loan is not currently active.",
  "LoanAlreadyActive":                "This player already has an active loan.",
  "DisputeWindowActive":              "The 48-hour dispute window is still active — cannot claim fee yet.",
  "LoanStillActive":                  "The loan has not yet expired.",
  "NotParentClub":                    "Only the parent club can perform this action.",
  "NotBorrowingClub":                 "Only the borrowing club can perform this action.",
  "NotAuthorised":                    "You are not authorised to settle this loan.",
  "LoanFeeAlreadyClaimed":            "The loan fee has already been claimed.",
  "InvalidString":                    "Text input is invalid or too long.",
  "RecallNoticeNotMet":               "The minimum recall notice period (14 days) has not elapsed.",
  "RecallAlreadyRequested":           "A recall has already been requested for this loan.",
  "NoOptionToBuy":                    "This loan does not include an option to buy.",
  "OptionExpired":                    "The option to buy has expired — the loan has ended.",
  "ParentClubMismatch":               "The specified parent club does not own this player.",
  "ParentClubNotRegistered":          "The parent club is not a registered club.",
  "InvalidDuration":                  "Loan duration must be between 30 and 365 days.",
  "InvalidOptionPrice":               "Option price is invalid or missing.",

  // ── SwapEscrow ──────────────────────────────────────────────────────────────
  "SwapNotFound":                     "Swap not found.",
  "NotClubA":                         "Only Club A (the proposing club) can perform this action.",
  "NotClubB":                         "Only Club B can perform this action.",
  "WrongState":                       "This action is not permitted in the current swap state.",
  "PlayerHasActiveProcess":           "One of the players is already involved in another transfer process.",
  "CannotSwapSameClub":               "Cannot propose a swap between players of the same club.",
  "MutualCancelExpired":              "The mutual cancel proposal has expired.",
  "CannotConfirmOwnCancel":           "You cannot confirm your own mutual cancel proposal.",
  "FeesExceed100Pct":                 "Combined fees exceed 100% — reduce agent or protocol fees.",
  "NoPendingTransferEscrowUpdate":    "No transfer escrow update is pending.",
  "TransferEscrowUpdateNotReady":     "Transfer escrow update timelock has not elapsed.",

  // ── FreeTransferEscrow ──────────────────────────────────────────────────────
  "PlayerNotFreeAgent":               "This player is not a free agent.",
  "PlayerAlreadyFreeAgent":           "This player is already a free agent.",
  "ContractNotExpired":               "The player's contract has not yet expired.",
  "TooEarlyForPreContract":           "Cannot propose a pre-contract more than 180 days before contract expiry.",
  "AlreadyProposed":                  "You have already submitted a pre-contract proposal for this player.",
  "PreContractAlreadyActive":         "This player has already signed a pre-contract with another club.",
  "NoActivePreContract":              "No active pre-contract found for this player.",
  "TerminationNotProposed":           "No termination proposal exists for this player.",
  "TerminationAlreadyProposed":       "A termination proposal already exists for this player.",
  "DepositNotLocked":                 "The deposit must be locked before medical can be submitted.",
  "DepositAlreadyLocked":             "The deposit has already been locked.",

  // ── InstallmentEscrow ────────────────────────────────────────────────────────
  "InstallmentNotDue":                "This installment is not due yet.",
  "InstallmentAlreadyPaid":           "This installment has already been paid.",
  "InstallmentNotOverdue":            "This installment is not yet overdue.",
  "InvalidIndex":                     "Installment index is invalid — index 0 is paid at funding.",

  // ── TransferWindow ───────────────────────────────────────────────────────────
  "WindowNotFound":                   "Transfer window not found.",
  "WindowAlreadyClosed":              "This transfer window has already closed.",
  "WindowNotOpen":                    "This transfer window is not yet open.",
  "WindowAlreadyOpen":                "This transfer window is already open.",
  "WindowOverlap":                    "This window overlaps with an existing scheduled window.",
  "InvalidWindowTimes":               "Window open/close times are invalid.",
  "ScheduleTooFarAhead":              "Cannot schedule a window more than 365 days in advance.",
  "WindowTooLong":                    "Window duration exceeds the maximum for its type.",
  "ExtensionTooLong":                 "Extension would exceed the maximum duration for this window type.",
  "ExtensionBeforeClose":             "New close time must be after the current close time.",
  "WindowAlreadySuspended":           "This window is already suspended.",
  "WindowNotSuspended":               "This window is not suspended.",
  "NoActiveWindow":                   "No transfer window is currently open.",

  // ── VerificationManager ──────────────────────────────────────────────────────
  "RegistryPaused":                   "The registry is currently paused. Try again later.",
  "PlayerAlreadyVerified":            "This player is already verified.",
  "NoActiveVerificationRequest":      "No active verification request found for this player.",
  "VerificationDeadlineNotPassed":    "The 72-hour verification window has not yet elapsed.",
  "MedicalNotSubmitted":              "Medical clearance has not been submitted yet.",
  "MedicalAlreadyVerifiedInRequest":  "Medical clearance has already been verified in this request.",
  "MedicalNotVerifiedInRequest":      "Medical clearance must be verified before final sign-off.",
  "LegalDocsNotSubmitted":            "Legal documents have not been submitted yet.",
  "LegalAlreadyVerifiedInRequest":    "Legal documents have already been verified in this request.",
  "LegalDocsNotVerifiedInRequest":    "Legal documents must be verified before final sign-off.",
  "CallerIsNotAssignedRegistrar":     "Only the registrar assigned to this club can perform verification.",

  // ── TerminationManager ───────────────────────────────────────────────────────
  "NotPlayerClub":                    "Only the player's current club can perform this action.",
  "NotLeagueRole":                    "Only a league authority can perform this action.",
  "NotPlayerRegistry":                "This function can only be called by the PlayerRegistry.",
  "PlayerIsListed":                   "The player must be delisted before proposing termination.",
  "NoProposal":                       "No termination proposal exists for this player.",
  "ProposalAlreadyExists":            "A termination proposal already exists for this player.",
  "NotMutualProposal":                "This is not a mutual termination proposal.",
  "NotUnilateralProposal":            "This is not a unilateral termination proposal.",
  "NotDisputedProposal":              "This proposal is not in disputed state.",
  "CallerCannotDispute":              "You are not the opposing party — only the other side can dispute.",
  "DisputeWindowOpen":                "The dispute window is still open — wait for it to close.",
  "DisputeWindowClosed":              "The dispute window has closed — cannot dispute now.",

  // ── Access control ───────────────────────────────────────────────────────────
  "AccessControlUnauthorizedAccount": "Your wallet does not have the required role for this action.",
};

// ─── Build selector → error name map from all ABIs at module load time ────────

const SELECTOR_MAP: Record<string, string> = {};

function buildSelectorMap() {
  const allAbis = [
    PlayerRegistryABI.abi, TransferEscrowABI.abi, DealEscrowABI.abi,
    LoanEscrowABI.abi, SwapEscrowABI.abi, FreeTransferEscrowABI.abi,
    InstallmentEscrowABI.abi, TransferWindowABI.abi,
    VerificationManagerABI.abi, TerminationManagerABI.abi,
  ];
  for (const abi of allAbis) {
    for (const item of abi as any[]) {
      if (item.type !== "error") continue;
      try {
        const inputs = (item.inputs ?? []).map((i: any) => i.type).join(",");
        const sig    = `${item.name}(${inputs})`;
        const selector = ethers.id(sig).slice(0, 10);
        SELECTOR_MAP[selector] = item.name;
      } catch {}
    }
  }
}

buildSelectorMap();

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseError(err: any): string {
  // I walk common error data locations — ethers v6 nests errors differently
  // depending on whether it came from a call, a transaction, or an event
  const candidates = [
    err?.data,
    err?.error?.data,
    err?.info?.error?.data,
    err?.cause?.data,
  ];

  for (const data of candidates) {
    if (typeof data === "string" && data.length >= 10) {
      const selector = data.slice(0, 10).toLowerCase();
      const name     = SELECTOR_MAP[selector];
      if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];
      if (name) return `Contract error: ${name.replace(/([A-Z])/g, " $1").trim()}.`;
    }
  }

  // I check reason string next — some RPC providers surface this instead of data
  const reason = err?.reason ?? err?.error?.reason ?? err?.cause?.reason ?? "";
  if (reason) {
    // Exact name match first
    if (ERROR_MESSAGES[reason]) return ERROR_MESSAGES[reason];
    // Substring match for message map
    const lowerReason = reason.toLowerCase();
    for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
      if (lowerReason.includes(key.toLowerCase())) return msg;
    }
    return reason;
  }

  // I check message string last
  const message = err?.message ?? "";
  if (message.includes("user rejected") || message.includes("User rejected"))
    return "Transaction cancelled.";
  if (message.includes("insufficient funds"))
    return "Insufficient funds to cover gas fees.";
  if (message.includes("nonce too low"))
    return "Wallet nonce error — clear pending transactions and retry.";
  if (message.includes("replacement fee too low"))
    return "Gas price too low. Please retry.";
  if (message.includes("network") || message.includes("timeout"))
    return "Network error — check your connection and try again.";

  return "Transaction rejected by the contract. Check all inputs and try again.";
}
