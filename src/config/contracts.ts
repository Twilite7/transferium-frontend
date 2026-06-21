import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0x2bc403A55Bc895AbaD40F912eE43a01D6Aad8767',
  TransferWindow:      '0x2239C32005c591d3513B89dC3D94B801C29BB485',
  TransferEscrow:      '0x1bA3D6557dA3A6a861b2D27596c3c22A75c6c535',
  DealEscrow:          '0x16FA8AD457C9aA5A65E1b6bfffb21E87740c909C',
  LoanEscrow:          '0x31D53d055D18c5748D4E5329975677b6bE5B6B52',
  SwapEscrow:          '0xd6555dcB6F500f933ccF72a2CA470F5516B60BEC',
  FreeTransferEscrow:  '0xC5A0fb7EA7f62F5891069557a268F44b7FB3307c',
  InstallmentEscrow:   '0x86A14BFf619CEedF67910fC11aD883150FEC3434',
  AddressRegistry:     '0xE416d5DC35358B3a9B62A0bE93D82Af1e1B3a238',
  VerificationManager: '0x558CdD5e95450CD371a17E86FB7338569a7B0b07',
  TerminationManager:  '0x9C3151a9C3063342f1FA3148d7CCBA863e2fE3C9',
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
