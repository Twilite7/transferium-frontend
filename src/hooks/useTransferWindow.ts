import { useReadContract } from 'wagmi'
import { transferWindowContract } from '../config'

// ─── Read: is the transfer window currently open ──────────────────────────────
export function useTransferWindowOpen() {
  return useReadContract({
    ...transferWindowContract,
    functionName: 'isWindowOpen',
    // I poll every 30s — window state changes on a schedule, not per block
    query: { refetchInterval: 30_000 },
  })
}

// ─── Read: current window type (0=none, 1=standard, 2=exceptional, 3=emergency)
export function useCurrentWindowType() {
  return useReadContract({
    ...transferWindowContract,
    functionName: 'getCurrentWindowType',
    query: { refetchInterval: 30_000 },
  })
}
