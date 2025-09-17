/**
 * Withdraw flow for Peridot Protocol via Biconomy
 * 
 * Enables withdrawal of supplied assets with optional cross-chain bridging
 */

import type { Address, Chain } from 'viem';
import { bsc } from 'viem/chains';
import {
  BICONOMY_API_URL,
  getUnderlyingToken,
  type BiconomyResponse,
  type ComposeFlow,
  type ComposeRequest,
  type RuntimeErc20Balance,
} from '../constants';

export interface WithdrawParams {
  userAddress: Address;
  withdrawMarket: Address;
  withdrawAmount?: bigint;
  pTokenAmount?: bigint;
  targetChain?: Chain;
  targetToken?: Address;
  slippage?: number;
  apiKey: string;
}

/**
 * Withdraw supplied assets from Peridot markets
 * 
 * Flow:
 * 1. Redeem pTokens for underlying assets
 * 2. Either:
 *    a. Bridge withdrawn assets to target chain, or
 *    b. Transfer withdrawn assets to user's EOA on BSC
 * 
 * Note: Withdrawal will fail if it would cause the user's health factor
 * to fall below the minimum required for borrowing positions
 * 
 * @param params Withdraw parameters
 * @returns Biconomy response with composed instructions
 */
export async function withdrawCrossChain({
  userAddress,
  withdrawMarket,
  withdrawAmount,
  pTokenAmount,
  targetChain,
  targetToken,
  slippage = 0.01,
  apiKey,
}: WithdrawParams): Promise<BiconomyResponse> {
  if (!withdrawAmount && !pTokenAmount) {
    throw new Error('Either withdrawAmount or pTokenAmount must be provided');
  }

  const underlyingToken = getUnderlyingToken(withdrawMarket);

  const composeFlows: ComposeFlow[] = [
    // Step 1: Withdraw from Peridot
    {
      type: '/instructions/build',
      data: {
        functionSignature: pTokenAmount
          ? 'function redeem(uint256)'
          : 'function redeemUnderlying(uint256)',
        args: [(pTokenAmount || withdrawAmount)!.toString()],
        to: withdrawMarket,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
  ];

  // Step 2: Return funds to user
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