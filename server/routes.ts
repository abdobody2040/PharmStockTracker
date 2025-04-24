import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hasRole } from "./auth";
import { UserRole, insertStockItemSchema, insertAllocationSchema, insertMovementSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // All other routes are prefixed with /api
  
  // Users API
  app.get("/api/users", hasRole([UserRole.CEO, UserRole.ADMIN]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't return passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.get("/api/users/role/:role", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const role = req.params.role;
      const users = await storage.getUsersByRole(role);
      // Don't return passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users by role" });
    }
  });

  // Stock Items API
  app.get("/api/stock", async (req, res) => {
    try {
      const items = await storage.getAllStockItems();
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Error fetching stock items" });
    }
  });

  app.get("/api/stock/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getStockItem(id);
      if (!item) {
        return res.status(404).json({ message: "Stock item not found" });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: "Error fetching stock item" });
    }
  });

  app.post("/api/stock", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const validatedData = insertStockItemSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      // Check if item with same unique number already exists
      const existing = await storage.getStockItemByUniqueNumber(validatedData.uniqueNumber);
      if (existing) {
        return res.status(400).json({ message: "Item with this unique number already exists" });
      }
      
      const item = await storage.createStockItem(validatedData);
      
      // Create movement record
      await storage.createMovement({
        stockItemId: item.id,
        quantity: item.quantity,
        type: "add",
        performedBy: req.user.id
      });
      
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid stock item data" });
    }
  });

  app.put("/api/stock/:id", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingItem = await storage.getStockItem(id);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Stock item not found" });
      }
      
      const updatedItem = await storage.updateStockItem(id, req.body);
      
      // If quantity changed, create movement record
      if (req.body.quantity !== undefined && req.body.quantity !== existingItem.quantity) {
        const quantityDiff = req.body.quantity - existingItem.quantity;
        await storage.createMovement({
          stockItemId: id,
          quantity: Math.abs(quantityDiff),
          type: quantityDiff > 0 ? "add" : "remove",
          performedBy: req.user.id
        });
      }
      
      res.json(updatedItem);
    } catch (err) {
      res.status(400).json({ message: "Invalid stock item data" });
    }
  });

  app.get("/api/stock/expiring/:days", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER]), async (req, res) => {
    try {
      const days = parseInt(req.params.days);
      const items = await storage.getExpiringStockItems(days);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Error fetching expiring stock items" });
    }
  });

  app.get("/api/stock/low/:threshold", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER]), async (req, res) => {
    try {
      const threshold = parseInt(req.params.threshold);
      const items = await storage.getLowStockItems(threshold);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Error fetching low stock items" });
    }
  });

  // Allocations API
  app.get("/api/allocations", async (req, res) => {
    try {
      // If user is a Medical Rep, only show their allocations
      if (req.user.role === UserRole.MEDICAL_REP) {
        const allocations = await storage.getAllocationsForUser(req.user.id);
        return res.json(allocations);
      }
      
      // Otherwise show all allocations
      const allocations = await storage.getAllocations();
      res.json(allocations);
    } catch (err) {
      res.status(500).json({ message: "Error fetching allocations" });
    }
  });

  app.get("/api/allocations/user/:id", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const allocations = await storage.getAllocationsForUser(userId);
      res.json(allocations);
    } catch (err) {
      res.status(500).json({ message: "Error fetching user allocations" });
    }
  });

  app.post("/api/allocations", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const validatedData = insertAllocationSchema.parse({
        ...req.body,
        allocatedBy: req.user.id
      });
      
      // Check if stock item exists and has enough quantity
      const stockItem = await storage.getStockItem(validatedData.stockItemId);
      if (!stockItem) {
        return res.status(404).json({ message: "Stock item not found" });
      }
      
      if (stockItem.quantity < validatedData.quantity) {
        return res.status(400).json({ message: "Not enough stock available" });
      }
      
      const allocation = await storage.createAllocation(validatedData);
      
      // Create movement record
      await storage.createMovement({
        stockItemId: validatedData.stockItemId,
        quantity: validatedData.quantity,
        type: "allocate",
        toUserId: validatedData.userId,
        performedBy: req.user.id
      });
      
      res.status(201).json(allocation);
    } catch (err) {
      res.status(400).json({ message: "Invalid allocation data" });
    }
  });

  app.put("/api/allocations/:id/status", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.MARKETER, UserRole.SALES_MANAGER]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "received", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedAllocation = await storage.updateAllocationStatus(id, status);
      if (!updatedAllocation) {
        return res.status(404).json({ message: "Allocation not found" });
      }
      
      res.json(updatedAllocation);
    } catch (err) {
      res.status(500).json({ message: "Error updating allocation status" });
    }
  });

  // Movements API for reports
  app.get("/api/movements", hasRole([UserRole.CEO, UserRole.ADMIN]), async (req, res) => {
    try {
      const movements = await storage.getAllMovements();
      res.json(movements);
    } catch (err) {
      res.status(500).json({ message: "Error fetching movements" });
    }
  });

  app.get("/api/movements/stock/:id", hasRole([UserRole.CEO, UserRole.ADMIN, UserRole.STOCK_MANAGER]), async (req, res) => {
    try {
      const stockItemId = parseInt(req.params.id);
      const movements = await storage.getMovementsForStockItem(stockItemId);
      res.json(movements);
    } catch (err) {
      res.status(500).json({ message: "Error fetching stock movements" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
