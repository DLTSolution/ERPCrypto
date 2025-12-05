import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  wallets,
  userPools,
  collaterals,
  borrows,
  operations,
  type User,
  type InsertUser,
  type Wallet,
  type InsertWallet,
  type UserPool,
  type InsertUserPool,
  type Collateral,
  type InsertCollateral,
  type Borrow,
  type InsertBorrow,
  type Operation,
  type InsertOperation,
  type Token,
  type Pool,
  type MarketOverview,
  type Candle,
  type TaxReportEntry,
  type CapitalGainsEntry,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wallets
  getWallets(userId: number): Promise<Wallet[]>;
  getWallet(id: number): Promise<Wallet | undefined>;
  createWallet(userId: number, wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, wallet: InsertWallet): Promise<Wallet | undefined>;
  deleteWallet(id: number): Promise<boolean>;

  // Market Data
  getMarketOverview(): Promise<MarketOverview>;
  getTokens(): Promise<Token[]>;
  getPools(): Promise<Pool[]>;
  getCandles(tokenId: string, timeframe: string): Promise<Candle[]>;

  // PTAX (BRL/USD)
  getPtaxRate(): Promise<{ rate: number; date: string }>;
  getHistoricalPtaxRate(date: string): Promise<number>;

  // User Pools
  getUserPools(userId: number): Promise<UserPool[]>;
  createUserPool(userId: number, pool: InsertUserPool): Promise<UserPool>;

  // Collaterals
  getCollaterals(userId: number): Promise<Collateral[]>;
  createCollateral(userId: number, collateral: InsertCollateral): Promise<Collateral>;

  // Borrows
  getBorrows(userId: number): Promise<Borrow[]>;
  createBorrow(userId: number, borrow: InsertBorrow): Promise<Borrow>;

  // Operations
  getOperations(userId: number): Promise<Operation[]>;
  createOperation(userId: number, operation: InsertOperation, userWallets: Wallet[]): Promise<Operation>;

  // Tax
  getTaxReport(userId: number): Promise<TaxReportEntry[]>;
  getCapitalGains(userId: number): Promise<CapitalGainsEntry[]>;
}

// ============ COINGECKO API SERVICE ============

interface CoinGeckoGlobalData {
  data: {
    total_market_cap: Record<string, number>;
    market_cap_percentage: Record<string, number>;
  };
}

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
  }>;
}

class CoinGeckoService {
  private cache: {
    tokens?: { data: Token[]; timestamp: number };
    overview?: { data: MarketOverview; timestamp: number };
  } = {};
  private cacheTimeout = 300000; // 5 minutes cache

