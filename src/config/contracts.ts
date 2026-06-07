import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0xD79b972d68989f5F98b76a6bbCFFb4Cf0D79D19d',
  TransferWindow:      '0x29607Fa2B4D0c52a656d2517a20439c0c7A35e41',
  TransferEscrow:      '0x229181C7Ad498282E2797D6dC0dB78feE5c994e7',
  DealEscrow:          '0xE1019d66FF30ecF9E56BbFF504Df0a5758284EBC',
  LoanEscrow:          '0x5218Faf38c82E90cb181F50Fa446Fef5A65b77E4',
  SwapEscrow:          '0xff8Bc18f250ccA5142d82307Ecf1182E21274A39',
  FreeTransferEscrow:  '0x0803E2A0eA1931b5d5F7CFaEAA007D4cDaF3Fe2E',
  InstallmentEscrow:   '0xd8B7b788CDF14AC17C52f7c336EF55F124f72066',
  AddressRegistry:     '0x5A8CF5ff05481c63C5c2fDa92641DC7E5e501b27',
  VerificationManager: '0xf96E16151616cBafe64E08b58B9A369e1D69D0e1',
  TerminationManager:  '0x007f2Ccdba87095b813689885686e580bb20ba4E',
  eurcAddress:         '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  usdcAddress:         '0x3600000000000000000000000000000000000000',
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
