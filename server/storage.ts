import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Wallet,
  InsertWallet,
  Token,
  Pool,
  UserPool,
  InsertUserPool,
  Collateral,
  InsertCollateral,
  Borrow,
  InsertBorrow,
  Operation,
  InsertOperation,
  TaxReportEntry,
  CapitalGainsEntry,
  MarketOverview,
  Candle,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wallets
  getWallets(userId: string): Promise<Wallet[]>;
  getWallet(id: string): Promise<Wallet | undefined>;
  createWallet(userId: string, wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, wallet: InsertWallet): Promise<Wallet | undefined>;
  deleteWallet(id: string): Promise<boolean>;

  // Market Data
  getMarketOverview(): Promise<MarketOverview>;
  getTokens(): Promise<Token[]>;
  getPools(): Promise<Pool[]>;
  getCandles(tokenId: string, timeframe: string): Promise<Candle[]>;

  // User Pools
  getUserPools(userId: string): Promise<UserPool[]>;
  createUserPool(userId: string, pool: InsertUserPool): Promise<UserPool>;

  // Collaterals
  getCollaterals(userId: string): Promise<Collateral[]>;
  createCollateral(userId: string, collateral: InsertCollateral): Promise<Collateral>;

  // Borrows
  getBorrows(userId: string): Promise<Borrow[]>;
  createBorrow(userId: string, borrow: InsertBorrow): Promise<Borrow>;

  // Operations
  getOperations(userId: string): Promise<Operation[]>;
  createOperation(userId: string, operation: InsertOperation, wallets: Wallet[]): Promise<Operation>;

  // Tax
  getTaxReport(userId: string): Promise<TaxReportEntry[]>;
  getCapitalGains(userId: string): Promise<CapitalGainsEntry[]>;
}

// Mock data generators
function generateMockTokens(): Token[] {
  return [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 97234.56, change24h: 2.34, marketCap: 1920000000000, rank: 1, volume24h: 48500000000 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 3456.78, change24h: -1.23, marketCap: 415000000000, rank: 2, volume24h: 21300000000 },
    { id: "tether", symbol: "USDT", name: "Tether", price: 1.00, change24h: 0.01, marketCap: 95000000000, rank: 3, volume24h: 78000000000 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 645.32, change24h: 3.45, marketCap: 96500000000, rank: 4, volume24h: 2100000000 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 234.56, change24h: 5.67, marketCap: 112000000000, rank: 5, volume24h: 5800000000 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 2.34, change24h: -2.12, marketCap: 134000000000, rank: 6, volume24h: 8900000000 },
    { id: "cardano", symbol: "ADA", name: "Cardano", price: 1.05, change24h: 4.56, marketCap: 37000000000, rank: 7, volume24h: 1200000000 },
    { id: "avalanche", symbol: "AVAX", name: "Avalanche", price: 45.67, change24h: -3.21, marketCap: 18500000000, rank: 8, volume24h: 890000000 },
    { id: "polkadot", symbol: "DOT", name: "Polkadot", price: 8.45, change24h: 1.89, marketCap: 12500000000, rank: 9, volume24h: 450000000 },
    { id: "chainlink", symbol: "LINK", name: "Chainlink", price: 18.92, change24h: 6.78, marketCap: 11800000000, rank: 10, volume24h: 780000000 },
    { id: "polygon", symbol: "MATIC", name: "Polygon", price: 0.52, change24h: -1.45, marketCap: 4800000000, rank: 11, volume24h: 320000000 },
    { id: "uniswap", symbol: "UNI", name: "Uniswap", price: 14.56, change24h: 2.34, marketCap: 10900000000, rank: 12, volume24h: 280000000 },
  ];
}

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

