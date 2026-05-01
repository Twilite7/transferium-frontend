> **Status:** Actively in development. Players and Transfers pages are working. Loans page is still being built. Contracts are fully deployed on Arc Testnet.

# Transferium — Frontend

Web interface for Transferium Protocol. Connect with MetaMask or Rabby on Arc Testnet (Chain ID 5042002).

Built this after the contracts were done. Kept it simple and functional — the goal was to prove the protocol works end to end, not win a design award.

## Pages

**Overview** — Window status, protocol stats, EURC balance.

**Players** — Register players, run them through the full compliance pipeline (verification, medical, legal docs, player wallet), list and delist during open windows.

**Transfers** — Browse the market, create deals with full fee structure, approve/reject, claim funds.

**Loans** — In progress.

**League** — Registrar-only. Grant and revoke club access on-chain.

## Stack

React, TypeScript, Vite, ethers.js v6, Arc Testnet

## Contracts

| Contract | Address |
|---|---|
| PlayerRegistry | `0xdDa83cf2ADECD861Cc6aa947E167E29906BB77Ef` |
| TransferWindow | `0xcEDd544E087a670CcD4bBe0437F80BB6C8f837a4` |
| TransferEscrow | `0xa92C0648d97455D11713487FE6a1B784f74cB94A` |
| LoanEscrow | `0x2a0F089674ff1Eb1C035C19d61d4bfCc0360e9fC` |

## Run Locally

```bash
npm install
npm run dev
```

Add Arc Testnet to your wallet: Chain ID 5042002, RPC https://rpc.testnet.arc.network

Contracts repo: [github.com/Twilite7/transferium-contracts](https://github.com/Twilite7/transferium-contracts)

---

Security over speed. Always.
