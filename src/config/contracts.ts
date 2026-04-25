import addresses from "./addresses.json";

export const CONTRACTS = {
  PlayerRegistry: addresses.PlayerRegistry as `0x${string}`,
  TransferWindow: addresses.TransferWindow as `0x${string}`,
  TransferEscrow: addresses.TransferEscrow as `0x${string}`,
  LoanEscrow:     addresses.LoanEscrow     as `0x${string}`,
} as const;

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as `0x${string}`;
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as `0x${string}`;

export const PRIMARY_PAYMENT_TOKEN = EURC_ADDRESS;
export const PRIMARY_CURRENCY_SYMBOL = "€";

export const ARC_TESTNET = {
  chainId:  5042002,
  name:     "Arc Testnet",
  rpcUrl:   "https://arc-testnet.g.alchemy.com/v2/Sc8Pdqrfm6g-QWJFld1xG",
  currency: "ETH",
} as const;
