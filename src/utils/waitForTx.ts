import { ethers } from "ethers";

export async function waitForTx(
  tx: ethers.TransactionResponse,
  provider: ethers.BrowserProvider,
  maxAttempts = 40
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.status !== null) {
        if (receipt.status === 0) throw new Error("Transaction reverted on-chain");
        return;
      }
    } catch (err: any) {
      if (err.message.includes("reverted")) throw err;
    }
  }
  throw new Error("Transaction not confirmed after 2 minutes");
}
