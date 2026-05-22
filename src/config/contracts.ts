import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI from './DealEscrow.json'
import LoanEscrowABI from './LoanEscrow.json'
import ReleaseEscrowABI from './ReleaseEscrow.json'
import InstallmentEscrowABI from './InstallmentEscrow.json'

export const CONTRACTS = {
  PlayerRegistry:     '0xbE8d243C435796ee8f716CE34B5f76866E909f64',
  TransferWindow:     '0x6ddAf820C527135B8848EBb13A7445A1c215Eb72',
  TransferEscrow:     '0x07B2641dc6390e2cE93b3fB913c706c7F4b3F05A',
  DealEscrow:         '0x7c198AC82F746464fEA6aFa362e996Be916344Dd',
  LoanEscrow:         '0x242237EFA475459C950328D311A8C72C891A18B2',
  ReleaseEscrow:      '0x7c0172C10e8D6Fa8ea22E7607527Dca981a0d61d',
  SwapEscrow:         '0xE905bf3D33242fd9f1423B7D239689Bfb30C718f',
  FreeTransferEscrow: '0x3E26181BB5e9E10076C8755e61B69de9afAD01cA',
  InstallmentEscrow:  '0x9204A5dc48D8f377b507926b492037c048d46A75',
  AddressRegistry:    '0x18fA208be489704f42e1602691f08207eAa34631',
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
