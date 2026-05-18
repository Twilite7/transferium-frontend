import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { transferEscrowContract } from '../config'

// ─── Read: get an offer ───────────────────────────────────────────────────────
export function useOffer(offerId: bigint | undefined) {
  return useReadContract({
    ...transferEscrowContract,
    functionName: 'getOffer',
    args: offerId ? [offerId] : undefined,
    query: { enabled: !!offerId },
  })
}

// ─── Read: get a bid ──────────────────────────────────────────────────────────
export function useBid(offerId: bigint | undefined, buyingClub: `0x${string}` | undefined) {
  return useReadContract({
    ...transferEscrowContract,
    functionName: 'getBid',
    args: offerId && buyingClub ? [offerId, buyingClub] : undefined,
    query: { enabled: !!offerId && !!buyingClub },
  })
}

// ─── Read: active offer for a player ─────────────────────────────────────────
export function usePlayerOffer(playerId: bigint | undefined) {
  return useReadContract({
    ...transferEscrowContract,
    functionName: 'getPlayerOffer',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: transfer window open ───────────────────────────────────────────────
export function useIsWindowOpen() {
  return useReadContract({
    ...transferEscrowContract,
    functionName: 'isWindowOpen',
  })
}

// ─── Read: transfer ban for a club ───────────────────────────────────────────
export function useTransferBan(club: `0x${string}` | undefined) {
  return useReadContract({
    ...transferEscrowContract,
    functionName: 'getTransferBan',
    args: club ? [club] : undefined,
    query: { enabled: !!club },
  })
}

// ─── Write: create offer ──────────────────────────────────────────────────────
export function useCreateOffer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function createOffer(params: {
    playerId: bigint
    paymentToken: `0x${string}`
    askingPrice: bigint
    sellOnBps: number
    sellOnRecipient: `0x${string}`
    sellerAgentBps: number
    sellerAgent: `0x${string}`
    minimumHijackIncrementBps: number
    addOns: { description: string; amount: bigint; toPlayer: boolean; triggered: boolean }[]
  }) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'createOffer',
      args: [
        params.playerId,
        params.paymentToken,
        params.askingPrice,
        params.sellOnBps,
        params.sellOnRecipient,
        params.sellerAgentBps,
        params.sellerAgent,
        params.minimumHijackIncrementBps,
        params.addOns,
      ],
    })
  }

  return { createOffer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: submit bid ────────────────────────────────────────────────────────
export function useSubmitBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function submitBid(params: {
    offerId: bigint
    transferFee: bigint
    sellOnBps: number
    sellOnRecipient: `0x${string}`
    sellerAgentBps: number
    sellerAgent: `0x${string}`
    buyerAgentBps: number
    buyerAgent: `0x${string}`
    signingBonusMonths: number
    installmentAmounts: bigint[]
    installmentDueDates: bigint[]
  }) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'submitBid',
      args: [
        params.offerId,
        params.transferFee,
        params.sellOnBps,
        params.sellOnRecipient,
        params.sellerAgentBps,
        params.sellerAgent,
        params.buyerAgentBps,
        params.buyerAgent,
        params.signingBonusMonths,
        params.installmentAmounts,
        params.installmentDueDates,
      ],
    })
  }

  return { submitBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: accept bid ────────────────────────────────────────────────────────
export function useAcceptBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function acceptBid(offerId: bigint, buyingClub: `0x${string}`) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'acceptBid',
      args: [offerId, buyingClub],
    })
  }

  return { acceptBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: reject bid ────────────────────────────────────────────────────────
export function useRejectBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function rejectBid(offerId: bigint, buyingClub: `0x${string}`) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'rejectBid',
      args: [offerId, buyingClub],
    })
  }

  return { rejectBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: withdraw offer ────────────────────────────────────────────────────
export function useWithdrawOffer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function withdrawOffer(offerId: bigint) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'withdrawOffer',
      args: [offerId],
    })
  }

  return { withdrawOffer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: withdraw bid ──────────────────────────────────────────────────────
export function useWithdrawBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function withdrawBid(offerId: bigint) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'withdrawBid',
      args: [offerId],
    })
  }

  return { withdrawBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: submit hijack bid ─────────────────────────────────────────────────
export function useSubmitHijackBid() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function submitHijackBid(params: {
    dealId: bigint
    transferFee: bigint
    buyerAgentBps: number
    buyerAgent: `0x${string}`
    salaryGuaranteeMonths: number
  }) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'submitHijackBid',
      args: [
        params.dealId,
        params.transferFee,
        params.buyerAgentBps,
        params.buyerAgent,
        params.salaryGuaranteeMonths,
      ],
    })
  }

  return { submitHijackBid, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: process expired deal state ───────────────────────────────────────
export function useProcessExpiry() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function processExpiry(dealId: bigint) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'processExpiry',
      args: [dealId],
    })
  }

  return { processExpiry, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: walk away from medical renegotiation ──────────────────────────────
export function useWalkAway() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function walkAway(dealId: bigint) {
    writeContract({
      ...transferEscrowContract,
      functionName: 'walkAwayFromRenegotiation',
      args: [dealId],
    })
  }

  return { walkAway, hash, isPending, isConfirming, isSuccess, error }
}
