import {
  defineChain,
  createPublicClient,
  http,
  createWalletClient,
  custom,
  publicActions,
} from "viem";

export const crossfiTestnet = defineChain({
  id: 4157,
  name: "CrossFi Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "XFI",
    symbol: "XFI",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.ms/"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://test.xfiscan.com" },
  },
});

export const TICKET_CITY_ADDR = "0x6fd1F53799bC0312a98C36eBA030d3aA7B68264f"

export const createWalletClientInstance = (provider: any) => {
  return createWalletClient({
    chain: crossfiTestnet,
    transport: custom(provider),
  });
};

export const createPublicClientInstance = () => {
  return createPublicClient({
    chain: crossfiTestnet,
    transport: http(),
  }).extend(publicActions);
};
