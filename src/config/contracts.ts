import PlayerRegistryABI       from './PlayerRegistry.json'
import TransferEscrowABI       from './TransferEscrow.json'
import DealEscrowABI           from './DealEscrow.json'
import LoanEscrowABI           from './LoanEscrow.json'
import TransferWindowABI       from './TransferWindow.json'
import VerificationManagerABI  from './VerificationManager.json'
import TerminationManagerABI   from './TerminationManager.json'

export const CONTRACTS = {
  PlayerRegistry:      '0x52D4fb88747d1A5d5af7FBd700578F9F593Bfb58',
  TransferWindow:      '0xBbD8bE3ff066dE106F63B01c80b1adb753133805',
  TransferEscrow:      '0x15335cc9734F162bF2784543da8612B93a1E297E',
  DealEscrow:          '0x11b992809977711B3720a4e4Df3c80213761F463',
  LoanEscrow:          '0x09C9740568553Ae65F1A0117a31f323f00b4daa2',
  SwapEscrow:          '0xAaCED43F2427a319Daf31B2B84b80D6113F96EF4',
  FreeTransferEscrow:  '0x82E3eBA9A029dA2BAbA23eda1cF54eBbAb7dC716',
  InstallmentEscrow:   '0x7b030198c500Ed573C884FFac9573B7502412884',
  AddressRegistry:     '0x39840bc67220BE5bD54aC487668fba6e341dAD90',
  VerificationManager: '0x0ad1c42A82502157C05C68c2673dCaab00Df5EeC',
  TerminationManager:  '0xDe22463F3C64b9681Fd5Bf18d62235E8529737a7',
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
