/**
 * Borrow flow for Peridot Protocol via Biconomy
 * 
 * Enables borrowing against collateral with optional cross-chain bridging
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

export interface BorrowParams {
  userAddress: Address;
  collateralMarkets: readonly Address[];
  borrowMarket: Address;
  borrowAmount: bigint;
  targetChain?: Chain;
  targetToken?: Address;
  slippage?: number;
  apiKey: string;
}

/**
 * Borrow assets from Peridot and optionally bridge to another chain
 * 
 * Flow:
 * 1. Enable collateral markets for borrowing power
 * 2. Borrow from specified pToken market
 * 3. Either:
 *    a. Bridge borrowed funds to target chain, or
 *    b. Transfer borrowed funds to user's EOA on BSC
 * 
 * Prerequisites:
 * - User must have already supplied collateral to the specified markets
 * - Collateral value must be sufficient for the borrow amount
 * 
 * @param params Borrow parameters
 * @returns Biconomy response with composed instructions
 */
export async function borrowCrossChain({
  userAddress,
  collateralMarkets,
  borrowMarket,
  borrowAmount,
  targetChain,
  targetToken,
  slippage = 0.01,
  apiKey,
}: BorrowParams): Promise<BiconomyResponse> {
  const underlyingToken = getUnderlyingToken(borrowMarket);

  const composeFlows: ComposeFlow[] = [
    // Step 1: Enable collateral markets
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function enterMarkets(address[] memory)',
        args: [[...collateralMarkets]],
        to: PERIDOT_CONTROLLER,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
    // Step 2: Borrow from market
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function borrow(uint256)',
        args: [borrowAmount.toString()],
        to: borrowMarket,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
  ];

  // Step 3: Return borrowed funds to user
  if (targetChain && targetToken) {
    // Bridge to target chain
    composeFlows.push({
      type: '/instructions/intent-simple',
      data: {
        srcToken: underlyingToken,
        dstToken: targetToken,
        srcChainId: bsc.id,
        dstChainId: targetChain.id,
        amount: {
          type: 'runtimeErc20Balance',
          tokenAddress: underlyingToken,
          constraints: { gte: '1' },
        } satisfies RuntimeErc20Balance,
        slippage,
      },
      batch: false,
    });
  } else {
    // Transfer to EOA on BSC
    composeFlows.push({
      type: '/instructions/build',
      data: {
        functionSignature: 'function transfer(address,uint256)',
        args: [
          userAddress,
          {
            type: 'runtimeErc20Balance',
            tokenAddress: underlyingToken,
            constraints: { gte: '1' },
          } satisfies RuntimeErc20Balance,
        ],
        to: underlyingToken,
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