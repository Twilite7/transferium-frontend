import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { playerRegistryContract } from '../config'

// ─── Read: get a single player ────────────────────────────────────────────────
export function usePlayer(playerId: bigint | undefined) {
  return useReadContract({
    ...playerRegistryContract,
    functionName: 'getPlayer',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: all player IDs owned by a club ────────────────────────────────────
export function useClubPlayers(clubAddress: `0x${string}` | undefined) {
  return useReadContract({
    ...playerRegistryContract,
    functionName: 'getClubPlayers',
    args: clubAddress ? [clubAddress] : undefined,
    query: { enabled: !!clubAddress },
  })
}

// ─── Read: current club owning a player ──────────────────────────────────────
export function useCurrentClub(playerId: bigint | undefined) {
  return useReadContract({
    ...playerRegistryContract,
    functionName: 'currentClub',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: legal documents for a player ──────────────────────────────────────
export function useLegalDocuments(playerId: bigint | undefined) {
  return useReadContract({
    ...playerRegistryContract,
    functionName: 'getLegalDocuments',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Read: on-chain tokenURI (base64 JSON with portrait + attributes) ─────────
export function useTokenURI(playerId: bigint | undefined) {
  return useReadContract({
    ...playerRegistryContract,
    functionName: 'tokenURI',
    args: playerId ? [playerId] : undefined,
    query: { enabled: !!playerId },
  })
}

// ─── Write: register a new player ────────────────────────────────────────────
export function useRegisterPlayer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function registerPlayer(params: {
    name: string
    position: string
    nationality: string
    contractExpiry: bigint
    weeklySalary: bigint
    portraitCID: string
    registrationFee: bigint
  }) {
    writeContract({
      ...playerRegistryContract,
      functionName: 'registerPlayer',
      args: [
        params.name,
        params.position,
        params.nationality,
        params.contractExpiry,
        params.weeklySalary,
        params.portraitCID,
      ],
      value: params.registrationFee,
    })
  }

  return { registerPlayer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: update portrait CID ──────────────────────────────────────────────
export function useSetPortrait() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function setPortrait(playerId: bigint, cid: string) {
    writeContract({
      ...playerRegistryContract,
      functionName: 'setPortrait',
      args: [playerId, cid],
    })
  }

  return { setPortrait, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: list player for transfer ─────────────────────────────────────────
export function useListPlayer() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function listPlayer(playerId: bigint, askingPrice: bigint, listingFee: bigint) {
    writeContract({
      ...playerRegistryContract,
      functionName: 'listPlayer',
      args: [playerId, askingPrice],
      value: listingFee,
    })
  }

  return { listPlayer, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Write: set player wallet ─────────────────────────────────────────────────
export function useSetPlayerWallet() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function setPlayerWallet(playerId: bigint, wallet: `0x${string}`) {
    writeContract({
      ...playerRegistryContract,
      functionName: 'setPlayerWallet',
      args: [playerId, wallet],
    })
  }

  return { setPlayerWallet, hash, isPending, isConfirming, isSuccess, error }
}

// ─── Read: registration and listing fees ─────────────────────────────────────
export function useRegistryFees() {
  const regFee = useReadContract({
    ...playerRegistryContract,
    functionName: 'registrationFee',
  })
  const listFee = useReadContract({
    ...playerRegistryContract,
    functionName: 'listingFee',
  })
  return { registrationFee: regFee.data, listingFee: listFee.data }
}
