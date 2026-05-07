import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { loanEscrowContract } from '../config'

// ─── Read: get a loan ─────────────────────────────────────────────────────────
export function useLoan(loanId: bigint | undefined) {
  return useReadContract({
    ...loanEscrowContract,
    functionName: 'getLoan',
    args: loanId ? [loanId] : undefined,
    query: { enabled: !!loanId },
  })
}

// ─── Read: active loan for a player ──────────────────────────────────────────
export function useActivePlayerLoan(playerId: bigint | undefined) {
  return useReadContract({
    ...loanEscrowContract,
    functionName: 'getActivePlayerLoan',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: claimable balance in LoanEscrow ────────────────────────────────────
export function useLoanClaimable(
  account: `0x${string}` | undefined,
  token: `0x${string}` | undefined
) {
  return useReadContract({
    ...loanEscrowContract,
    functionName: 'getClaimable',
    args: account && token ? [account, token] : undefined,
    query: { enabled: !!account && !!token },
  })
}

// ─── Write: create a loan deal ───────────────────────────────────────────────
export function useCreateLoan() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function createLoan(params: {
    playerId: bigint
    parentClub: `0x${string}`
    paymentToken: `0x${string}`
    loanFee: bigint
    loanDuration: bigint
    hasOptionToBuy: boolean
    optionPrice: bigint
  }) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'createLoan',
      args: [
        params.playerId,
        params.parentClub,
        params.paymentToken,
        params.loanFee,
        params.loanDuration,
        params.hasOptionToBuy,
        params.optionPrice,
      ],
    })
  }

  return { createLoan, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: cancel a pending loan ────────────────────────────────────────────
export function useCancelLoan() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function cancelLoan(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'cancelLoan',
      args: [loanId],
    })
  }

  return { cancelLoan, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: parent club claims loan fee after dispute window ──────────────────
export function useClaimLoanFee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function claimLoanFee(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'claimLoanFee',
      args: [loanId],
    })
  }

  return { claimLoanFee, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: exercise option to buy ───────────────────────────────────────────
export function useExerciseOption() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function exerciseOption(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'exerciseOption',
      args: [loanId],
    })
  }

  return { exerciseOption, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: request recall ────────────────────────────────────────────────────
export function useRequestRecall() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function requestRecall(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'requestRecall',
      args: [loanId],
    })
  }

  return { requestRecall, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: execute recall after notice period ────────────────────────────────
export function useExecuteRecall() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function executeRecall(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'executeRecall',
      args: [loanId],
    })
  }

  return { executeRecall, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: settle expired loan and return player ─────────────────────────────
export function useSettleLoanExpiry() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function settleLoanExpiry(loanId: bigint) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'settleLoanExpiry',
      args: [loanId],
    })
  }

  return { settleLoanExpiry, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: withdraw claimable from LoanEscrow ───────────────────────────────
export function useWithdrawLoanClaimable() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function withdrawClaimable(token: `0x${string}`) {
    writeContract({
      ...loanEscrowContract,
      functionName: 'withdrawClaimable',
      args: [token],
    })
  }

  return { withdrawClaimable, hash, isPending, isConfirming, isSuccess, error }
}
