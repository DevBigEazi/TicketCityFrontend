import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { electroneumTestnet, baseSepolia } from 'viem/chains';

export const TICKET_CITY_ADDR = '0x23D723Cd08189Eb7Bd59A6188132e5d21Ee2DaE9';

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
