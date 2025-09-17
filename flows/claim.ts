/**
 * Claim rewards flow for Peridot Protocol via Biconomy
 * 
 * Enables claiming and bridging of protocol rewards
 */

import type { Address, Chain } from 'viem';
import { bsc } from 'viem/chains';
import {
  BICONOMY_API_URL,
  PERIDOT_CONTROLLER,
  PERIDOT_REWARD_TOKEN,
  type BiconomyResponse,
  type ComposeFlow,
  type ComposeRequest,
  type RuntimeErc20Balance,
} from '../constants';

export interface ClaimRewardsParams {
  userAddress: Address;
  targetChain?: Chain;
  targetToken?: Address;
  slippage?: number;
  apiKey: string;
}

/**
 * Claim rewards from Peridot Protocol
 * 
 * Flow:
 * 1. Claim rewards from the Peridottroller contract
 * 2. Either:
 *    a. Bridge rewards to target chain, or
 *    b. Transfer rewards to user's EOA on BSC
 * 
 * Note: The actual reward claim function may vary based on implementation.
 * Common patterns include claimComp, claimReward, or similar functions.
 * 
 * @param params Claim parameters
 * @returns Biconomy response with composed instructions
 */
export async function claimRewardsCrossChain({
  userAddress,
  targetChain,
  targetToken,
  slippage = 0.01,
  apiKey,
}: ClaimRewardsParams): Promise<BiconomyResponse> {
  const composeFlows: ComposeFlow[] = [
    // Step 1: Claim rewards from controller
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function claimReward(address)',
        args: [userAddress],
        to: PERIDOT_CONTROLLER,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
  ];

  // Step 2: Return rewards to user
  if (targetChain && targetToken) {
    // Bridge rewards to target chain
    composeFlows.push({
      type: '/instructions/intent-simple',
      data: {
        srcToken: PERIDOT_REWARD_TOKEN,
        dstToken: targetToken,
        srcChainId: bsc.id,
        dstChainId: targetChain.id,
        amount: {
          type: 'runtimeErc20Balance',
          tokenAddress: PERIDOT_REWARD_TOKEN,
          constraints: { gte: '1' },
        } satisfies RuntimeErc20Balance,
        slippage,
      },
      batch: false,
    });
  } else {
    // Transfer rewards to EOA on BSC
    composeFlows.push({
      type: '/instructions/build',
      data: {
        functionSignature: 'function transfer(address,uint256)',
        args: [
          userAddress,
          {
            type: 'runtimeErc20Balance',
            tokenAddress: PERIDOT_REWARD_TOKEN,
            constraints: { gte: '1' },
          } satisfies RuntimeErc20Balance,
        ],
        to: PERIDOT_REWARD_TOKEN,
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