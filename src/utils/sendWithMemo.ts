import { ethers } from "ethers";

// Predeployed on Arc Testnet — wraps a target contract call and preserves
// the original EOA as msg.sender via the CallFrom precompile, while emitting
// a searchable Memo event for off-chain reconciliation.
// Docs: https://docs.arc.io/arc/concepts/transaction-memos
export const MEMO_CONTRACT_ADDRESS = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";

const MEMO_ABI = [
  "function memo(address target, bytes calldata data, bytes32 memoId, bytes calldata memoData) external",
  "event BeforeMemo(uint256 indexed memoIndex)",
  "event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)",
];

/**
 * Wraps a contract call through Arc's Memo contract so the transaction
 * carries human-readable, queryable context (e.g. "verification:player_7").
 * The wrapped call still executes with the original wallet as msg.sender —
 * target contracts see no difference from a direct call.
 *
 * Falls back to a direct (unwrapped) call if the Memo contract isn't
 * deployed at the expected address on the connected network, so this never
 * blocks a transaction from going through.
 *
 * @param signer       Connected wallet signer
 * @param target       The contract address being called (e.g. VerificationManager)
 * @param iface        Interface for `target`, used to encode `data`
 * @param functionName Function on `target` to call
 * @param args         Args for that function
 * @param memoLabel    Human-readable label, e.g. "verification:player_7"
 */
export async function sendWithMemo(
  signer: ethers.JsonRpcSigner,
  target: string,
  iface: ethers.Interface,
  functionName: string,
  args: any[],
  memoLabel: string
): Promise<ethers.TransactionResponse> {
  const data = iface.encodeFunctionData(functionName, args);

  try {
    const provider = signer.provider!;
    const code = await provider.getCode(MEMO_CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      // Memo contract not available on this network — send directly.
      return signer.sendTransaction({ to: target, data });
    }

    const memoId   = ethers.id(memoLabel + ":" + Date.now());
    const memoData = ethers.toUtf8Bytes(memoLabel);
    const memoContract = new ethers.Contract(MEMO_CONTRACT_ADDRESS, MEMO_ABI, signer);

    return await memoContract.memo(target, data, memoId, memoData);
  } catch {
    // Any unexpected failure in the memo path — fall back to a direct call
    // rather than blocking the user's transaction.
    return signer.sendTransaction({ to: target, data });
  }
}