  private fallbackTokens: Token[] = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 97234.56, change24h: 2.34, marketCap: 1920000000000, rank: 1, volume24h: 48500000000 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 3456.78, change24h: -1.23, marketCap: 415000000000, rank: 2, volume24h: 21300000000 },
    { id: "tether", symbol: "USDT", name: "Tether", price: 1.00, change24h: 0.01, marketCap: 95000000000, rank: 3, volume24h: 78000000000 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 645.32, change24h: 3.45, marketCap: 96500000000, rank: 4, volume24h: 2100000000 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 234.56, change24h: 5.67, marketCap: 112000000000, rank: 5, volume24h: 5800000000 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 2.34, change24h: -2.12, marketCap: 134000000000, rank: 6, volume24h: 8900000000 },
    { id: "cardano", symbol: "ADA", name: "Cardano", price: 1.05, change24h: 4.56, marketCap: 37000000000, rank: 7, volume24h: 1200000000 },
    { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", price: 45.67, change24h: -3.21, marketCap: 18500000000, rank: 8, volume24h: 890000000 },
    { id: "polkadot", symbol: "DOT", name: "Polkadot", price: 8.45, change24h: 1.89, marketCap: 12500000000, rank: 9, volume24h: 450000000 },
    { id: "chainlink", symbol: "LINK", name: "Chainlink", price: 18.92, change24h: 6.78, marketCap: 11800000000, rank: 10, volume24h: 780000000 },
    { id: "matic-network", symbol: "MATIC", name: "Polygon", price: 0.52, change24h: -1.45, marketCap: 4800000000, rank: 11, volume24h: 320000000 },
    { id: "uniswap", symbol: "UNI", name: "Uniswap", price: 14.56, change24h: 2.34, marketCap: 10900000000, rank: 12, volume24h: 280000000 },
  ];

  private fallbackOverview: MarketOverview = {
    totalMarketCap: 3250000000000,
    btcDominance: 57.8,
    fearGreedIndex: 72,
    fearGreedLabel: "Greed",
  };

  async getTokens(): Promise<Token[]> {
    const now = Date.now();
    if (this.cache.tokens && now - this.cache.tokens.timestamp < this.cacheTimeout) {
      return this.cache.tokens.data;
    }

    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h"
      );

      if (!response.ok) {
        console.warn("CoinGecko API rate limited, using fallback data");
        return this.fallbackTokens;
      }

      const data: CoinGeckoToken[] = await response.json();
      const tokens: Token[] = data.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price || 0,
        change24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap || 0,
        rank: coin.market_cap_rank || 0,
        volume24h: coin.total_volume || 0,
        image: coin.image,
      }));

      this.cache.tokens = { data: tokens, timestamp: now };
      return tokens;
    } catch (error) {
      console.error("CoinGecko API error:", error);
      return this.fallbackTokens;
    }
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const now = Date.now();
    if (this.cache.overview && now - this.cache.overview.timestamp < this.cacheTimeout) {
      return this.cache.overview.data;
    }

    try {
      const [globalResponse, fearGreedResponse] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/global"),
        fetch("https://api.alternative.me/fng/"),
      ]);

      let totalMarketCap = this.fallbackOverview.totalMarketCap;
      let btcDominance = this.fallbackOverview.btcDominance;
      let fearGreedIndex = this.fallbackOverview.fearGreedIndex;
      let fearGreedLabel = this.fallbackOverview.fearGreedLabel;

      if (globalResponse.ok) {
        const globalData: CoinGeckoGlobalData = await globalResponse.json();
        totalMarketCap = globalData.data.total_market_cap.usd || totalMarketCap;
        btcDominance = globalData.data.market_cap_percentage.btc || btcDominance;
      }

      if (fearGreedResponse.ok) {
        const fearGreedData: FearGreedResponse = await fearGreedResponse.json();
        if (fearGreedData.data && fearGreedData.data[0]) {
          fearGreedIndex = parseInt(fearGreedData.data[0].value, 10);
          fearGreedLabel = fearGreedData.data[0].value_classification;
        }
      }

      const overview: MarketOverview = {
        totalMarketCap,
        btcDominance,
        fearGreedIndex,
        fearGreedLabel,
      };

      this.cache.overview = { data: overview, timestamp: now };
      return overview;
    } catch (error) {
      console.error("Market overview API error:", error);
      return this.fallbackOverview;
    }
  }

  async getCandles(tokenId: string, days: string = "7"): Promise<Candle[]> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/ohlc?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        return this.generateMockCandles(tokenId);
      }

      const data: number[][] = await response.json();
      return data.map(([time, open, high, low, close]) => ({
        time: Math.floor(time / 1000),
        open,
        high,
        low,
        close,
      }));
    } catch (error) {
      console.error("OHLC API error:", error);
      return this.generateMockCandles(tokenId);
    }
  }

  private generateMockCandles(tokenId: string): Candle[] {
    const token = this.fallbackTokens.find((t) => t.id === tokenId);
    const basePrice = token?.price || 100;
    const candlesData: Candle[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 100; i >= 0; i--) {
      const time = now - i * 3600000;
      const volatility = price * 0.02;
      const open = price;
      const change = (Math.random() - 0.5) * volatility;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      candlesData.push({ time: Math.floor(time / 1000), open, high, low, close });
      price = close;
    }

    return candlesData;
  }
}

const coinGeckoService = new CoinGeckoService();

// ============ PTAX API SERVICE (BANCO CENTRAL DO BRASIL) ============

interface PtaxResponse {
  value: Array<{
    cotacaoCompra: number;
    cotacaoVenda: number;
    dataHoraCotacao: string;
  }>;
}

class PtaxService {
  private cache: { rate: number; date: string; timestamp: number } | null = null;
  private cacheTimeout = 3600000; // 1 hour cache

  private fallbackRate = 5.15; // Fallback BRL/USD rate

