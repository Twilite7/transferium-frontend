const ERROR_CODES: Record<string, string> = {
  "0xee457142": "A player with this name is already registered by your club.",
  "0x118cdaa7": "You are not authorised to perform this action.",
  "0x5863f789": "This document hash has already been used for another player.",
  "0x6697b232": "Player does not exist.",
  "0xe450d38c": "Insufficient balance to complete this transaction.",
  "0xfb8f41b2": "Transfer window is currently closed.",
  "0xd93c0665": "Medical clearance has already been set for this player.",
  "0x82b42900": "You are not the owner of this player.",
};

const MESSAGE_MAP: Record<string, string> = {
  "missing revert data":           "Transaction failed — the contract rejected this action.",
  "Transaction not confirmed":     "Transaction timed out. Please check your wallet and try again.",
  "user rejected":                 "Transaction cancelled.",
  "User rejected":                 "Transaction cancelled.",
  "insufficient funds":            "Insufficient funds in your wallet to cover gas fees.",
  "nonce too low":                 "Wallet nonce error. Please clear pending transactions in your wallet and retry.",
  "replacement fee too low":       "Gas price too low. Please retry.",
  "already verified":              "This player is already verified.",
  "already cleared":               "Medical clearance has already been set for this player.",
  "documents already verified":    "Legal documents are already verified.",
  "window not open":               "The transfer window is currently closed.",
  "not the owner":                 "You do not own this player.",
  "reverted":                      "Transaction rejected by the contract. Check all inputs and try again.",
};

export function parseError(err: any): string {
  // Check error data code first
  const data = err?.data ?? err?.error?.data ?? err?.info?.error?.data;
  if (data && ERROR_CODES[data]) return ERROR_CODES[data];

  // Check reason string
  const reason = err?.reason ?? err?.error?.reason ?? "";
  if (reason) {
    for (const [key, msg] of Object.entries(MESSAGE_MAP)) {
      if (reason.toLowerCase().includes(key.toLowerCase())) return msg;
    }
    return reason;
  }

  // Check message string
  const message = err?.message ?? "";
  for (const [key, msg] of Object.entries(MESSAGE_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return msg;
  }

  return "Something went wrong. Please try again.";
}
