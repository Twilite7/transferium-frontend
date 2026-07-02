import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0xA19EaB3846cf21eB84FA81548A513eB6a95c460a',
  TransferWindow:      '0x249fc9Ec8f49b253b282e1Db088Fa6d4B2d60260',
  TransferEscrow:      '0xF5aB421b2B0824B663100F8cCd76A3fa5e594f74',
  DealEscrow:          '0x06349A38A0B005cB65bC8a546537Fc9504Ee4213',
  LoanEscrow:          '0xE54D5db9EFf8149696f673aBE133419382D82788',
  ReleaseEscrow:       '0x696917ECa0bfA6D3231aaFB7C1D594ca993a11fE',
  SwapEscrow:          '0xdEd296211CD519Ba81dAc28aBb8115897b533B7F',
  FreeTransferEscrow:  '0xaa532b89dEFA9742B25D924C812A510933FFF5b6',
  InstallmentEscrow:   '0xbA92c0D40572CD64196a4eE64aF2b22AdadE088B',
  AddressRegistry:     '0x17CdB99260243A034886d05a2F2a75f43A48DcE5',
  VerificationManager: '0xfA6a7155F66D2193aefc2ee3ec671C9e6668A518',
  TerminationManager:  '0xcE21612cF77ec21221d124ad2990A831DdAd1497',
  CompetingBidManager: '0x3944C810fCb33B91Eb73d0F054aE9065F2d3E40B',
}

export const ARC_TESTNET = {
  chainId:  5042002,
  name:     'ARC Testnet',
  rpcUrl:   'https://rpc.testnet.arc.network',
  currency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  explorer: 'https://explorer.testnet.arc.network',
}

export const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

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
  abi: TransferWindowABI.abi,
}

export const verificationManagerContract = {
  address: CONTRACTS.VerificationManager as `0x${string}`,
  abi: VerificationManagerABI.abi,
}

export const terminationManagerContract = {
  address: CONTRACTS.TerminationManager as `0x${string}`,
  abi: TerminationManagerABI.abi,
}
