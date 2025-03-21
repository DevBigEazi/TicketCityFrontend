import { electroneum, electroneumTestnet } from 'viem/chains';
import { images } from '../constant';
import { SupportedNetwork } from '../types';
import { formatEther } from 'viem';

/**
 * Parse chain ID from various formats to numeric value
 * @param chainId The chain ID in various formats
 * @returns The chain ID as a number, or null if invalid
 */
export const parseChainId = (chainId: string | number | undefined): number | null => {
  try {
    if (typeof chainId === 'string' && chainId.includes(':')) {
      // CAIP-2 format (e.g., "eip155:7777777")
      return parseInt(chainId.split(':')[1], 10);
    } else if (typeof chainId === 'string' && chainId.startsWith('0x')) {
      // Hex string
      return parseInt(chainId, 16);
    } else if (typeof chainId === 'string') {
      // String numeric
      return parseInt(chainId, 10);
    } else if (typeof chainId === 'number') {
      // Already a number
      return chainId;
    } else {
      console.error('Unsupported chainId format:', chainId);
      return null;
    }
  } catch (error) {
    console.error(`Error parsing chainId ${chainId}:`, error);
    return null;
  }
};

/**
 * @param error - Any error object from contract interaction
 * @returns Formatted error message string
 */
export const formatContractError = (error: unknown): string => {
  // Log the error for debugging purposes
  console.error('Contract interaction error:', error);

  // Initialize default error message
  let errorMessage = 'Unknown contract interaction error. Please try again.';

  // Type guard to check if error has message property
  // This handles both Error objects and custom error objects
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, any>;

    // Check for error message
    if (errorObj.message && typeof errorObj.message === 'string') {
      // Check for common wallet errors
      if (errorObj.message.includes('user rejected')) {
        return 'Transaction was rejected in your wallet. Please try again.';
      }

      if (errorObj.message.includes('insufficient funds')) {
        return 'Insufficient funds in your wallet to complete this transaction.';
      }

      // Network related errors
      if (
        errorObj.message.includes('network') ||
        errorObj.message.includes('chain') ||
        errorObj.message.includes('disconnected')
      ) {
        return 'Network connection issue. Please check you are on the correct network.';
      }

      // Gas related errors
      if (errorObj.message.includes('gas')) {
        return 'Transaction failed due to gas estimation. Try increasing gas limit.';
      }

      // Timeouts
      if (errorObj.message.includes('timeout') || errorObj.message.includes('timed out')) {
        return 'Transaction submission timed out. It may still complete - please check your wallet before trying again.';
      }

      // Set the error message to the actual message if we haven't matched specific patterns
      errorMessage = errorObj.message;
    }

    // Smart contract specific errors (often in the data property)
    if (errorObj.data) {
      try {
        // Handle case where data contains a message property
        if (errorObj.data.message && typeof errorObj.data.message === 'string') {
          return `Smart contract error: ${errorObj.data.message}`;
        }

        // Handle case where data is an object that needs to be stringified
        if (typeof errorObj.data === 'object') {
          return `Smart contract error: ${JSON.stringify(errorObj.data)}`;
        }

        // Handle case where data is a primitive value
        return `Smart contract error: ${String(errorObj.data)}`;
      } catch (stringifyError) {
        return 'Smart contract returned an error that could not be processed.';
      }
    }

    // RPC errors often have code property
    if ('code' in errorObj && typeof errorObj.code === 'number') {
      // Common RPC error codes
      switch (errorObj.code) {
        case 4001:
          return 'Transaction rejected by user.';
        case -32603:
          return 'Internal JSON-RPC error. Please try again later.';
        case -32002:
          return 'Request already pending in your wallet. Please check your wallet.';
        case -32000:
          return 'Transaction execution reverted. The contract rejected the transaction.';
        case -32001:
          return 'Resource not found. Please check network configuration.';
        case -32004:
          return 'Method not supported. Please check contract compatibility.';
        case -32005:
          return 'Request limit exceeded. Please try again later.';
        default:
          return `RPC error (${errorObj.code}): ${errorObj.message || 'Unknown error'}`;
      }
    }
  }

  // For Error instances we might have missed
  if (error instanceof Error) {
    return error.message;
  }

  // Handle primitive error types
  if (typeof error === 'string') {
    return error;
  }

  // Return the default error message if no specific error pattern was matched
  return errorMessage;
};

