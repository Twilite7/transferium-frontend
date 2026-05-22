import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI from './DealEscrow.json'
import LoanEscrowABI from './LoanEscrow.json'
import ReleaseEscrowABI from './ReleaseEscrow.json'
import InstallmentEscrowABI from './InstallmentEscrow.json'

export const CONTRACTS = {
  PlayerRegistry:     '0x205C2d831B4eBd4f8ecbf3cf7628B9F9bE60B232',
  TransferWindow:     '0x5e5Fe5DA0e91a11995c3D7BC4b5457075D0D3db1',
  TransferEscrow:     '0x8C68349715CC34FDe28903dD941CB5b2A9CD9037',
  DealEscrow:         '0x7540f69B5DE9b5c743EE015d152849eFAb42b9d2',
  LoanEscrow:         '0x190E4D830a1562DD0FcBa0b168432960147C2699',
  ReleaseEscrow:      '0x2Bf5d25a0D10F0e215de1c9f590d01fFF1F932bC',
  SwapEscrow:         '0x7BC8F477092fF16a1c2C9204075Efc5fFE038C38',
  FreeTransferEscrow: '0xaC30174902380de5a9EF539B771DC94776dEEbB8',
  InstallmentEscrow:  '0xE6499A004b741626170Cfa9d882a8e6822eEC927',
  AddressRegistry:    '0xEf40F3425f40BE06419fC1bfB0b1590A723Ec57D',
  eurcAddress:        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  usdcAddress:        '0x3600000000000000000000000000000000000000',
}

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

export const playerRegistry = {
  address: CONTRACTS.PlayerRegistry as `0x${string}`,
  abi: PlayerRegistryABI.abi,
}

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

export const PLAYER_REGISTRY_ABI = PlayerRegistryABI.abi
export const TRANSFER_ESCROW_ABI = TransferEscrowABI.abi
export const DEAL_ESCROW_ABI     = DealEscrowABI.abi
export const LOAN_ESCROW_ABI     = LoanEscrowABI.abi
export const RELEASE_ESCROW_ABI  = ReleaseEscrowABI.abi
export const INSTALLMENT_ESCROW_ABI = InstallmentEscrowABI.abi
