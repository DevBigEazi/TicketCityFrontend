import { electroneum, electroneumTestnet } from 'viem/chains';
import { images } from '../constant';
import { SupportedNetwork } from '../types';

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