function generateMockCandles(basePrice: number): Candle[] {
  const candles: Candle[] = [];
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
    const volume = Math.random() * 1000000;

    candles.push({ time: Math.floor(time / 1000), open, high, low, close, volume });
    price = close;
  }

  return candles;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private wallets: Map<string, Wallet>;
  private userPools: Map<string, UserPool>;
  private collaterals: Map<string, Collateral>;
  private borrows: Map<string, Borrow>;
  private operations: Map<string, Operation>;
  private tokens: Token[];
  private pools: Pool[];

  constructor() {
    this.users = new Map();
    this.wallets = new Map();
    this.userPools = new Map();
    this.collaterals = new Map();
    this.borrows = new Map();
    this.operations = new Map();
    this.tokens = generateMockTokens();
    this.pools = generateMockPools();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wallets
  async getWallets(userId: string): Promise<Wallet[]> {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    return this.wallets.get(id);
  }

  async createWallet(userId: string, wallet: InsertWallet): Promise<Wallet> {
    const id = randomUUID();
    const newWallet: Wallet = { ...wallet, id, userId };
    this.wallets.set(id, newWallet);
    return newWallet;
  }

  async updateWallet(id: string, wallet: InsertWallet): Promise<Wallet | undefined> {
    const existing = this.wallets.get(id);
    if (!existing) return undefined;
    const updated: Wallet = { ...existing, ...wallet };
    this.wallets.set(id, updated);
    return updated;
  }

  async deleteWallet(id: string): Promise<boolean> {
    return this.wallets.delete(id);
  }

  // Market Data
  async getMarketOverview(): Promise<MarketOverview> {
    return {
      totalMarketCap: 3250000000000,
      btcDominance: 57.8,
      fearGreedIndex: 72,
      fearGreedLabel: "Greed",
    };
  }

  async getTokens(): Promise<Token[]> {
    return this.tokens;
  }

  async getPools(): Promise<Pool[]> {
    return this.pools;
  }

  async getCandles(tokenId: string, _timeframe: string): Promise<Candle[]> {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return [];
    return generateMockCandles(token.price);
  }

  // User Pools
  async getUserPools(userId: string): Promise<UserPool[]> {
    return Array.from(this.userPools.values()).filter((p) => p.userId === userId);
  }

  async createUserPool(userId: string, pool: InsertUserPool): Promise<UserPool> {
    const id = randomUUID();
    const newPool: UserPool = { ...pool, id, userId };
    this.userPools.set(id, newPool);
    return newPool;
  }

  // Collaterals
  async getCollaterals(userId: string): Promise<Collateral[]> {
    return Array.from(this.collaterals.values()).filter((c) => c.userId === userId);
  }

  async createCollateral(userId: string, collateral: InsertCollateral): Promise<Collateral> {
    const id = randomUUID();
    const newCollateral: Collateral = { ...collateral, id, userId };
    this.collaterals.set(id, newCollateral);
    return newCollateral;
  }

  // Borrows
  async getBorrows(userId: string): Promise<Borrow[]> {
    return Array.from(this.borrows.values()).filter((b) => b.userId === userId);
  }

  async createBorrow(userId: string, borrow: InsertBorrow): Promise<Borrow> {
    const id = randomUUID();
    const newBorrow: Borrow = { ...borrow, id, userId };
    this.borrows.set(id, newBorrow);
    return newBorrow;
  }

  // Operations
  async getOperations(userId: string): Promise<Operation[]> {
    return Array.from(this.operations.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createOperation(
    userId: string,
    operation: InsertOperation,
    wallets: Wallet[]
  ): Promise<Operation> {
    const id = randomUUID();
    
    let transferType: "internal" | "external" | null = null;
    if (operation.type === "transfer_in" || operation.type === "transfer_out") {
      const fromExists = operation.walletFrom && wallets.some((w) => w.id === operation.walletFrom);
      const toExists = operation.walletTo && wallets.some((w) => w.id === operation.walletTo);
      
      if (fromExists && toExists) {
        transferType = "internal";
      } else {
        transferType = "external";
      }
    }

    const newOperation: Operation = {
      ...operation,
      id,
      userId,
      transferType,
    };
    this.operations.set(id, newOperation);
    return newOperation;
  }

  // Tax Reports
  async getTaxReport(userId: string): Promise<TaxReportEntry[]> {
    const entries: TaxReportEntry[] = [];
    
    // Add operations
    const operations = await this.getOperations(userId);
    for (const op of operations) {
      entries.push({
        id: op.id,
        date: op.date,
        operationType: op.type,
        description: op.description || `${op.type} ${op.tokenIn || op.tokenOut || ""}`.trim(),
        valueUsd: op.valueUsd,
        valueBrl: op.valueBrl,
        source: "operation",
        sourceId: op.id,
      });
    }

    // Add user pools fees
    const pools = await this.getUserPools(userId);
    for (const pool of pools) {
      if (pool.feesEarned > 0) {
        entries.push({
          id: `pool-fee-${pool.id}`,
          date: pool.exitDate || pool.entryDate,
          operationType: "pool_fees",
          description: `Fees from ${pool.pair} pool on ${pool.dex}`,
          valueUsd: pool.feesEarned,
          valueBrl: pool.feesEarned * 5.15, // Mock PTAX
          source: "pool",
          sourceId: pool.id,
        });
      }
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getCapitalGains(userId: string): Promise<CapitalGainsEntry[]> {
    const operations = await this.getOperations(userId);
    const sellOps = operations.filter((op) => op.type === "sell");

    // Group by month
    const monthlyData: Record<string, number> = {};
    for (const op of sellOps) {
      const month = op.date.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + op.valueBrl;
    }

    // Convert to entries
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

export const storage = new MemStorage();
