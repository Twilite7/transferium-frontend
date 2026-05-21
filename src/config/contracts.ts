import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI from './DealEscrow.json'
import LoanEscrowABI from './LoanEscrow.json'
import ReleaseEscrowABI from './ReleaseEscrow.json'
import InstallmentEscrowABI from './InstallmentEscrow.json'

export const CONTRACTS = {
  PlayerRegistry:     '0x4EB83Ae9092b154fB87C5c17632b3aa181AD3201',
  TransferWindow:     '0xFDeF88d4073b36976dbcBF13c812b590bcffaAAe',
  TransferEscrow:     '0xc148D3E4ec72fc2371f995Ff5114DE09103e6fe2',
  DealEscrow:         '0x1f941e76C06980ABc928895e9a2F5E3adA1729AC',
  LoanEscrow:         '0x40fad970562F8EB135dbB5869CA05a59a8123704',
  ReleaseEscrow:      '0xf4d8c1dcdf84C3bf713AF8Cb8B861c2bc8a2792B',
  SwapEscrow:         '0x83BAaF9A5BB5a1bC5B08dBBa351e2a7f566035C0',
  FreeTransferEscrow: '0x6F2598751FfE9C51267ab4c53ffB76fA80F3eF4F',
  InstallmentEscrow:  '0xD97F998Ef6446e757754909A2051819840cCD393',
  AddressRegistry:    '0xf994c971cC6003B2D7E50dFd9126AdAa08250c90',
  eurcAddress:        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  usdcAddress:        '0x3600000000000000000000000000000000000000',
}

export const playerRegistry = {
  address: CONTRACTS.PlayerRegistry,
  abi: PlayerRegistryABI.abi,
}

export const PLAYER_REGISTRY_ABI = PlayerRegistryABI.abi
export const TRANSFER_ESCROW_ABI = TransferEscrowABI.abi
export const DEAL_ESCROW_ABI     = DealEscrowABI.abi
export const LOAN_ESCROW_ABI     = LoanEscrowABI.abi
export const RELEASE_ESCROW_ABI  = ReleaseEscrowABI.abi
export const INSTALLMENT_ESCROW_ABI = InstallmentEscrowABI.abi

export const ARC_TESTNET = {
  chainId:  5042002,
  name:     'ARC Testnet',
  rpcUrl:   'https://rpc.testnet.arc.network',
  currency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  explorer: 'https://explorer.testnet.arc.network',
}

export const EURC_ADDRESS = CONTRACTS.eurcAddress
export const USDC_ADDRESS = CONTRACTS.usdcAddress

export const ipfsUrl = (cid: string) =>
  cid ? `https://ipfs.io/ipfs/${cid}` : ''

export const dealEscrowContract = {
  address: CONTRACTS.DealEscrow as `0x${string}`,
  abi: DealEscrowABI.abi,
}

export const loanEscrowContract = {
  address: CONTRACTS.LoanEscrow as `0x${string}`,
  abi: LoanEscrowABI.abi,
}

export const playerRegistryContract = {
  address: CONTRACTS.PlayerRegistry as `0x${string}`,
  abi: PlayerRegistryABI.abi,
}

export const transferEscrowContract = {
  address: CONTRACTS.TransferEscrow as `0x${string}`,
  abi: TransferEscrowABI.abi,
}

export const transferWindowContract = {
  address: CONTRACTS.TransferWindow as `0x${string}`,
  abi: [] as const,
}
