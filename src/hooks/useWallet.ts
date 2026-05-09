import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ARC_TESTNET } from "../config/contracts";

interface WalletState {
  address:          string | null;
  provider:         ethers.BrowserProvider | null;
  signer:           ethers.JsonRpcSigner | null;
  chainId:          number | null;
  isConnected:      boolean;
  isCorrectNetwork: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address:          null,
    provider:         null,
    signer:           null,
    chainId:          null,
    isConnected:      false,
    isCorrectNetwork: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet detected. Please install MetaMask.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      setState({ address, provider, signer, chainId, isConnected: true, isCorrectNetwork: chainId === ARC_TESTNET.chainId });
    } catch (err: any) {
      setError(err.message ?? "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, provider: null, signer: null, chainId: null, isConnected: false, isCorrectNetwork: false });
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const chainHex = `0x${ARC_TESTNET.chainId.toString(16)}`;
    const addChain = async () => {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:           chainHex,
          chainName:         ARC_TESTNET.name,
          rpcUrls:           [ARC_TESTNET.rpcUrl],
          nativeCurrency:    {
            name:     ARC_TESTNET.currency.name,
            symbol:   ARC_TESTNET.currency.symbol,
            decimals: ARC_TESTNET.currency.decimals,
          },
          blockExplorerUrls: [ARC_TESTNET.explorer],
        }],
      });
    };
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } catch (err: any) {
      // 4902 = chain not added, -32603 = unrecognized chain — both need wallet_addEthereumChain
      if (err.code === 4902 || err.code === -32603) {
        await addChain();
      }
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setState(prev => ({ ...prev, address: accounts[0] }));
    };
    const handleChainChanged = () => window.location.reload();
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnect]);

  return { ...state, isConnecting, error, connect, disconnect, switchNetwork };
}
