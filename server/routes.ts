import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateIN2991Report } from "./pdf-service";
import { supabase } from "./supabase";
import {
  insertWalletSchema,
  insertUserPoolSchema,
  insertCollateralSchema,
  insertBorrowSchema,
  insertOperationSchema,
} from "@shared/schema";

interface AuthenticatedRequest extends Request {
  supabaseUserId?: string;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.supabaseUserId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ROUTES (Supabase handles auth, these are for session verification) ============

  app.get("/api/auth/me", async (req: AuthenticatedRequest, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const token = authHeader.substring(7);
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      res.json({ 
        id: user.id, 
        email: user.email,
        username: user.user_metadata?.username || user.email?.split("@")[0]
      });
    } catch (error) {
      return res.status(401).json({ message: "Not authenticated" });
    }
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

  app.get("/api/wallets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const walletList = await storage.getWalletsBySupabaseId(req.supabaseUserId!);
      res.json(walletList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/wallets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertWalletSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("Wallet validation error:", parsed.error);
        return res.status(400).json({ message: "Invalid input" });
      }

      console.log("Creating wallet for user:", req.supabaseUserId, "data:", parsed.data);
      const wallet = await storage.createWalletForSupabaseUser(req.supabaseUserId!, parsed.data);
      console.log("Wallet created:", wallet);
      res.json(wallet);
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/wallets/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  app.delete("/api/wallets/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  app.get("/api/user-pools", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const pools = await storage.getUserPoolsBySupabaseId(req.supabaseUserId!);
      res.json(pools);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/user-pools", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertUserPoolSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const pool = await storage.createUserPoolForSupabaseUser(req.supabaseUserId!, parsed.data);
      res.json(pool);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ COLLATERAL ROUTES (PROTECTED) ============

  app.get("/api/collaterals", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const collateralList = await storage.getCollateralsBySupabaseId(req.supabaseUserId!);
      res.json(collateralList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/collaterals", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertCollateralSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const collateral = await storage.createCollateralForSupabaseUser(req.supabaseUserId!, parsed.data);
      res.json(collateral);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ BORROW ROUTES (PROTECTED) ============

  app.get("/api/borrows", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const borrowList = await storage.getBorrowsBySupabaseId(req.supabaseUserId!);
      res.json(borrowList);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/borrows", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertBorrowSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const borrow = await storage.createBorrowForSupabaseUser(req.supabaseUserId!, parsed.data);
      res.json(borrow);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ OPERATIONS ROUTES (PROTECTED) ============

  app.get("/api/operations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const operationList = await storage.getOperationsBySupabaseId(req.supabaseUserId!);
      res.json(operationList);
    } catch (error) {
      console.error("GET /api/operations error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/operations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertOperationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const userWallets = await storage.getWalletsBySupabaseId(req.supabaseUserId!);
      const operation = await storage.createOperationForSupabaseUser(
        req.supabaseUserId!,
        parsed.data,
        userWallets
      );
      res.json(operation);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ============ TAX ROUTES (PROTECTED) ============

  app.get("/api/tax/report", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const report = await storage.getTaxReportBySupabaseId(req.supabaseUserId!);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tax/capital-gains", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const gains = await storage.getCapitalGainsBySupabaseId(req.supabaseUserId!);
      res.json(gains);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/tax/in2991-pdf", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const supabaseUserId = req.supabaseUserId!;

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const taxEntries = await storage.getTaxReportBySupabaseId(supabaseUserId);
      const capitalGains = await storage.getCapitalGainsBySupabaseId(supabaseUserId);
      const ptaxData = await storage.getPtaxRate();

      const yearEntries = taxEntries.filter((entry) => 
        entry.date.startsWith(year.toString())
      );
      const yearGains = capitalGains.filter((entry) => 
        entry.month.startsWith(year.toString())
      );

      const pdfDoc = generateIN2991Report({
        username: supabaseUserId.substring(0, 8),
        year,
        taxEntries: yearEntries,
        capitalGains: yearGains,
        ptaxRate: ptaxData.rate,
        generatedAt: new Date(),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="IN2991_${year}.pdf"`
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
