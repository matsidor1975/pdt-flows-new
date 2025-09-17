/**
 * Usage examples for Peridot Protocol cross-chain integration
 */

import { parseUnits } from 'viem';
import type { Address } from 'viem';
import { mainnet, optimism, arbitrum, polygon, base } from 'viem/chains';

import { supplyCrossChain } from './flows/supply';
import { borrowCrossChain } from './flows/borrow';
import { repayCrossChain } from './flows/repay';
import { withdrawCrossChain } from './flows/withdraw';
import { claimRewardsCrossChain } from './flows/claim';

import {
  PERIDOT_MARKETS,
  TOKENS,
} from './constants';

// Example configuration
const EXAMPLE_USER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' as Address;
const API_KEY = 'your-biconomy-api-key';

/**
 * Example 1: Supply USDC from Ethereum and enable as collateral
 * 
 * This example shows how to:
 * - Bridge USDC from Ethereum mainnet to BSC
 * - Supply it to Peridot's USDC market
 * - Enable the supplied USDC as collateral for borrowing
 * - Receive pUSDC tokens back to the EOA
 */
async function exampleSupply() {
  const result = await supplyCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    sourceChain: mainnet,
    sourceToken: TOKENS.mainnet.USDC,
    supplyMarket: PERIDOT_MARKETS.USDC,
    supplyAmount: parseUnits('1000', 6), // 1000 USDC (6 decimals)
    enableAsCollateral: true,
    returnPTokens: true,
    apiKey: API_KEY,
  });

  console.log('Supply transaction composed:', result);
  return result;
}

/**
 * Example 2: Borrow USDT and bridge to Arbitrum
 * 
 * This example shows how to:
 * - Use existing USDC collateral for borrowing power
 * - Borrow USDT from Peridot
 * - Bridge the borrowed USDT directly to Arbitrum
 */
async function exampleBorrow() {
  const result = await borrowCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    collateralMarkets: [PERIDOT_MARKETS.USDC], // Enable USDC as collateral
    borrowMarket: PERIDOT_MARKETS.USDT,
    borrowAmount: parseUnits('500', 18), // 500 USDT (18 decimals on BSC)
    targetChain: arbitrum,
    targetToken: TOKENS.arbitrum.USDT,
    apiKey: API_KEY,
  });

  console.log('Borrow transaction composed:', result);
  return result;
}

/**
 * Example 3: Repay loan from Optimism
 * 
 * This example shows how to:
 * - Bridge USDT from Optimism to BSC
 * - Repay an outstanding USDT loan
 * - Return any excess USDT to the user's EOA
 */
async function exampleRepay() {
  const result = await repayCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    sourceChain: optimism,
    sourceToken: TOKENS.optimism.USDT,
    repayMarket: PERIDOT_MARKETS.USDT,
    repayAmount: parseUnits('250', 18), // 250 USDT
    apiKey: API_KEY,
  });

  console.log('Repay transaction composed:', result);
  return result;
}

/**
 * Example 4: Withdraw WETH to Polygon
 * 
 * This example shows how to:
 * - Withdraw supplied WETH from Peridot
 * - Bridge the withdrawn WETH to Polygon
 */
async function exampleWithdraw() {
  const result = await withdrawCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    withdrawMarket: PERIDOT_MARKETS.WETH,
    withdrawAmount: parseUnits('1', 18), // 1 WETH
    targetChain: polygon,
    targetToken: TOKENS.polygon.WETH,
    apiKey: API_KEY,
  });

  console.log('Withdraw transaction composed:', result);
  return result;
}

/**
 * Example 5: Claim rewards and bridge to Base
 * 
 * This example shows how to:
 * - Claim $P token rewards from Peridot
 * - Bridge the rewards to Base chain as WETH
 */
async function exampleClaimRewards() {
  const result = await claimRewardsCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    targetChain: base,
    targetToken: TOKENS.base.WETH, // Swap $P to WETH on Base
    apiKey: API_KEY,
  });

  console.log('Claim rewards transaction composed:', result);
  return result;
}

/**
 * Example 6: Complex DeFi strategy
 * 
 * This example demonstrates a complete lending strategy:
 * 1. Supply USDC as collateral
 * 2. Borrow USDT against it
 * 3. Later repay the loan
 * 4. Withdraw the collateral
 */
async function exampleCompleteStrategy() {
  console.log('Starting complete DeFi strategy...');

  // Step 1: Supply collateral
  const supplyTx = await supplyCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    sourceChain: mainnet,
    sourceToken: TOKENS.mainnet.USDC,
    supplyMarket: PERIDOT_MARKETS.USDC,
    supplyAmount: parseUnits('10000', 6), // 10,000 USDC
    enableAsCollateral: true,
    apiKey: API_KEY,
  });
  console.log('1. Supplied collateral');

  // Step 2: Borrow against collateral (assuming 50% LTV)
  const borrowTx = await borrowCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    collateralMarkets: [PERIDOT_MARKETS.USDC],
    borrowMarket: PERIDOT_MARKETS.USDT,
    borrowAmount: parseUnits('5000', 18), // 5,000 USDT
    targetChain: arbitrum,
    targetToken: TOKENS.arbitrum.USDT,
    apiKey: API_KEY,
  });
  console.log('2. Borrowed against collateral');

  // ... Time passes, user uses borrowed funds ...

  // Step 3: Repay loan with interest (example: 5,100 USDT)
  const repayTx = await repayCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    sourceChain: arbitrum,
    sourceToken: TOKENS.arbitrum.USDT,
    repayMarket: PERIDOT_MARKETS.USDT,
    repayAmount: parseUnits('5100', 18),
    apiKey: API_KEY,
  });
  console.log('3. Repaid loan with interest');

  // Step 4: Withdraw collateral
  const withdrawTx = await withdrawCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS,
    withdrawMarket: PERIDOT_MARKETS.USDC,
    pTokenAmount: parseUnits('10000', 8), // Assuming 8 decimals for pUSDC
    targetChain: mainnet,
    targetToken: TOKENS.mainnet.USDC,
    apiKey: API_KEY,
  });
  console.log('4. Withdrew collateral');

  return {
    supply: supplyTx,
    borrow: borrowTx,
    repay: repayTx,
    withdraw: withdrawTx,
  };
}

/**
 * Example 7: Repay on behalf of another user
 * 
 * This example shows how to repay a loan for another address
 */
async function exampleRepayForFriend() {
  const FRIEND_ADDRESS = '0x1234567890123456789012345678901234567890' as Address;

  const result = await repayCrossChain({
    userAddress: EXAMPLE_USER_ADDRESS, // Payer
    sourceChain: mainnet,
    sourceToken: TOKENS.mainnet.USDT,
    repayMarket: PERIDOT_MARKETS.USDT,
    repayAmount: parseUnits('1000', 18),
    repayForAddress: FRIEND_ADDRESS, // Borrower being helped
    apiKey: API_KEY,
  });

  console.log('Repaid loan for friend:', result);
  return result;
}

// Execute examples
async function runExamples() {
  try {
    // Run individual examples
    await exampleSupply();
    await exampleBorrow();
    await exampleRepay();
    await exampleWithdraw();
    await exampleClaimRewards();
    
    // Run complex strategy
    await exampleCompleteStrategy();
    
    // Help a friend
    await exampleRepayForFriend();
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in other files
export {
  exampleSupply,
  exampleBorrow,
  exampleRepay,
  exampleWithdraw,
  exampleClaimRewards,
  exampleCompleteStrategy,
  exampleRepayForFriend,
  runExamples,
};