import { createWalletClient, createPublicClient, custom, http, fallback } from 'viem';
import { electroneum, electroneumTestnet } from 'viem/chains';

// Contract addresses for different networks
export const TICKET_CITY_ADDR = {
  mainnet: '0x123bFf8D754b29772E1EfAD5B075F55600577DcD',
  testnet: '0x00755267E1663Dc63563A0D44caB75Cebbcfe72F',
};

// Primary and fallback RPC URLs
const MAINNET_PRIMARY_RPC =
  import.meta.env.VITE_ELECTRONEUM_MAINNET_RPC || 'https://rpc.ankr.com/electroneum';
const MAINNET_FALLBACK_RPC = 'https://rpc.electroneum.com';
const TESTNET_PRIMARY_RPC =
  import.meta.env.VITE_ELECTRONEUM_TESTNET_RPC || 'https://rpc.ankr.com/electroneum_testnet';
const TESTNET_FALLBACK_RPC = 'https://rpc.ankr.com/electroneum_testnet';

/**
 * Creates a wallet client instance for interacting with the blockchain
 * @param provider The wallet provider
 * @param isTestnet Whether to use testnet or mainnet
 * @returns A wallet client instance
 */
export const createWalletClientInstance = (provider: any, isTestnet = false) => {
  try {
    return createWalletClient({
      chain: isTestnet ? electroneumTestnet : electroneum,
      transport: custom(provider),
    });
  } catch (error) {
    console.error('Failed to create wallet client:', error);
    throw new Error('Could not initialize wallet client. Please check your wallet provider.');
  }
};

/**
 * Creates a public client instance for reading from the blockchain
 * @param isTestnet Whether to use testnet or mainnet
 * @returns A public client instance
 */
export const createPublicClientInstance = (isTestnet = false) => {
  try {
    // Select appropriate RPC URLs and chain based on network
    const primaryRPC = isTestnet ? TESTNET_PRIMARY_RPC : MAINNET_PRIMARY_RPC;
    const fallbackRPC = isTestnet ? TESTNET_FALLBACK_RPC : MAINNET_FALLBACK_RPC;
    const chain = isTestnet ? electroneumTestnet : electroneum;

    // Using fallback to try multiple RPC providers if one fails
    return createPublicClient({
      chain,
      transport: fallback([http(primaryRPC), http(fallbackRPC)]),
    });
  } catch (error) {
    console.error('Failed to create public client:', error);
    const networkType = isTestnet ? 'testnet' : 'mainnet';
    throw new Error(
      `Could not connect to Electroneum ${networkType}. The network might be unavailable.`,
    );
  }
};

/**
 * Checks if the RPC connection is responsive
 * @param client The public client instance
 * @returns true if connected, false otherwise
 */
export const checkRPCConnection = async (client: any): Promise<boolean> => {
  try {
    // Simple request to check if the RPC is responsive
    await client.getChainId();
    return true;
  } catch (error) {
    console.error('RPC connection check failed:', error);
    return false;
  }
};

/**
 * Type for contract read options
 */
export interface ContractReadOptions {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

/**
 * Wrapper for contract reads with better error handling
 * @param client The public client instance
 * @param options Contract read options
 * @param isTestnet Whether reading from testnet or mainnet
 * @returns The result of the contract read
 */
export const safeContractRead = async (
  client: any,
  options: ContractReadOptions,
  isTestnet = false,
) => {
  try {
    const isConnected = await checkRPCConnection(client);
    if (!isConnected) {
      const networkType = isTestnet ? 'testnet' : 'mainnet';
      throw new Error(
        `Cannot connect to Electroneum ${networkType} RPC. The network might be unavailable.`,
      );
    }
    return await client.readContract(options);
  } catch (error: any) {
    console.error('Contract read failed:', error);
    throw new Error(`Failed to read from contract at ${options.address}: ${error.message}`);
  }
};

/**
 * Gets the appropriate contract address based on network
 * @param isTestnet Whether to get testnet or mainnet address
 * @returns The contract address as a hex string
 */
export const getContractAddress = (isTestnet = false): `0x${string}` => {
  // Force the parameter to be a boolean to avoid any type coercion issues
  const useTestnet = Boolean(isTestnet);

  // Log what we're doing for debugging
  console.log(`Getting contract address for network: ${useTestnet ? 'testnet' : 'mainnet'}`);

  // Make sure we're selecting the right address
  const contractAddress = useTestnet ? TICKET_CITY_ADDR.testnet : TICKET_CITY_ADDR.mainnet;

  // Log the selected address
  console.log(`Selected contract address: ${contractAddress}`);

  return contractAddress as `0x${string}`;
};

/**
 * Gets the appropriate network ID based on network
 * @param isTestnet Whether to get testnet or mainnet ID
 * @returns The network ID
 */
export const getNetworkId = (isTestnet = false): number => {
  return isTestnet ? electroneumTestnet.id : electroneum.id;
};

/**
 * Determines if a chainId represents testnet
 * @param chainId The chain ID to check
 * @returns true if testnet, false if mainnet, null if invalid/unknown
 */
export const isTestnetChain = (chainId: number | string | undefined): boolean | null => {
  try {
    if (typeof chainId === 'string') {
      // Handle hex string
      if (chainId.startsWith('0x')) {
        chainId = parseInt(chainId, 16);
      } else {
        // Handle numeric string
        chainId = parseInt(chainId, 10);
      }
    }

    if (typeof chainId !== 'number' || isNaN(chainId)) {
      return null;
    }

    // Add explicit log to verify what chain ID is being detected
    console.log(
      `isTestnetChain checking chainId: ${chainId}, testnet ID: ${electroneumTestnet.id}`,
    );

    return chainId === electroneumTestnet.id;
  } catch (error) {
    console.error('Error determining if chain is testnet:', error);
    return null;
  }
};
