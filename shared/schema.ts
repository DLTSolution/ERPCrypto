import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ DATABASE TABLES ============

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, userId: true });

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// User Pools table (liquidity positions)
export const userPools = pgTable("user_pools", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dex: text("dex").notNull(),
  network: text("network").notNull(),
  pair: text("pair").notNull(),
  entryDate: text("entry_date").notNull(),
  entryValueUsd: real("entry_value_usd").notNull(),
  entryValueBrl: real("entry_value_brl").notNull(),
  priceRangeMin: real("price_range_min").notNull(),
  priceRangeMax: real("price_range_max").notNull(),
  exitDate: text("exit_date"),
  exitValueUsd: real("exit_value_usd"),
  exitValueBrl: real("exit_value_brl"),
  feesEarned: real("fees_earned").notNull().default(0),
  status: text("status").notNull().default("open"),
});

export const insertUserPoolSchema = createInsertSchema(userPools).omit({ id: true, userId: true });

export type UserPool = typeof userPools.$inferSelect;
export type InsertUserPool = z.infer<typeof insertUserPoolSchema>;

// Collaterals table
export const collaterals = pgTable("collaterals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  asset: text("asset").notNull(),
  amount: real("amount").notNull(),
  valueUsd: real("value_usd").notNull(),
  ltv: real("ltv").notNull(),
  healthFactor: real("health_factor").notNull(),
});

export const insertCollateralSchema = createInsertSchema(collaterals).omit({ id: true, userId: true });

export type Collateral = typeof collaterals.$inferSelect;
export type InsertCollateral = z.infer<typeof insertCollateralSchema>;

// Borrows table
export const borrows = pgTable("borrows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  asset: text("asset").notNull(),
  borrowedAmount: real("borrowed_amount").notNull(),
  interestRate: real("interest_rate").notNull(),
  valueUsd: real("value_usd").notNull(),
});

export const insertBorrowSchema = createInsertSchema(borrows).omit({ id: true, userId: true });

export type Borrow = typeof borrows.$inferSelect;
export type InsertBorrow = z.infer<typeof insertBorrowSchema>;

// Operations table
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // buy, sell, swap, transfer_in, transfer_out, lost_funds
  tokenOut: text("token_out"),
  tokenIn: text("token_in"),
  amountOut: real("amount_out"),
  amountIn: real("amount_in"),
  valueUsd: real("value_usd").notNull(),
  valueBrl: real("value_brl").notNull(),
  walletFrom: text("wallet_from"),
  walletTo: text("wallet_to"),
  date: text("date").notNull(),
  description: text("description"),
  transferType: text("transfer_type"), // internal, external
});

export const insertOperationSchema = createInsertSchema(operations).omit({ id: true, userId: true, transferType: true });

export type Operation = typeof operations.$inferSelect;
export type InsertOperation = z.infer<typeof insertOperationSchema>;

// ============ NON-DATABASE TYPES (API responses) ============

// Token/Market Data (from external API)
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

// Pool schema (for pools monitor - external data)
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

// Tax Report Entry (computed)
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

// Capital Gains Entry (computed)
export const capitalGainsEntrySchema = z.object({
  month: z.string(),
  sellVolumeBrl: z.number(),
  taxDueBrl: z.number(),
  taxable: z.boolean(),
});

export type CapitalGainsEntry = z.infer<typeof capitalGainsEntrySchema>;

// Market Overview (from external API)
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
