import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { electroneumTestnet, baseSepolia } from 'viem/chains';

export const TICKET_CITY_ADDR = '0x3aDC10C5a12440d4065C5DF91Fd9AC8a5fBbBAa8';

export const createWalletClientInstance = (provider: any) => {
  return createWalletClient({
    chain: baseSepolia,
    transport: custom(provider),
  });
};

export const createPublicClientInstance = () => {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
};
