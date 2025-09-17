/**
 * Peridot Protocol Cross-Chain Integration via Biconomy
 * 
 * Main export file for all flows and constants
 */

// Export all flows
export { supplyCrossChain, type SupplyParams } from './flows/supply';
export { borrowCrossChain, type BorrowParams } from './flows/borrow';
export { repayCrossChain, type RepayParams } from './flows/repay';
export { withdrawCrossChain, type WithdrawParams } from './flows/withdraw';
export { claimRewardsCrossChain, type ClaimRewardsParams } from './flows/claim';

// Export constants and types
export {
  // Addresses
  PERIDOT_CONTROLLER,
  PERIDOT_MARKETS,
  BSC_UNDERLYING_TOKENS,
  PERIDOT_REWARD_TOKEN,
  TOKENS,
  
  // Types
  type ExecutionMode,
  type RuntimeErc20Balance,
  type ComposeFlow,
  type ComposeRequest,
  type BiconomyResponse,
  
  // Helpers
  getUnderlyingToken,
} from './constants';

// Re-export viem chains for convenience
export { 
  mainnet,
  bsc,
  optimism,
  arbitrum,
  polygon,
  base,
  avalanche,
  gnosis,
} from 'viem/chains';