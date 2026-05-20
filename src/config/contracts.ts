import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI     from './DealEscrow.json'
import LoanEscrowABI     from './LoanEscrow.json'
import TransferWindowABI from './TransferWindow.json'
import ReleaseEscrowABI      from './ReleaseEscrow.json'
import InstallmentEscrowABI  from './InstallmentEscrow.json'

// ─── Chain ────────────────────────────────────────────────────────────────────
// I keep chain config here so useWallet and wagmi both pull from one place
export const ARC_TESTNET = {
  chainId:         5042002,
  name:            'Arc Testnet',
  rpcUrl:          'https://rpc.testnet.arc.network',
  explorer:        'https://testnet.arcscan.app',
  currency:        { name: 'USDC', symbol: 'USDC', decimals: 6 },
} as const

// ─── Addresses ────────────────────────────────────────────────────────────────
// I export both shapes — CONTRACTS for existing ethers.js pages,
// CONTRACT_ADDRESSES for new wagmi hooks
export const CONTRACTS = {
  PlayerRegistry: '0x1aFCB3929E653ACdaCfDeAf2CfcfF083B194F962',
  TransferWindow: '0xe27785f3Be6201321fd83ee0Bf2a81FADDA754d8',
  InstallmentEscrow: '0x3420e21dD51e9e15DB23a5105681187e68B1fAb7',
  LoanEscrow:     '0x14c296D7464CaFe8f8bA7Ac22739b9B2e359D865',
  DealEscrow:     '0x9Faade3f7916D40dB55121CeFD789F048CAC7c06',
  TransferEscrow: '0x04B223438101cE75e07806A9b3accDc978a9df5B',
  ReleaseEscrow:  '0xf1ce6CC66A5cE8Cae8d0f73Ee57027AdfD2F0c2F',
  SwapEscrow:     '0xFF91DD3F2EA8163F59e7e42C73142c88Ed4904A9',
  FreeTransfer:   '0xB041De08cB226d2db648f3D944D3B8E6b1B10D21',
} as const

export const CONTRACT_ADDRESSES = {
  playerRegistry: CONTRACTS.PlayerRegistry,
  transferWindow: CONTRACTS.TransferWindow,
  loanEscrow:     CONTRACTS.LoanEscrow,
  dealEscrow:     CONTRACTS.DealEscrow,
  transferEscrow: CONTRACTS.TransferEscrow,
  releaseEscrow:  CONTRACTS.ReleaseEscrow,
} as const

// ─── EURC token address on Arc testnet ───────────────────────────────────────
export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' // EURC on Arc testnet

// ─── Contract config objects for wagmi hooks (address + abi) ─────────────────
export const playerRegistryContract = {
  address: CONTRACT_ADDRESSES.playerRegistry as `0x${string}`,
  abi: PlayerRegistryABI.abi,
} as const

export const transferEscrowContract = {
  address: CONTRACT_ADDRESSES.transferEscrow as `0x${string}`,
  abi: TransferEscrowABI.abi,
} as const

export const dealEscrowContract = {
  address: CONTRACT_ADDRESSES.dealEscrow as `0x${string}`,
  abi: DealEscrowABI.abi,
} as const

export const loanEscrowContract = {
  address: CONTRACT_ADDRESSES.loanEscrow as `0x${string}`,
  abi: LoanEscrowABI.abi,
} as const

export const transferWindowContract = {
  address: CONTRACT_ADDRESSES.transferWindow as `0x${string}`,
  abi: TransferWindowABI.abi,
} as const

export const releaseEscrowContract = {
  address: CONTRACT_ADDRESSES.releaseEscrow as `0x${string}`,
  abi: ReleaseEscrowABI.abi,
} as const

// ─── ABIs (for existing ethers.js pages) ─────────────────────────────────────
export const PLAYER_REGISTRY_ABI = PlayerRegistryABI.abi
export const TRANSFER_ESCROW_ABI = TransferEscrowABI.abi
export const DEAL_ESCROW_ABI     = DealEscrowABI.abi
export const LOAN_ESCROW_ABI     = LoanEscrowABI.abi
export const TRANSFER_WINDOW_ABI    = TransferWindowABI.abi
export const INSTALLMENT_ESCROW_ABI = InstallmentEscrowABI.abi

// ─── IPFS helper ──────────────────────────────────────────────────────────────
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export function ipfsUrl(cid: string): string {
  if (!cid) return ''
  const bare = cid.replace('ipfs://', '')
  return `${IPFS_GATEWAY}/${bare}`
}