  async getCurrentRate(): Promise<{ rate: number; date: string }> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < this.cacheTimeout) {
      return { rate: this.cache.rate, date: this.cache.date };
    }

    try {
      // Get PTAX rate from BCB (last 7 days to ensure we get data)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const formatDate = (d: Date) =>
        `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${formatDate(startDate)}'&@dataFinalCotacao='${formatDate(endDate)}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn("PTAX API error, using fallback rate");
        return { rate: this.fallbackRate, date: new Date().toISOString().split("T")[0] };
      }

      const data: PtaxResponse = await response.json();
      if (data.value && data.value.length > 0) {
        const latestQuote = data.value[0];
        const rate = latestQuote.cotacaoVenda;
        const date = latestQuote.dataHoraCotacao.split(" ")[0];

        this.cache = { rate, date, timestamp: now };
        return { rate, date };
      }

      return { rate: this.fallbackRate, date: new Date().toISOString().split("T")[0] };
    } catch (error) {
      console.error("PTAX API error:", error);
      return { rate: this.fallbackRate, date: new Date().toISOString().split("T")[0] };
    }
  }

  async getHistoricalRate(date: string): Promise<number> {
    try {
      // Parse date and format for BCB API
      const d = new Date(date);
      const formatDate = (d: Date) =>
        `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formatDate(d)}'&$format=json`;

      const response = await fetch(url);

      if (!response.ok) {
        return this.fallbackRate;
      }

      const data: PtaxResponse = await response.json();
      if (data.value && data.value.length > 0) {
        return data.value[0].cotacaoVenda;
      }

      return this.fallbackRate;
    } catch (error) {
      console.error("Historical PTAX error:", error);
      return this.fallbackRate;
    }
  }
}

const ptaxService = new PtaxService();

// ============ MOCK POOLS DATA ============

function generateMockPools(): Pool[] {
  const networks = ["Ethereum", "Solana", "Base", "Arbitrum", "Polygon", "BSC"];
  const dexes = ["Uniswap", "Raydium", "Orca", "PancakeSwap", "Curve", "Balancer"];
  const pairs = [
    { pair: "ETH/USDC", token0: "ETH", token1: "USDC" },
    { pair: "BTC/USDT", token0: "BTC", token1: "USDT" },
    { pair: "SOL/USDC", token0: "SOL", token1: "USDC" },
    { pair: "ETH/BTC", token0: "ETH", token1: "BTC" },
    { pair: "MATIC/ETH", token0: "MATIC", token1: "ETH" },
    { pair: "AVAX/USDC", token0: "AVAX", token1: "USDC" },
    { pair: "LINK/ETH", token0: "LINK", token1: "ETH" },
    { pair: "UNI/USDT", token0: "UNI", token1: "USDT" },
  ];

  return pairs.flatMap((p, i) =>
    networks.slice(0, 3).map((network, j) => {
      const tvl = Math.random() * 500000000 + 1000000;
      const volume = Math.random() * tvl * 2;
      return {
        id: `pool-${i}-${j}`,
        pair: p.pair,
        network,
        dex: dexes[(i + j) % dexes.length],
        tvl,
        volume24h: volume,
        efficiency: volume / tvl,
        token0: p.token0,
        token1: p.token1,
        apr: Math.random() * 50 + 5,
      };
    })
  );
}

// ============ DATABASE STORAGE IMPLEMENTATION ============

export class DatabaseStorage implements IStorage {
  private pools: Pool[];

