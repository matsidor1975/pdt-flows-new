/**
 * Shared constants and types for Peridot Protocol integration
 */

import type { Address, Chain } from 'viem';
import { 
  mainnet,
  bsc,
  optimism,
  arbitrum,
  polygon,
  base,
  avalanche,
  gnosis,
} from 'viem/chains';

// ============ API CONFIGURATION ============

export const BICONOMY_API_URL = 'https://api.biconomy.io' as const;

// ============ PERIDOT PROTOCOL ADDRESSES (BSC) ============

export const PERIDOT_CONTROLLER = '0x6fC0c15531CB5901ac72aB3CFCd9dF6E99552e14' as Address;

export const PERIDOT_MARKETS = {
  WETH: '0x28E4F2Bb64ac79500ec3CAa074A3C30721B6bC84' as Address,
  USDC: '0x1A726369Bfc60198A0ce19C66726C8046c0eC17e' as Address,
  WBNB: '0xD9fDF5E2c7a2e7916E7f10Da276D95d4daC5a3c3' as Address,
  USDT: '0xc37f3869720B672addFE5F9E22a9459e0E851372' as Address,
  WBTC: '0xdCAbDc1F0B5e603b9191be044a912A8A2949e212' as Address,
  AUSD: '0x7A9940B77c0B6DFCcA2028b9F3CCa88E5DC36ebb' as Address,
} as const;

export const BSC_UNDERLYING_TOKENS = {
  WETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8' as Address,
  WBTC: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c' as Address,
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
  AUSD: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a' as Address,
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address,
  USDT: '0x55d398326f99059fF775485246999027B3197955' as Address,
} as const;

export const PERIDOT_REWARD_TOKEN = '0x96650BebC549456F253974c11Fc6cBE28172A2d2' as Address; // $P token

// ============ CROSS-CHAIN TOKEN ADDRESSES ============

export const TOKENS = {
  mainnet: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
  },
  arbitrum: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' as Address,
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address,
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
  },
  optimism: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' as Address,
    USDT: '0x94b008aA00579c1307B0eF2c499aD98a8ce58e58' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
  },
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as Address,
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' as Address,
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
  },
} as const;

// ============ SHARED TYPES ============

export type ExecutionMode = 'eoa' | 'smart-account' | 'eoa-7702';

export interface RuntimeErc20Balance {
  type: 'runtimeErc20Balance';
  tokenAddress: Address;
  targetAddress?: Address;
  constraints?: {
    gte?: string;
    lte?: string;
    eq?: string;
  };
}

export interface ComposeFlow {
  type: '/instructions/build' | '/instructions/intent-simple' | '/instructions/intent';
  data: Record<string, unknown>;
  batch?: boolean;
}

export interface ComposeRequest {
  ownerAddress: Address;
  mode: ExecutionMode;
  composeFlows: ComposeFlow[];
}

export interface BiconomyResponse {
  instructions: Array<{
    calls: Array<{
      to: Address;
      value: string;
      functionSig: string;
      inputParams: unknown[];
      outputParams: unknown[];
    }>;
    chainId: number;
    isComposable: boolean;
  }>;
  returnedData?: unknown[];
  route?: unknown;
  estimatedGas?: string;
}

// ============ HELPER FUNCTIONS ============

export function getUnderlyingToken(pTokenAddress: Address): Address {
  const marketToUnderlying: Record<Address, Address> = {
    [PERIDOT_MARKETS.WETH]: BSC_UNDERLYING_TOKENS.WETH,
    [PERIDOT_MARKETS.USDC]: BSC_UNDERLYING_TOKENS.USDC,
    [PERIDOT_MARKETS.WBNB]: BSC_UNDERLYING_TOKENS.WBNB,
    [PERIDOT_MARKETS.USDT]: BSC_UNDERLYING_TOKENS.USDT,
    [PERIDOT_MARKETS.WBTC]: BSC_UNDERLYING_TOKENS.WBTC,
    [PERIDOT_MARKETS.AUSD]: BSC_UNDERLYING_TOKENS.AUSD,
  };

  const underlying = marketToUnderlying[pTokenAddress];
  if (!underlying) {
    throw new Error(`Unknown pToken market: ${pTokenAddress}`);
  }

  return underlying;
}