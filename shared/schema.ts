import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export const insertUserSchema = userSchema.pick({
  username: true,
  password: true,
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Wallet schema
export const walletSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  address: z.string(),
});

export const insertWalletSchema = walletSchema.omit({ id: true, userId: true });

export type Wallet = z.infer<typeof walletSchema>;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// Token/Market Data schema
export const tokenSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change24h: z.number(),
  marketCap: z.number(),
  rank: z.number(),
  volume24h: z.number(),
  image: z.string().optional(),
});

export type Token = z.infer<typeof tokenSchema>;

// Pool schema (for pools monitor)
export const poolSchema = z.object({
  id: z.string(),
  pair: z.string(),
  network: z.string(),
  dex: z.string(),
  tvl: z.number(),
  volume24h: z.number(),
  efficiency: z.number(),
  token0: z.string(),
  token1: z.string(),
  apr: z.number().optional(),
});

export type Pool = z.infer<typeof poolSchema>;

// User Pool (liquidity position)
export const userPoolSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dex: z.string(),
  network: z.string(),
  pair: z.string(),
  entryDate: z.string(),
  entryValueUsd: z.number(),
  entryValueBrl: z.number(),
  priceRangeMin: z.number(),
  priceRangeMax: z.number(),
  exitDate: z.string().nullable(),
  exitValueUsd: z.number().nullable(),
  exitValueBrl: z.number().nullable(),
  feesEarned: z.number(),
  status: z.enum(["open", "closed"]),
});

export const insertUserPoolSchema = userPoolSchema.omit({ id: true, userId: true });

export type UserPool = z.infer<typeof userPoolSchema>;
export type InsertUserPool = z.infer<typeof insertUserPoolSchema>;

// Collateral schema
export const collateralSchema = z.object({
  id: z.string(),
  userId: z.string(),
  asset: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
  ltv: z.number(),
  healthFactor: z.number(),
});

export const insertCollateralSchema = collateralSchema.omit({ id: true, userId: true });

export type Collateral = z.infer<typeof collateralSchema>;
export type InsertCollateral = z.infer<typeof insertCollateralSchema>;

// Borrow schema
export const borrowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  asset: z.string(),
  borrowedAmount: z.number(),
  interestRate: z.number(),
  valueUsd: z.number(),
});

export const insertBorrowSchema = borrowSchema.omit({ id: true, userId: true });

export type Borrow = z.infer<typeof borrowSchema>;
export type InsertBorrow = z.infer<typeof insertBorrowSchema>;

// Operation schema
export const operationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["buy", "sell", "swap", "transfer_in", "transfer_out", "lost_funds"]),
  tokenOut: z.string().nullable(),
  tokenIn: z.string().nullable(),
  amountOut: z.number().nullable(),
  amountIn: z.number().nullable(),
  valueUsd: z.number(),
  valueBrl: z.number(),
  walletFrom: z.string().nullable(),
  walletTo: z.string().nullable(),
  date: z.string(),
  description: z.string().optional(),
  transferType: z.enum(["internal", "external"]).nullable(),
});

export const insertOperationSchema = operationSchema.omit({ id: true, userId: true, transferType: true });

export type Operation = z.infer<typeof operationSchema>;
export type InsertOperation = z.infer<typeof insertOperationSchema>;

// Tax Report Entry
export const taxReportEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  operationType: z.string(),
  description: z.string(),
  valueUsd: z.number(),
  valueBrl: z.number(),
  source: z.enum(["operation", "pool", "borrow_lend"]),
  sourceId: z.string(),
});

export type TaxReportEntry = z.infer<typeof taxReportEntrySchema>;

// Capital Gains Entry
export const capitalGainsEntrySchema = z.object({
  month: z.string(),
  sellVolumeBrl: z.number(),
  taxDueBrl: z.number(),
  taxable: z.boolean(),
});

export type CapitalGainsEntry = z.infer<typeof capitalGainsEntrySchema>;

// Market Overview
export const marketOverviewSchema = z.object({
  totalMarketCap: z.number(),
  btcDominance: z.number(),
  fearGreedIndex: z.number(),
  fearGreedLabel: z.string(),
});

export type MarketOverview = z.infer<typeof marketOverviewSchema>;

// PTAX Rate
export const ptaxRateSchema = z.object({
  date: z.string(),
  rate: z.number(),
});

export type PtaxRate = z.infer<typeof ptaxRateSchema>;

// Chart Data
export const candleSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export type Candle = z.infer<typeof candleSchema>;
