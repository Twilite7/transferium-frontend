import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI     from './DealEscrow.json'
import LoanEscrowABI     from './LoanEscrow.json'
import TransferWindowABI from './TransferWindow.json'
import ReleaseEscrowABI  from './ReleaseEscrow.json'

// ─── Chain ────────────────────────────────────────────────────────────────────
// I keep chain config here so useWallet and wagmi both pull from one place
export const ARC_TESTNET = {
  chainId:         9998,
  name:            'Arc Testnet',
  rpcUrl:          'https://rpc.testnet.arc.network',
  explorer:        'https://explorer.testnet.arc.network',
  currency:        { name: 'ARC', symbol: 'ARC', decimals: 18 },
} as const

// ─── Addresses ────────────────────────────────────────────────────────────────
// I export both shapes — CONTRACTS for existing ethers.js pages,
// CONTRACT_ADDRESSES for new wagmi hooks
export const CONTRACTS = {
  PlayerRegistry: '0x7094A42f3a39a3aa3D1d03c47D08585B9F42ee35',
  TransferWindow: '0xc1c2333c5Ab47f565C695FCff47147E372039871',
  LoanEscrow:     '0x88a8C095Da35B3Def435FA0C1eCb252A9c063BF3',
  DealEscrow:     '0xCbCa09C398A08c5E432279a4953d389d0C0D85ca',
  TransferEscrow: '0x56e388a296b3178fA6ABE94E41CD914023bbA26e',
  ReleaseEscrow:  '0x0000000000000000000000000000000000000000',
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
