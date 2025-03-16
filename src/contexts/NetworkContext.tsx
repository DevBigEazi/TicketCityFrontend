import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatEther } from 'viem';
import {
  createPublicClientInstance,
  getContractAddress,
  checkRPCConnection,
} from '../utils/client';
import { parseChainId, isTestnetById, getNetworkById } from '../utils/generalUtils';

// NetworkContext type
export interface NetworkContextType {
  isTestnet: boolean;
  chainId: number | null;
  isConnected: boolean;
  tokenBalance: string;
  currentWalletAddress: `0x${string}` | '';
  getPublicClient: () => ReturnType<typeof createPublicClientInstance>;
  getActiveContractAddress: () => `0x${string}`;
  checkRPCStatus: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  networkName: string;
  connectionStatus: string;
}

// Create the context with a default value
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Provider component
export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  const [networkState, setNetworkState] = useState<{
    isTestnet: boolean;
    chainId: number | null;
    isConnected: boolean;
  }>({
    isTestnet: false,
    chainId: null,
    isConnected: true,
  });

  const [tokenBalance, setTokenBalance] = useState<string>('Loading...');

  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets?.[0];
  const currentWalletAddress = (wallet?.address as `0x${string}`) || '';

  // Detect network based on wallet chain ID
  const detectNetwork = useCallback(async () => {
    if (!wallet) return;

    try {
      // Get chain ID from the wallet
      const chainIdRaw = wallet.chainId;

      // Convert chainId to numeric value
      const numericChainId = parseChainId(chainIdRaw);

      if (numericChainId === null) {
        return;
      }

      // Determine if this is testnet based on chain ID
      const isTestnet = isTestnetById(numericChainId);

      // Update network state
      setNetworkState((prev) => ({
        ...prev,
        isTestnet,
        chainId: numericChainId,
      }));
    } catch (error) {
      console.error('Error detecting network:', error);
    }
  }, [wallet]);

  // Create a public client instance based on current network
  const getPublicClient = useCallback(() => {
    return createPublicClientInstance(networkState.isTestnet);
  }, [networkState.isTestnet]);

  // Get contract address based on current network
  const getActiveContractAddress = useCallback((): `0x${string}` => {
    const contractAddress = getContractAddress(networkState.isTestnet);
    return contractAddress;
  }, [networkState.isTestnet]);

  // Check RPC connection status
  const checkRPCStatus = useCallback(async () => {
    if (!wallet) return false;

    try {
      const publicClient = getPublicClient();
      const isConnected = await checkRPCConnection(publicClient);

      setNetworkState((prev) => ({
        ...prev,
        isConnected,
      }));

      return isConnected;
    } catch (error) {
      setNetworkState((prev) => ({
        ...prev,
        isConnected: false,
      }));
      return false;
    }
  }, [wallet, getPublicClient]);

  // Get token balance based on current network
  const getETNBalance = useCallback(async () => {
    if (!wallets || !wallets.length || !currentWalletAddress) {
      setTokenBalance('--');
      return;
    }

    try {
      const publicClient = getPublicClient();
      const tokenBalanceWei = await publicClient.getBalance({
        address: currentWalletAddress,
      });

      const formattedBalance = formatEther(tokenBalanceWei);
      setTokenBalance(parseFloat(formattedBalance).toFixed(4));
    } catch (error) {
      setTokenBalance('--');
    }
  }, [wallets, getPublicClient, currentWalletAddress]);

  // Refresh all network data
  const refreshData = useCallback(async () => {
    await detectNetwork();
    await checkRPCStatus();
    await getETNBalance();
  }, [detectNetwork, checkRPCStatus, getETNBalance]);

  // Get human-readable network info
  const getNetworkName = useCallback(() => {
    if (!authenticated || !wallet || !networkState.chainId) return '';

    const network = getNetworkById(networkState.chainId);

    if (!network) {
      return networkState.isTestnet ? 'Testnet' : 'Mainnet';
    }

    return network.name;
  }, [authenticated, wallet, networkState.chainId, networkState.isTestnet]);

  // Get connection status message
  const getConnectionStatus = useCallback(() => {
    if (!authenticated || !wallet) return '';

    if (!networkState.isConnected) {
      return ' (RPC Error)';
    }

    return '';
  }, [authenticated, wallet, networkState.isConnected]);

  // Run initial detection when wallet changes
  useEffect(() => {
    if (authenticated && wallet) {
      detectNetwork();
    }
  }, [authenticated, wallet, detectNetwork]);

  // Set up polling for updates
  useEffect(() => {
    if (authenticated && currentWalletAddress) {
      // Initial check
      checkRPCStatus();
      getETNBalance();

      // Set up interval for periodic checks
      const intervalId = setInterval(() => {
        checkRPCStatus();
        getETNBalance();
      }, 30000); // Every 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [authenticated, currentWalletAddress, checkRPCStatus, getETNBalance]);

  // Effect for network changes
  useEffect(() => {
    if (authenticated && currentWalletAddress) {
      // Refresh data after network change
      const timeoutId = setTimeout(() => {
        getETNBalance();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [
    authenticated,
    currentWalletAddress,
    networkState.chainId,
    networkState.isTestnet,
    getETNBalance,
  ]);

  // Context value
  const value: NetworkContextType = {
    isTestnet: networkState.isTestnet,
    chainId: networkState.chainId,
    isConnected: networkState.isConnected,
    tokenBalance,
    currentWalletAddress,
    getPublicClient,
    getActiveContractAddress,
    checkRPCStatus,
    refreshData,
    networkName: getNetworkName(),
    connectionStatus: getConnectionStatus(),
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

// Custom hook to use the network context
export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
