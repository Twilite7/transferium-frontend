// I import all ABIs from artifact JSON files — no hardcoded signatures.
// To update an ABI: copy the artifact JSON from transferium-contracts/artifacts and rebuild.

import PlayerRegistryJSON      from './PlayerRegistry.json'
import TransferEscrowJSON      from './TransferEscrow.json'
import DealEscrowJSON          from './DealEscrow.json'
import LoanEscrowJSON          from './LoanEscrow.json'
import ReleaseEscrowJSON       from './ReleaseEscrow.json'
import InstallmentEscrowJSON   from './InstallmentEscrow.json'
import SwapEscrowJSON          from './SwapEscrow.json'
import FreeTransferEscrowJSON  from './FreeTransferEscrow.json'
import TransferWindowJSON      from './TransferWindow.json'
import VerificationManagerJSON from './VerificationManager.json'
import TerminationManagerJSON  from './TerminationManager.json'

export const PLAYER_REGISTRY_ABI      = PlayerRegistryJSON.abi
export const TRANSFER_ESCROW_ABI      = TransferEscrowJSON.abi
export const DEAL_ESCROW_ABI          = DealEscrowJSON.abi
export const LOAN_ESCROW_ABI          = LoanEscrowJSON.abi
export const RELEASE_ESCROW_ABI       = ReleaseEscrowJSON.abi
export const INSTALLMENT_ESCROW_ABI   = InstallmentEscrowJSON.abi
export const SWAP_ESCROW_ABI          = SwapEscrowJSON.abi
export const FREE_TRANSFER_ESCROW_ABI = FreeTransferEscrowJSON.abi
export const TRANSFER_WINDOW_ABI      = TransferWindowJSON.abi
export const VERIFICATION_MANAGER_ABI = VerificationManagerJSON.abi
export const TERMINATION_MANAGER_ABI  = TerminationManagerJSON.abi

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
] as const
