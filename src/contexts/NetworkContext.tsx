import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatEther } from 'viem';
import {
  createPublicClientInstance,
  getContractAddress,
  checkRPCConnection,
} from '../config/client';
import { parseChainId, isTestnetById, getNetworkById } from '../utils/utils';
import TICKET_CITY_ABI from '../abi/abi.json';

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
  contractEvents: any[]; // to store contract events
}

// context with a default value
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

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
  const [contractEvents, setContractEvents] = useState<any[]>([]); // State to store contract events
  const [pastEventsLoaded, setPastEventsLoaded] = useState<boolean>(false); // Track if past events loaded

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

  // Load past contract events - separate from setting up listeners
  const loadPastEvents = useCallback(async () => {
    if (!authenticated || !wallet || !networkState.isConnected) return;

    try {
      const publicClient = getPublicClient();
      const contractAddress = getActiveContractAddress();

      // Get past contract events
      const logs = await publicClient.getContractEvents({
        abi: TICKET_CITY_ABI,
        address: contractAddress,
      });

      console.log('Loaded past contract events:', logs.length);
      setContractEvents(logs);
      setPastEventsLoaded(true);
    } catch (error) {
      console.error('Error loading past contract events:', error);
      setPastEventsLoaded(true); // Mark as loaded even on error
    }
  }, [authenticated, wallet, networkState.isConnected, getPublicClient, getActiveContractAddress]);

  // contract event listener - only for new events
  const setupContractEventListener = useCallback(async () => {
    if (!authenticated || !wallet || !networkState.isConnected) return;

    try {
      const publicClient = getPublicClient();
      const contractAddress = getActiveContractAddress();

      console.log('Setting up contract event listener');

      // event listener for future events
      const unwatch = publicClient.watchContractEvent({
        abi: TICKET_CITY_ABI,
        address: contractAddress,
        onLogs: (logs) => {
          console.log('New contract events:', logs.length);
          console.log('New contract events:', logs);

          // Use a function to avoid stale state
          setContractEvents((prevLogs) => {
            // Filter out duplicate events
            const newEvents = logs.filter(
              (newLog) =>
                !prevLogs.some(
                  (existingLog) =>
                    existingLog.transactionHash === newLog.transactionHash &&
                    existingLog.logIndex === newLog.logIndex,
                ),
            );

            if (newEvents.length > 0) {
              console.log(`Adding ${newEvents.length} new events to state`);
              return [...prevLogs, ...newEvents];
            }

            return prevLogs;
          });
        },
      });

      // Return unwatch function to clean up listener
      return unwatch;
    } catch (error) {
      console.error('Error setting up contract event listener:', error);
    }
  }, [authenticated, wallet, networkState.isConnected, getPublicClient, getActiveContractAddress]);

  // Refresh all network data
  const refreshData = useCallback(async () => {
    await detectNetwork();
    await checkRPCStatus();
    await getETNBalance();
    // Don't reload events or create new listeners here - that's handled in useEffect
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

  // event listeners when connected to network
  useEffect(() => {
    // Skip if not authenticated or no wallet
    if (!authenticated || !wallet) return;

    // Skip if not connected to network
    if (!networkState.isConnected) return;

    // Reference to cleanup function
    let unwatchEvents: (() => void) | undefined;

    const initializeEvents = async () => {
      // Load past events first if not already loaded
      if (!pastEventsLoaded) {
        await loadPastEvents();
      }

      // Then set up listener for new events
      unwatchEvents = await setupContractEventListener();
    };

    initializeEvents();

    // Cleanup function
    return () => {
      if (unwatchEvents) {
        console.log('Cleaning up contract event listener');
        unwatchEvents();
      }
    };
  }, [
    authenticated,
    wallet,
    networkState.isConnected,
    networkState.chainId,
    networkState.isTestnet,
    loadPastEvents,
    setupContractEventListener,
    pastEventsLoaded,
  ]);

  // polling for periodic updates
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

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [authenticated, currentWalletAddress, checkRPCStatus, getETNBalance]);

  // Reset past events loaded state when network changes
  useEffect(() => {
    // When network changes, mark past events as not loaded
    setPastEventsLoaded(false);
    // Clear existing events
    setContractEvents([]);
  }, [networkState.isTestnet, networkState.chainId]);

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
    contractEvents,
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
