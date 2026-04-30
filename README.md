# Transferium Protocol — Frontend

The web interface for Transferium Protocol — a decentralised football player transfer and loan system built on Arc Testnet.

## Live App

Deployed on Arc Testnet (Chain ID 5042002). Connect with MetaMask or Rabby wallet.

## Features

### Overview (Dashboard)
- Live transfer window status
- Protocol statistics — total players, active transfers, open loans
- EURC balance display

### Players
- Register new players with position and nationality dropdowns
- Full registrar compliance pipeline:
  - Step 1: Player identity verification
  - Step 2: Medical clearance (document hash)
  - Step 3: Legal documents (registration contract, identity, FIFA TMS, work permit)
  - Step 4: Player wallet assignment
- List and delist players during open transfer windows
- Document hash uniqueness enforced on-chain — no reuse across players

### Transfers
- Browse listed players on the transfer market
- Create transfer deals with configurable:
  - Transfer fee (EURC/USDC)
  - Agent fee percentage
  - Sell-on clause percentage
  - Performance add-ons
  - Salary guarantee
- Approve, reject, and claim transfer funds
- League queue for multi-club deals

### Loans
- Loan deal creation and management (in development)

### League (Registrar Only)
- Grant and revoke CLUB_ROLE to club wallets
- Lookup wallet role status
- Full access control managed on-chain

## Tech Stack

- React + TypeScript
- Vite
- ethers.js v6
- Arc Testnet (Chain ID 5042002)
- Rabby / MetaMask wallet support

## Smart Contracts

| Contract | Address |
|---|---|
| PlayerRegistry | `0xdDa83cf2ADECD861Cc6aa947E167E29906BB77Ef` |
| TransferWindow | `0xcEDd544E087a670CcD4bBe0437F80BB6C8f837a4` |
| TransferEscrow | `0xa92C0648d97455D11713487FE6a1B784f74cB94A` |
| LoanEscrow | `0x2a0F089674ff1Eb1C035C19d61d4bfCc0360e9fC` |

## Getting Started

```bash
npm install
npm run dev
```

Connect your wallet to Arc Testnet (Chain ID 5042002, RPC: https://rpc.testnet.arc.network).

## Smart Contract Repository

[github.com/Twilite7/transferium-contracts](https://github.com/Twilite7/transferium-contracts)

---

*Built on Arc Testnet. Security over speed. Always.*
