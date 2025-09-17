/**
 * Supply flow for Peridot Protocol via Biconomy
 * 
 * Enables cross-chain supply of assets to Peridot lending markets
 */

import type { Address, Chain } from 'viem';
import { bsc } from 'viem/chains';
import {
  BICONOMY_API_URL,
  PERIDOT_CONTROLLER,
  getUnderlyingToken,
  type BiconomyResponse,
  type ComposeFlow,
  type ComposeRequest,
  type RuntimeErc20Balance,
} from '../constants';

export interface SupplyParams {
  userAddress: Address;
  sourceChain: Chain;
  sourceToken: Address;
  supplyMarket: Address;
  supplyAmount: bigint;
  enableAsCollateral?: boolean;
  returnPTokens?: boolean;
  slippage?: number;
  apiKey: string;
}

/**
 * Supply assets cross-chain to Peridot markets
 * 
 * Flow:
 * 1. Bridge tokens from source chain to BSC orchestrator
 * 2. Approve pToken contract to spend underlying
 * 3. Mint pTokens by supplying underlying
 * 4. Optionally enable as collateral
 * 5. Transfer pTokens back to user's EOA
 * 
 * @param params Supply parameters
 * @returns Biconomy response with composed instructions
 */
export async function supplyCrossChain({
  userAddress,
  sourceChain,
  sourceToken,
  supplyMarket,
  supplyAmount,
  enableAsCollateral = false,
  returnPTokens = true,
  slippage = 0.01,
  apiKey,
}: SupplyParams): Promise<BiconomyResponse> {
  const underlyingToken = getUnderlyingToken(supplyMarket);

  const composeFlows: ComposeFlow[] = [
    // Step 1: Bridge tokens from source chain to BSC
    {
      type: '/instructions/intent-simple',
      data: {
        srcToken: sourceToken,
        dstToken: underlyingToken,
        srcChainId: sourceChain.id,
        dstChainId: bsc.id,
        amount: supplyAmount.toString(),
        slippage,
      },
      batch: false,
    },
    // Step 2: Approve pToken to spend underlying
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function approve(address,uint256)',
        args: [
          supplyMarket,
          {
            type: 'runtimeErc20Balance',
            tokenAddress: underlyingToken,
          } satisfies RuntimeErc20Balance,
        ],
        to: underlyingToken,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
    // Step 3: Mint pTokens
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function mint(uint256)',
        args: [
          {
            type: 'runtimeErc20Balance',
            tokenAddress: underlyingToken,
          } satisfies RuntimeErc20Balance,
        ],
        to: supplyMarket,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
  ];

  // Step 4: Enable as collateral if requested
  if (enableAsCollateral) {
    composeFlows.push({
      type: '/instructions/build',
      data: {
        functionSignature: 'function enterMarkets(address[] memory)',
        args: [[supplyMarket]],
        to: PERIDOT_CONTROLLER,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    });
  }

  // Step 5: Return pTokens to EOA
  if (returnPTokens) {
    composeFlows.push({
      type: '/instructions/build',
      data: {
        functionSignature: 'function transfer(address,uint256)',
        args: [
          userAddress,
          {
            type: 'runtimeErc20Balance',
            tokenAddress: supplyMarket,
            constraints: { gte: '1' },
          } satisfies RuntimeErc20Balance,
        ],
        to: supplyMarket,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    });
  }

  const request: ComposeRequest = {
    ownerAddress: userAddress,
    mode: 'eoa',
    composeFlows,
  };

  const response = await fetch(`${BICONOMY_API_URL}/v1/instructions/compose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Biconomy API error: ${JSON.stringify(error)}`);
  }

  const parsedResponse = await response.json()
  return parsedResponse as BiconomyResponse
}