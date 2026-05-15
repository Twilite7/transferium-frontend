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
  PlayerRegistry: '0xAe7e07e3623448A918198DDF68D0C788A9c86636',
  TransferWindow: '0xEE2E27e68C3425831964F4333BB252CEdf4F56b0',
  InstallmentEscrow: '0xdB7A293DCBb26c93831B9a6B81f286FA9B4E34a2',
  LoanEscrow:     '0x022DfeE75f882489BA63578fc3fcCc05782A470d',
  DealEscrow:     '0x715651035d9a5e5d455263AA468Adce0eaA9519a',
  TransferEscrow: '0xEf74E315296B65ffCF04e66B96cc1Ffa35CBeDCD',
  ReleaseEscrow:  '0xF39F9E1d1d59319BF3072caE0eE21CC32b06a538',
  SwapEscrow:     '0x31EF01A198d3135CAf088c66fa430a0aA97dEa7B',
  FreeTransfer:   '0xe8FFB277EE1C72a035F69D098e3E6A179a277974',
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