  constructor() {
    this.pools = generateMockPools();
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Wallets
  async getWallets(userId: number): Promise<Wallet[]> {
    return await db.select().from(wallets).where(eq(wallets.userId, userId));
  }

  async getWalletsBySupabaseId(supabaseUserId: string): Promise<Wallet[]> {
    return await db.select().from(wallets).where(eq(wallets.supabaseUserId, supabaseUserId));
  }

  async getWallet(id: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async createWallet(userId: number, wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values({ ...wallet, userId }).returning();
    return newWallet;
  }

  async createWalletForSupabaseUser(supabaseUserId: string, wallet: InsertWallet): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values({ ...wallet, supabaseUserId }).returning();
    return newWallet;
  }

  async updateWallet(id: number, wallet: InsertWallet): Promise<Wallet | undefined> {
    const [updated] = await db.update(wallets).set(wallet).where(eq(wallets.id, id)).returning();
    return updated || undefined;
  }

  async deleteWallet(id: number): Promise<boolean> {
    const result = await db.delete(wallets).where(eq(wallets.id, id)).returning();
    return result.length > 0;
  }

  // Market Data - Now using CoinGecko API
  async getMarketOverview(): Promise<MarketOverview> {
    return coinGeckoService.getMarketOverview();
  }

  async getTokens(): Promise<Token[]> {
    return coinGeckoService.getTokens();
  }

  async getPools(): Promise<Pool[]> {
    return this.pools;
  }

  async getCandles(tokenId: string, timeframe: string): Promise<Candle[]> {
    const daysMap: Record<string, string> = {
      "1h": "1",
      "4h": "1",
      "1d": "7",
      "1w": "30",
      "1m": "90",
    };
    const days = daysMap[timeframe] || "7";
    return coinGeckoService.getCandles(tokenId, days);
  }

  // PTAX (BRL/USD) - Now using Banco Central API
  async getPtaxRate(): Promise<{ rate: number; date: string }> {
    return ptaxService.getCurrentRate();
  }

  async getHistoricalPtaxRate(date: string): Promise<number> {
    return ptaxService.getHistoricalRate(date);
  }

  // User Pools
  async getUserPools(userId: number): Promise<UserPool[]> {
    return await db.select().from(userPools).where(eq(userPools.userId, userId));
  }

  async getUserPoolsBySupabaseId(supabaseUserId: string): Promise<UserPool[]> {
    return await db.select().from(userPools).where(eq(userPools.supabaseUserId, supabaseUserId));
  }

  async createUserPool(userId: number, pool: InsertUserPool): Promise<UserPool> {
    const [newPool] = await db.insert(userPools).values({ ...pool, userId }).returning();
    return newPool;
  }

  async createUserPoolForSupabaseUser(supabaseUserId: string, pool: InsertUserPool): Promise<UserPool> {
    const [newPool] = await db.insert(userPools).values({ ...pool, supabaseUserId }).returning();
    return newPool;
  }

  // Collaterals
  async getCollaterals(userId: number): Promise<Collateral[]> {
    return await db.select().from(collaterals).where(eq(collaterals.userId, userId));
  }

  async getCollateralsBySupabaseId(supabaseUserId: string): Promise<Collateral[]> {
    return await db.select().from(collaterals).where(eq(collaterals.supabaseUserId, supabaseUserId));
  }

  async createCollateral(userId: number, collateral: InsertCollateral): Promise<Collateral> {
    const [newCollateral] = await db.insert(collaterals).values({ ...collateral, userId }).returning();
    return newCollateral;
  }

  async createCollateralForSupabaseUser(supabaseUserId: string, collateral: InsertCollateral): Promise<Collateral> {
    const [newCollateral] = await db.insert(collaterals).values({ ...collateral, supabaseUserId }).returning();
    return newCollateral;
  }

  // Borrows
  async getBorrows(userId: number): Promise<Borrow[]> {
    return await db.select().from(borrows).where(eq(borrows.userId, userId));
  }

  async getBorrowsBySupabaseId(supabaseUserId: string): Promise<Borrow[]> {
    return await db.select().from(borrows).where(eq(borrows.supabaseUserId, supabaseUserId));
  }

  async createBorrow(userId: number, borrow: InsertBorrow): Promise<Borrow> {
    const [newBorrow] = await db.insert(borrows).values({ ...borrow, userId }).returning();
    return newBorrow;
  }

  async createBorrowForSupabaseUser(supabaseUserId: string, borrow: InsertBorrow): Promise<Borrow> {
    const [newBorrow] = await db.insert(borrows).values({ ...borrow, supabaseUserId }).returning();
    return newBorrow;
  }

  // Operations
  async getOperations(userId: number): Promise<Operation[]> {
    return await db
      .select()
      .from(operations)
      .where(eq(operations.userId, userId))
      .orderBy(desc(operations.date));
  }

  async getOperationsBySupabaseId(supabaseUserId: string): Promise<Operation[]> {
    return await db
      .select()
      .from(operations)
      .where(eq(operations.supabaseUserId, supabaseUserId))
      .orderBy(desc(operations.date));
  }

  async createOperation(
    userId: number,
    operation: InsertOperation,
    userWallets: Wallet[]
  ): Promise<Operation> {
    let transferType: string | null = null;
    if (operation.type === "transfer_in" || operation.type === "transfer_out") {
      const fromExists = operation.walletFrom && userWallets.some((w) => w.id.toString() === operation.walletFrom);
      const toExists = operation.walletTo && userWallets.some((w) => w.id.toString() === operation.walletTo);

      if (fromExists && toExists) {
        transferType = "internal";
      } else {
        transferType = "external";
      }
    }

    const [newOperation] = await db
      .insert(operations)
      .values({ ...operation, userId, transferType })
      .returning();
    return newOperation;
  }

  async createOperationForSupabaseUser(
    supabaseUserId: string,
    operation: InsertOperation,
    userWallets: Wallet[]
  ): Promise<Operation> {
    let transferType: string | null = null;
    if (operation.type === "transfer_in" || operation.type === "transfer_out") {
      const fromExists = operation.walletFrom && userWallets.some((w) => w.id.toString() === operation.walletFrom);
      const toExists = operation.walletTo && userWallets.some((w) => w.id.toString() === operation.walletTo);

      if (fromExists && toExists) {
        transferType = "internal";
      } else {
        transferType = "external";
      }
    }

    const [newOperation] = await db
      .insert(operations)
      .values({ ...operation, supabaseUserId, transferType })
      .returning();
    return newOperation;
  }

  // Tax Reports
  async getTaxReport(userId: number): Promise<TaxReportEntry[]> {
    const entries: TaxReportEntry[] = [];

    const ops = await this.getOperations(userId);
    for (const op of ops) {
      entries.push({
        id: op.id.toString(),
        date: op.date,
        operationType: op.type,
        description: op.description || `${op.type} ${op.tokenIn || op.tokenOut || ""}`.trim(),
        valueUsd: op.valueUsd,
        valueBrl: op.valueBrl,
        source: "operation",
        sourceId: op.id.toString(),
      });
    }

    const pools = await this.getUserPools(userId);
    for (const pool of pools) {
      if (pool.feesEarned > 0) {
        entries.push({
          id: `pool-fee-${pool.id}`,
          date: pool.exitDate || pool.entryDate,
          operationType: "pool_fees",
          description: `Fees from ${pool.pair} pool on ${pool.dex}`,
          valueUsd: pool.feesEarned,
          valueBrl: pool.feesEarned * 5.15,
          source: "pool",
          sourceId: pool.id.toString(),
        });
      }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTaxReportBySupabaseId(supabaseUserId: string): Promise<TaxReportEntry[]> {
    const entries: TaxReportEntry[] = [];

    const ops = await this.getOperationsBySupabaseId(supabaseUserId);
    for (const op of ops) {
      entries.push({
        id: op.id.toString(),
        date: op.date,
        operationType: op.type,
        description: op.description || `${op.type} ${op.tokenIn || op.tokenOut || ""}`.trim(),
        valueUsd: op.valueUsd,
        valueBrl: op.valueBrl,
        source: "operation",
        sourceId: op.id.toString(),
      });
    }

    const pools = await this.getUserPoolsBySupabaseId(supabaseUserId);
    for (const pool of pools) {
      if (pool.feesEarned > 0) {
        entries.push({
          id: `pool-fee-${pool.id}`,
          date: pool.exitDate || pool.entryDate,
          operationType: "pool_fees",
          description: `Fees from ${pool.pair} pool on ${pool.dex}`,
          valueUsd: pool.feesEarned,
          valueBrl: pool.feesEarned * 5.15,
          source: "pool",
          sourceId: pool.id.toString(),
        });
      }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getCapitalGains(userId: number): Promise<CapitalGainsEntry[]> {
    const ops = await this.getOperations(userId);
    const sellOps = ops.filter((op) => op.type === "sell");

    const monthlyData: Record<string, number> = {};
    for (const op of sellOps) {
      const month = op.date.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + op.valueBrl;
    }

    const entries: CapitalGainsEntry[] = Object.entries(monthlyData)
      .map(([month, sellVolumeBrl]) => {
        const taxable = sellVolumeBrl > 35000;
        return {
          month,
          sellVolumeBrl,
          taxDueBrl: taxable ? sellVolumeBrl * 0.15 : 0,
          taxable,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    return entries;
  }

  async getCapitalGainsBySupabaseId(supabaseUserId: string): Promise<CapitalGainsEntry[]> {
    const ops = await this.getOperationsBySupabaseId(supabaseUserId);
    const sellOps = ops.filter((op) => op.type === "sell");

    const monthlyData: Record<string, number> = {};
    for (const op of sellOps) {
      const month = op.date.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + op.valueBrl;
    }

    const entries: CapitalGainsEntry[] = Object.entries(monthlyData)
      .map(([month, sellVolumeBrl]) => {
        const taxable = sellVolumeBrl > 35000;
        return {
          month,
          sellVolumeBrl,
          taxDueBrl: taxable ? sellVolumeBrl * 0.15 : 0,
          taxable,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));

    return entries;
  }
}

export const storage = new DatabaseStorage();
