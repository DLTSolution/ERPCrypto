import { pgTable, text, integer, real, boolean, serial, jsonb, uuid, numeric } from "drizzle-orm/pg-core";
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
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: text("supabase_user_id"),
  name: text("name").notNull(),
  address: text("address").notNull(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, userId: true, supabaseUserId: true });

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// User Pools table (liquidity positions)
export const userPools = pgTable("user_pools", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: text("supabase_user_id"),
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

export const insertUserPoolSchema = createInsertSchema(userPools).omit({ id: true, userId: true, supabaseUserId: true });

export type UserPool = typeof userPools.$inferSelect;
export type InsertUserPool = z.infer<typeof insertUserPoolSchema>;

// Collaterals table
export const collaterals = pgTable("collaterals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: uuid("supabase_user_id"),
  protocol: text("protocol"),
  asset: text("asset").notNull(),
  // numeric() without mode; type coercion handled in Zod schema
  amount: numeric("amount").notNull(),
  valueUsd: numeric("value_usd").notNull(),
  chain: text("chain"),
  hash: text("hash"),
  txDate: text("tx_date"),
  feeToken: text("fee_token"),
  feeAmount: numeric("fee_amount"),
  feeValueUsd: numeric("fee_value_usd"),
  ptax: numeric("ptax"),
  totalValueBrl: numeric("total_value_brl"),
  type: text("type").default("collateral"),
  parentCollateralId: integer("parent_collateral_id"),
});

export const insertCollateralSchema = createInsertSchema(collaterals)
  .omit({
    id: true,
    userId: true,
    supabaseUserId: true,
  })
  .extend({
    amount: z.coerce.number(),
    valueUsd: z.coerce.number(),
    feeAmount: z.coerce.number().nullable().optional(),
    feeValueUsd: z.coerce.number().nullable().optional(),
    ptax: z.coerce.number().nullable().optional(),
    totalValueBrl: z.coerce.number().nullable().optional(),
    type: z.enum(["collateral", "withdraw"]).optional(),
    parentCollateralId: z.number().int().nullable().optional(),
  });

export type Collateral = typeof collaterals.$inferSelect;
export type InsertCollateral = z.infer<typeof insertCollateralSchema>;

// Borrows table
export const borrows = pgTable("borrows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: uuid("supabase_user_id"),
  protocol: text("protocol"),
  asset: text("asset").notNull(),
  borrowedAmount: numeric("borrowed_amount").notNull(),
  interestRate: numeric("interest_rate").notNull(),
  valueUsd: numeric("value_usd").notNull(),
  chain: text("chain"),
  hash: text("hash"),
  txDate: text("tx_date"),
  feeToken: text("fee_token"),
  feeAmount: numeric("fee_amount"),
  feeValueUsd: numeric("fee_value_usd"),
  ptax: numeric("ptax"),
  totalValueBrl: numeric("total_value_brl"),
  type: text("type").default("borrow"),
  parentBorrowId: integer("parent_borrow_id"),
});

export const insertBorrowSchema = createInsertSchema(borrows)
  .omit({ id: true, userId: true, supabaseUserId: true })
  .extend({
    borrowedAmount: z.coerce.number(),
    interestRate: z.coerce.number(),
    valueUsd: z.coerce.number(),
    feeAmount: z.coerce.number().nullable().optional(),
    feeValueUsd: z.coerce.number().nullable().optional(),
    ptax: z.coerce.number().nullable().optional(),
    totalValueBrl: z.coerce.number().nullable().optional(),
  });

export type Borrow = typeof borrows.$inferSelect;
export type InsertBorrow = z.infer<typeof insertBorrowSchema>;

// Operations table - Hybrid approach with normalized columns + JSON details
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: text("supabase_user_id"),
  
  // Core normalized fields
  type: text("type").notNull(), // buy, sell, swap, transfer_in, transfer_out, p2p_in, p2p_out, payments, lost_funds
  chain: text("chain"), // arbitrum, base, bitcoin, bnb, ethereum, lightning, liquid, polygon, solana
  hash: text("hash"), // transaction hash
  date: text("date").notNull(),
  
  // Token fields
  tokenIn: text("token_in"),
  amountIn: real("amount_in"),
  tokenOut: text("token_out"),
  amountOut: real("amount_out"),
  
  // Value fields
  priceUsd: real("price_usd"),
  valueUsd: real("value_usd").notNull(),
  
  // Fee fields
  feeToken: text("fee_token"),
  amountFee: real("amount_fee"),
  feeValueUsd: real("fee_value_usd"),
  
  // BRL conversion
  ptax: real("ptax"),
  totalValueBrl: real("total_value_brl").notNull(),
  
  // JSON for additional dynamic fields
  details: jsonb("details"), // walletFrom, walletTo, description, transferType, etc.
});

// Define the details JSON schema
export const operationDetailsSchema = z.object({
  walletFrom: z.string().nullable().optional(),
  walletTo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  transferType: z.enum(["internal", "external"]).nullable().optional(),
}).partial();

export type OperationDetails = z.infer<typeof operationDetailsSchema>;

export const insertOperationSchema = createInsertSchema(operations).omit({ 
  id: true, 
  userId: true, 
  supabaseUserId: true 
}).extend({
  details: operationDetailsSchema.optional(),
});

export type Operation = typeof operations.$inferSelect;
export type InsertOperation = z.infer<typeof insertOperationSchema>;

// PTAX Rates table (cache for BCB API)
export const ptaxRates = pgTable("ptax_rates", {
  date: text("date").primaryKey(), // YYYY-MM-DD format
  cotacao: real("cotacao").notNull(),
  fetchedAt: text("fetched_at").notNull(), // ISO timestamp
});

export const insertPtaxRateSchema = createInsertSchema(ptaxRates);

export type PtaxRateRecord = typeof ptaxRates.$inferSelect;
export type InsertPtaxRateRecord = z.infer<typeof insertPtaxRateSchema>;

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
