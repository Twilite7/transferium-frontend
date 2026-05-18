import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { dealEscrowContract } from '../config'

// ─── Read: full deal struct ───────────────────────────────────────────────────
export function useDeal(dealId: bigint | undefined) {
  return useReadContract({
    ...dealEscrowContract,
    functionName: 'getDealView',
    args: dealId ? [dealId] : undefined,
    query: { enabled: !!dealId },
  })
}

// ─── Read: deal add-ons ───────────────────────────────────────────────────────
export function useDealAddOns(dealId: bigint | undefined) {
  return useReadContract({
    ...dealEscrowContract,
    functionName: 'getDealAddOns',
    args: dealId ? [dealId] : undefined,
    query: { enabled: !!dealId },
  })
}

// ─── Read: active deal for a player ──────────────────────────────────────────
export function usePlayerDeal(playerId: bigint | undefined) {
  return useReadContract({
    ...dealEscrowContract,
    functionName: 'getPlayerDeal',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: claimable balance ──────────────────────────────────────────────────
export function useClaimable(
  account: `0x${string}` | undefined,
  token: `0x${string}` | undefined
) {
  return useReadContract({
    ...dealEscrowContract,
    functionName: 'getClaimable',
    args: account && token ? [account, token] : undefined,
    query: { enabled: !!account && !!token },
  })
}

// ─── Read: hijack bid for a deal ──────────────────────────────────────────────
export function useHijackBid(dealId: bigint | undefined) {
  return useReadContract({
    ...dealEscrowContract,
    functionName: 'getHijackBid',
    args: dealId ? [dealId] : undefined,
    query: { enabled: !!dealId },
  })
}

// ─── Write: player consents to transfer ───────────────────────────────────────
export function useConsentToTransfer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function consentToTransfer(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'consentToTransfer',
      args: [dealId],
    })
  }

  return { consentToTransfer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: player declines transfer ─────────────────────────────────────────
export function useDeclineTransfer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function declineTransfer(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'declineTransfer',
      args: [dealId],
    })
  }

  return { declineTransfer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: buying club submits medical result ────────────────────────────────
// outcome: 1 = PASSED, 2 = FAILED, 3 = CONCERN
export function useSubmitMedical() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function submitMedical(dealId: bigint, outcome: number, medicalHash: `0x${string}`) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'submitMedical',
      args: [dealId, outcome, medicalHash],
    })
  }

  return { submitMedical, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: buying club funds the deal ───────────────────────────────────────
export function useFundDeal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function fundDeal(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'fundDeal',
      args: [dealId],
    })
  }

  return { fundDeal, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: withdraw claimable funds ─────────────────────────────────────────
export function useWithdrawClaimable() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function withdrawClaimable(token: `0x${string}`) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'withdrawClaimable',
      args: [token],
    })
  }

  return { withdrawClaimable, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: selling club accepts hijack bid ───────────────────────────────────
export function useAcceptHijackBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function acceptHijackBid(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'acceptHijackBid',
      args: [dealId],
    })
  }

  return { acceptHijackBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: selling club accepts medical renegotiation ────────────────────────
export function useAcceptMedicalRenegotiation() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function acceptMedicalRenegotiation(dealId: bigint, newFee: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'acceptMedicalRenegotiation',
      args: [dealId, newFee],
    })
  }

  return { acceptMedicalRenegotiation, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: raise a dispute ───────────────────────────────────────────────────
export function useRaiseDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function raiseDispute(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'raiseDispute',
      args: [dealId],
    })
  }

  return { raiseDispute, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: propose mutual cancel ────────────────────────────────────────────
export function useProposeMutualCancel() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function proposeMutualCancel(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'proposeMutualCancel',
      args: [dealId],
    })
  }

  return { proposeMutualCancel, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: confirm mutual cancel ────────────────────────────────────────────
export function useConfirmMutualCancel() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function confirmMutualCancel(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'confirmMutualCancel',
      args: [dealId],
    })
  }

  return { confirmMutualCancel, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: player claims salary guarantee ────────────────────────────────────
export function useClaimSalaryGuarantee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function claimSalaryGuarantee(dealId: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'claimSalaryGuarantee',
      args: [dealId],
    })
  }

  return { claimSalaryGuarantee, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: deposit add-on funds ─────────────────────────────────────────────
export function useDepositAddOnFunds() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function depositAddOnFunds(dealId: bigint, amount: bigint) {
    writeContract({
      ...dealEscrowContract,
      functionName: 'depositAddOnFunds',
      args: [dealId, amount],
    })
  }

  return { depositAddOnFunds, hash, isPending, isConfirming, isSuccess, error }
}
