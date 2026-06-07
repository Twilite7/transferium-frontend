import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0x218b8d89627Ee2bBf56e3Da1717F908f0E07A27e',
  TransferWindow:      '0x626A7649441fe21bf8298A1Bf153FC299AF98884',
  TransferEscrow:      '0x4DC7369f7fAEb69ccE048e4D3b59BB8244865cCB',
  DealEscrow:          '0xe57fFA169A62A3260932cC9Cc26e684766121aF3',
  LoanEscrow:          '0xC1727db63042dB62C2731cB405E839AdC179F05F',
  SwapEscrow:          '0xfE57734B3Ecee995Ea79b3855941B91da175800B',
  FreeTransferEscrow:  '0xe3d4CE8d057BF6e92606b5fdd504f335691b66D5',
  InstallmentEscrow:   '0x97856D1c99d981A95f737457AAc9d5006DA66EFB',
  AddressRegistry:     '0x69Ac5c37047e80AdD1905A1f8035f34aD6E0B063',
  VerificationManager: '0x13B797D6d782F000594145144Ad7d26747F1DFcf',
  TerminationManager:  '0xe09D0dD466FF3519968b8e537C88881D661f7d68',
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
