import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI from './DealEscrow.json'
import LoanEscrowABI from './LoanEscrow.json'
import TransferWindowABI from './TransferWindow.json'

export const CONTRACTS = {
  PlayerRegistry:     '0xFA8dCb6f0DB181DD9400888a1e0874Ebba94D7bA',
  TransferWindow:     '0x176971dcb37e6A482A010FDa73cCd2a4115a0466',
  TransferEscrow:     '0x7eAD7C571A243FDDe26F18b46deD8cF2c665fE1d',
  DealEscrow:         '0x448a0D5B3D3F121141ebd0d388788ef6BBD50182',
  LoanEscrow:         '0x881E98E84FfB974EfFF4E8ae3Fa4e285b57E681A',
  ReleaseEscrow:      '0x9396C22C9086247273Fc6111351E2BaB31F631eD',
  SwapEscrow:         '0x3f68D5c4265AE7593Cd454864e56af0b2725D668',
  FreeTransferEscrow: '0xB9479Acb0486aAe1e0f03713bfd5F301A8096A92',
  InstallmentEscrow:  '0xE8EBDc6b7a400C24eD215C0831eA3e4d4a1FBfF9',
  AddressRegistry:    '0x36004ef9D7C2399a521D8445124A80B27Ccc8B64',
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
  abi: TransferWindowABI.abi,
}
