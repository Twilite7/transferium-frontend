import PlayerRegistryABI from './PlayerRegistry.json'
import TransferEscrowABI from './TransferEscrow.json'
import DealEscrowABI from './DealEscrow.json'
import LoanEscrowABI from './LoanEscrow.json'

export const CONTRACTS = {
  PlayerRegistry:     '0x5212d6719883a45B4Cc1Fb32Ab04EC1c5ABdb200',
  TransferWindow:     '0xC10d13f05B88310445d5f223777df2B534065c22',
  TransferEscrow:     '0x8107b9796cFc4Cc23E2580aF1B9A2e7b9d56Ec5F',
  DealEscrow:         '0xB6fFEad3449AB3F4c0cf82D2a634B649Ddf5725f',
  LoanEscrow:         '0xA75845eD1477E096B0a6B1934F04Ff7Db967BcE5',
  ReleaseEscrow:      '0x619225A03e367E3CFdae6aaf591855b07bFbcc8D',
  SwapEscrow:         '0xf7d3376207Eb23AbEfB20D3B9495299911E1EBBc',
  FreeTransferEscrow: '0x859103422a71c18c9291AE6A3a37D2Dae80f418b',
  InstallmentEscrow:  '0x4089cd34051ad62E81bd0003Cf368d3315b25A21',
  AddressRegistry:    '0x6567dd5C319C5eD6A61E89097c7604f2C001a899',
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


