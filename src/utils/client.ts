import { createWalletClient, createPublicClient, custom, http, fallback } from 'viem';
import { electroneum } from 'viem/chains';

export const TICKET_CITY_ADDR = '0x123bFf8D754b29772E1EfAD5B075F55600577DcD';

// Primary and fallback RPC URLs
const PRIMARY_RPC =
  import.meta.env.VITE_ELECTRONEUM_MAINNET_RPC || 'https://rpc.ankr.com/electroneum';
const FALLBACK_RPC = 'https://rpc.electroneum.com'; // Official testnet RPC as fallback

export const createWalletClientInstance = (provider: any) => {
  try {
    return createWalletClient({
      chain: electroneum,
      transport: custom(provider),
    });
  } catch (error) {
    console.error('Failed to create wallet client:', error);
    throw new Error('Could not initialize wallet client. Please check your wallet provider.');
  }
};

export const createPublicClientInstance = () => {
  try {
    // Using fallback to try multiple RPC providers if one fails
    return createPublicClient({
      chain: electroneum,
      transport: fallback([http(PRIMARY_RPC), http(FALLBACK_RPC)]),
    });
  } catch (error) {
    console.error('Failed to create public client:', error);
    throw new Error('Could not connect to Electroneum testnet. The network might be unavailable.');
  }
};

// Function to check if the RPC is responsive before making contract calls
export const checkRPCConnection = async (client: any) => {
  try {
    // Simple request to check if the RPC is responsive
    await client.getChainId();
    return true;
  } catch (error) {
    console.error('RPC connection check failed:', error);
    return false;
  }
};

// Wrapper for contract reads with better error handling
export const safeContractRead = async (client: any, options: any) => {
  try {
    const isConnected = await checkRPCConnection(client);
    if (!isConnected) {
      throw new Error(
        'Cannot connect to Electroneum testnet RPC. The network might be unavailable.',
      );
    }

    return await client.readContract(options);
  } catch (error: any) {
    console.error('Contract read failed:', error);
    throw new Error(`Failed to read from contract at ${options.address}: ${error.message}`);
  }
};
