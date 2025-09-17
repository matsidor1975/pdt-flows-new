/**
 * Repay flow for Peridot Protocol via Biconomy
 * 
 * Enables cross-chain loan repayment
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

export interface RepayParams {
  userAddress: Address;
  sourceChain: Chain;
  sourceToken: Address;
  repayMarket: Address;
  repayAmount: bigint;
  repayForAddress?: Address;
  slippage?: number;
  apiKey: string;
}

/**
 * Repay borrowed assets from any chain
 * 
 * Flow:
 * 1. Bridge repayment tokens from source chain to BSC orchestrator
 * 2. Approve pToken contract to spend underlying tokens
 * 3. Execute repayment (for self or on behalf of another address)
 * 4. Transfer any excess tokens back to user's EOA
 * 
 * @param params Repay parameters
 * @returns Biconomy response with composed instructions
 */
export async function repayCrossChain({
  userAddress,
  sourceChain,
  sourceToken,
  repayMarket,
  repayAmount,
  repayForAddress,
  slippage = 0.01,
  apiKey,
}: RepayParams): Promise<BiconomyResponse> {
  const underlyingToken = getUnderlyingToken(repayMarket);

  const composeFlows: ComposeFlow[] = [
    // Step 1: Bridge tokens from source chain to BSC
    {
      type: '/instructions/intent-simple',
      data: {
        srcToken: sourceToken,
        dstToken: underlyingToken,
        srcChainId: sourceChain.id,
        dstChainId: bsc.id,
        amount: repayAmount.toString(),
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
          repayMarket,
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
    // Step 3: Execute repayment
    {
      type: '/instructions/build',
      data: {
        functionSignature: repayForAddress
          ? 'function repayBorrowBehalf(address,uint256)'
          : 'function repayBorrow(uint256)',
        args: repayForAddress
          ? [
              repayForAddress,
              {
                type: 'runtimeErc20Balance',
                tokenAddress: underlyingToken,
              } satisfies RuntimeErc20Balance,
            ]
          : [
              {
                type: 'runtimeErc20Balance',
                tokenAddress: underlyingToken,
              } satisfies RuntimeErc20Balance,
            ],
        to: repayMarket,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
    // Step 4: Return any excess to EOA
    {
      type: '/instructions/build',
      data: {
        functionSignature: 'function transfer(address,uint256)',
        args: [
          userAddress,
          {
            type: 'runtimeErc20Balance',
            tokenAddress: underlyingToken,
            constraints: { gte: '0' },
          } satisfies RuntimeErc20Balance,
        ],
        to: underlyingToken,
        chainId: bsc.id,
        value: '0',
      },
      batch: true,
    },
  ];

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