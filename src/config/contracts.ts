import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI     from './DealEscrow.json'
import LoanEscrowABI     from './LoanEscrow.json'
import TransferWindowABI from './TransferWindow.json'
import ReleaseEscrowABI  from './ReleaseEscrow.json'

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
  PlayerRegistry: '0x8576FC8d9c33B5fD9f1560BB17F240D20F37a043',
  TransferWindow: '0x688b98f7d27d5F4f709c79CeDCE06608C83c489e',
  LoanEscrow:     '0x51D43F719EE2A75D5097D7bcB4E5454Ff9dF285A',
  DealEscrow:     '0x850bdb0bd765ad282Acf05cD3045185c5237F530',
  TransferEscrow: '0x29Adf04B6495C1fea5C3303B4ae26CcA76C8C32B',
  ReleaseEscrow:  '0xBEB694f9872D38B11Eb130671a38f468221dD040',
  SwapEscrow:     '0x814ADC38204b0565cFd9331EFD681076c78832BA',
  FreeTransfer:   '0xc908EF3503581d183eae9721025860f84D15CFF6',
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
export const TRANSFER_WINDOW_ABI = TransferWindowABI.abi

// ─── IPFS helper ──────────────────────────────────────────────────────────────
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export function ipfsUrl(cid: string): string {
  if (!cid) return ''
  const bare = cid.replace('ipfs://', '')
  return `${IPFS_GATEWAY}/${bare}`
}