// Helper function to convert string/bigint to formatted string
export const safeFormatEther = (value: string | bigint): string => {
  // If it's already a string, parse it to make sure it's a valid number
  if (typeof value === 'string') {
    try {
      // Try to parse it as BigInt first (for "0x..." hex strings)
      return formatEther(BigInt(value));
    } catch {
      // If that fails, try to parse it as a regular number
      return value;
    }
  }
  // If it's a bigint, format it directly
  return formatEther(value);
};

// Supported networks using the chain object from viem
export const SUPPORTED_NETWORKS: SupportedNetwork[] = [
  {
    id: electroneum.id,
    name: electroneum.name,
    icon: images.electroneumLogo,
    rpcUrls: electroneum.rpcUrls.default.http,
    isTestnet: false,
  },
  {
    id: electroneumTestnet.id,
    name: electroneumTestnet.name,
    icon: images.electroneumLogo,
    rpcUrls: electroneumTestnet.rpcUrls.default.http,
    isTestnet: true,
  },
];

// Find a network by ID
export const getNetworkById = (chainId: number | null): SupportedNetwork | undefined => {
  if (chainId === null) return undefined;
  return SUPPORTED_NETWORKS.find((network) => network.id === chainId);
};

// Check if a network ID represents testnet
export const isTestnetById = (chainId: number | null): boolean => {
  if (chainId === null) return false;
  const network = getNetworkById(chainId);
  return network?.isTestnet || false;
};

// Profile image
export const permanentUserIdentity =
  'https://gateway.pinata.cloud/ipfs/QmTXNQNNhFkkpCaCbHDfzbUCjXQjQnhX7QFoX1YVRQCSC8';

/**
 * To handle masked email
 * @param email The email to mask
 * @returns The masked email string
 */
export const maskEmail = (email: string) => {
  if (!email || typeof email !== 'string') return 'Invalid email';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return 'Invalid email';

  const maskedLocal =
    localPart.length > 3 ? localPart.slice(0, 4) + '*'.repeat(5) : localPart + '*';

  return `${maskedLocal}@${domain}`;
};

/**
 * Truncate address for display
 * @param address The address to truncate
 * @returns The truncated address string
 */
export const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Helper function to format Unix timestamp to readable date
 * @param timestamp The timestamp to format
 * @returns Formatted date string
 */
export const formatDate = (timestamp: any) => {
  if (!timestamp) return 'TBD';

  const eventDate = new Date(Number(timestamp) * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset hours to compare just the dates
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  // Format the time portion
  const timeString = eventDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if event is today or tomorrow
  if (eventDay.getTime() === todayDay.getTime()) {
    return `Today | ${timeString}`;
  } else if (eventDay.getTime() === tomorrowDay.getTime()) {
    return `Tomorrow | ${timeString}`;
  } else {
    // For other dates, use the standard format
    return `${eventDate.toLocaleDateString()} | ${timeString}`;
  }
};

/**
 * Alternative format for the date display in MyEvent section
 * @param timestamp The timestamp to format
 * @returns Formatted date string
 */
export const formatDateMyEvent = (timestamp: number | string | undefined): string => {
  if (!timestamp) return 'TBD';

  const eventDate = new Date(Number(timestamp) * 1000);

  // Get today and tomorrow dates for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if date is today or tomorrow
  let dateText;
  if (eventDate.toDateString() === today.toDateString()) {
    dateText = 'Today';
  } else if (eventDate.toDateString() === tomorrow.toDateString()) {
    dateText = 'Tomorrow';
  } else {
    dateText = eventDate.toLocaleDateString();
  }

  return (
    dateText +
    ' | ' +
    eventDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

/**
 * Format distance for display
 * @param distance The distance to format
 * @returns Formatted distance string
 */
export const formatDistance = (distance: number | null): string => {
  if (distance === null) return 'N/A';
  if (distance >= 10000) return 'Virtual';

  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)} km`;
  } else {
    return `${distance.toFixed(0)} km`;
  }
};

// Function to wait for a transaction receipt
export const waitForReceipt = async (provider: any, txHash: string) => {
  let receipt = null;
  let retries = 0;
  const maxRetries = 10;

  while (!receipt && retries < maxRetries) {
    receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });

    if (!receipt) {
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!receipt) {
    throw new Error('Transaction receipt not found after maximum retries');
  }

  return receipt;
};
