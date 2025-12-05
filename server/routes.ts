import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { generateIN2991Report } from "./pdf-service";
import {
  insertUserSchema,
  insertWalletSchema,
  insertUserPoolSchema,
  insertCollateralSchema,
  insertBorrowSchema,
  insertOperationSchema,
} from "@shared/schema";

const SALT_ROUNDS = 10;

// Session user type extension
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ROUTES ============

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
      const user = await storage.createUser({
        username: parsed.data.username,
        password: hashedPassword,
      });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  });

  // ============ MARKET ROUTES (PUBLIC) ============

  app.get("/api/market/overview", async (_req, res) => {
    try {
      const overview = await storage.getMarketOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/market/tokens", async (_req, res) => {
    try {
      const tokens = await storage.getTokens();
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ POOLS ROUTES (PUBLIC) ============

  app.get("/api/pools", async (_req, res) => {
    try {
      const pools = await storage.getPools();
      res.json(pools);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ PTAX ROUTES (PUBLIC) ============

  app.get("/api/ptax", async (_req, res) => {
    try {
      const ptax = await storage.getPtaxRate();
      res.json(ptax);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/ptax/:date", async (req, res) => {
    try {
      const rate = await storage.getHistoricalPtaxRate(req.params.date);
      res.json({ date: req.params.date, rate });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ CHARTS ROUTES (PUBLIC) ============

  app.get("/api/charts/:tokenId/:timeframe", async (req, res) => {
    try {
      const { tokenId, timeframe } = req.params;
      const candles = await storage.getCandles(tokenId, timeframe);
      res.json(candles);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ WALLET ROUTES (PROTECTED) ============

  app.get("/api/wallets", requireAuth, async (req, res) => {
    try {
      const walletList = await storage.getWallets(req.session.userId!);
      res.json(walletList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/wallets", requireAuth, async (req, res) => {
    try {
      const parsed = insertWalletSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const wallet = await storage.createWallet(req.session.userId!, parsed.data);
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/wallets/:id", requireAuth, async (req, res) => {
    try {
      const parsed = insertWalletSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const wallet = await storage.updateWallet(parseInt(req.params.id), parsed.data);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/wallets/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteWallet(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ USER POOLS ROUTES (PROTECTED) ============

  app.get("/api/user-pools", requireAuth, async (req, res) => {
    try {
      const pools = await storage.getUserPools(req.session.userId!);
      res.json(pools);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/user-pools", requireAuth, async (req, res) => {
    try {
      const parsed = insertUserPoolSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const pool = await storage.createUserPool(req.session.userId!, parsed.data);
      res.json(pool);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ COLLATERAL ROUTES (PROTECTED) ============

  app.get("/api/collaterals", requireAuth, async (req, res) => {
    try {
      const collateralList = await storage.getCollaterals(req.session.userId!);
      res.json(collateralList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/collaterals", requireAuth, async (req, res) => {
    try {
      const parsed = insertCollateralSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const collateral = await storage.createCollateral(req.session.userId!, parsed.data);
      res.json(collateral);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ BORROW ROUTES (PROTECTED) ============

  app.get("/api/borrows", requireAuth, async (req, res) => {
    try {
      const borrowList = await storage.getBorrows(req.session.userId!);
      res.json(borrowList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/borrows", requireAuth, async (req, res) => {
    try {
      const parsed = insertBorrowSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const borrow = await storage.createBorrow(req.session.userId!, parsed.data);
      res.json(borrow);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ OPERATIONS ROUTES (PROTECTED) ============

  app.get("/api/operations", requireAuth, async (req, res) => {
    try {
      const operationList = await storage.getOperations(req.session.userId!);
      res.json(operationList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/operations", requireAuth, async (req, res) => {
    try {
      const parsed = insertOperationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const userWallets = await storage.getWallets(req.session.userId!);
      const operation = await storage.createOperation(
        req.session.userId!,
        parsed.data,
        userWallets
      );
      res.json(operation);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ TAX ROUTES (PROTECTED) ============

  app.get("/api/tax/report", requireAuth, async (req, res) => {
    try {
      const report = await storage.getTaxReport(req.session.userId!);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tax/capital-gains", requireAuth, async (req, res) => {
    try {
      const gains = await storage.getCapitalGains(req.session.userId!);
      res.json(gains);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tax/in2991-pdf", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const taxEntries = await storage.getTaxReport(userId);
      const capitalGains = await storage.getCapitalGains(userId);
      const ptaxData = await storage.getPtaxRate();

      const yearEntries = taxEntries.filter((entry) => 
        entry.date.startsWith(year.toString())
      );
      const yearGains = capitalGains.filter((entry) => 
        entry.month.startsWith(year.toString())
      );

      const pdfDoc = generateIN2991Report({
        username: user.username,
        year,
        taxEntries: yearEntries,
        capitalGains: yearGains,
        ptaxRate: ptaxData.rate,
        generatedAt: new Date(),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="IN2991_${year}_${user.username}.pdf"`
      );

      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Error generating PDF" });
    }
  });

  return httpServer;
}
