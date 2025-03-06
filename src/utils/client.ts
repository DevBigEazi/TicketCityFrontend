import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { electroneumTestnet, baseSepolia } from 'viem/chains';

export const TICKET_CITY_ADDR = '0x08d2159C3ad7b630F2115aE1c60F7d14ca7c283c';

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
