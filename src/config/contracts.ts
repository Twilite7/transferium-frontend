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
  PlayerRegistry: '0xE4FC0791dee7607d0Ba86DB6407091e6e3aDA653',
  TransferWindow: '0xefF8d17a2569338bbFFFa67E43Efd1d749aEEDb1',
  InstallmentEscrow: '0xdB7A293DCBb26c93831B9a6B81f286FA9B4E34a2',
  LoanEscrow:     '0xE2902A960A95Ce78edf02d1b8e32dceE78f911Be',
  DealEscrow:     '0x75cE6231E68455fe32FB3D59Ad4ca422dDE935e3',
  TransferEscrow: '0x117AfF9660c2f0A577fd48b8190a4c8cE516570c',
  ReleaseEscrow:  '0x807D1Dcbf099FB4B7ef047374a62E617f83A9D8c',
  SwapEscrow:     '0x90A5112cB55422DA458708F5C8463cEdac354888',
  FreeTransfer:   '0xDBfB821513032B2b38971a89C7A27D32a43e7Aa9',
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
