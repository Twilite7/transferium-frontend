import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0x21962C5548aeD0Ca83c8a1Bf051FE221CB9De4f9',
  TransferWindow:      '0x048E504ed771DD72cAca4B79d8bbC1C43649662d',
  TransferEscrow:      '0x51e3237CE5f3322E90AF329D0d39eD5dCB03f8F0',
  DealEscrow:          '0xC81139b1732D7275097cA05055fDF8470Bb34a14',
  LoanEscrow:          '0xe1D50021fF4b2C155eE6fEe07C785f9507BB5d14',
  ReleaseEscrow:       '0x2069741BC4190d5444306F8e8798c9352FA769ee',
  SwapEscrow:          '0x958E48752131d8ef4EE38620A864574c98ED635f',
  FreeTransferEscrow:  '0x3B3730E3270445145A977E487970e26fCf0527F6',
  InstallmentEscrow:   '0x803ac6659f62975ba5eD8818095d1C2deb02DF94',
  AddressRegistry:     '0x70211186b986E1310cD5C24Cac1b8C9f3E42582C',
  VerificationManager: '0x49044F608DDCaC27FdD1Ca5B7689D0C7a7B63A99',
  TerminationManager:  '0x627ad24CF247Fd9F88Ad464f1bcF6FD658C2CB3E',
  CompetingBidManager: '0x044C4814B4c86093CBf39E9816705f8E3d392041',
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
