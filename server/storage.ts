import { 
  User, InsertUser, StockItem, InsertStockItem, 
  Allocation, InsertAllocation, Movement, InsertMovement,
  users, stockItems, allocations, movements, UserRole
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, lte, gte } from "drizzle-orm";
import { addDays } from "date-fns";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Stock methods
  getStockItem(id: number): Promise<StockItem | undefined>;
  getStockItemByUniqueNumber(uniqueNumber: string): Promise<StockItem | undefined>;
  createStockItem(item: InsertStockItem): Promise<StockItem>;
  updateStockItem(id: number, item: Partial<StockItem>): Promise<StockItem | undefined>;
  getAllStockItems(): Promise<StockItem[]>;
  getExpiringStockItems(days: number): Promise<StockItem[]>;
  getLowStockItems(threshold: number): Promise<StockItem[]>;
  
  // Allocation methods
  getAllocationsForUser(userId: number): Promise<Allocation[]>;
  createAllocation(allocation: InsertAllocation): Promise<Allocation>;
  updateAllocationStatus(id: number, status: string): Promise<Allocation | undefined>;
  getAllocations(): Promise<Allocation[]>;
  
  // Movement methods
  createMovement(movement: InsertMovement): Promise<Movement>;
  getMovementsForStockItem(stockItemId: number): Promise<Movement[]>;
  getAllMovements(): Promise<Movement[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: new Date()
    }).returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }
  
  // Stock methods
  async getStockItem(id: number): Promise<StockItem | undefined> {
    const [item] = await db.select().from(stockItems).where(eq(stockItems.id, id));
    return item;
  }
  
  async getStockItemByUniqueNumber(uniqueNumber: string): Promise<StockItem | undefined> {
    const [item] = await db.select().from(stockItems).where(eq(stockItems.uniqueNumber, uniqueNumber));
    return item;
  }
  
  async createStockItem(itemData: InsertStockItem): Promise<StockItem> {
    const [item] = await db.insert(stockItems).values({
      ...itemData,
      createdAt: new Date()
    }).returning();
    return item;
  }
  
  async updateStockItem(id: number, itemData: Partial<StockItem>): Promise<StockItem | undefined> {
    const [updatedItem] = await db.update(stockItems)
      .set(itemData)
      .where(eq(stockItems.id, id))
      .returning();
    return updatedItem;
  }
  
  async getAllStockItems(): Promise<StockItem[]> {
    return await db.select().from(stockItems);
  }
  
  async getExpiringStockItems(days: number): Promise<StockItem[]> {
    const threshold = addDays(new Date(), days);
    return await db.select().from(stockItems).where(
      and(
        stockItems.expiryDate.isNotNull(),
        lte(stockItems.expiryDate, threshold)
      )
    );
  }
  
  async getLowStockItems(threshold: number): Promise<StockItem[]> {
    return await db.select().from(stockItems).where(
      lte(stockItems.quantity, threshold)
    );
  }
  
  // Allocation methods
  async getAllocationsForUser(userId: number): Promise<Allocation[]> {
    return await db.select().from(allocations).where(eq(allocations.userId, userId));
  }
  
  async createAllocation(allocationData: InsertAllocation): Promise<Allocation> {
    // Create the allocation
    const [allocation] = await db.insert(allocations).values({
      ...allocationData,
      status: "pending",
      allocatedAt: new Date()
    }).returning();
    
    // Update stock quantity
    const stockItem = await this.getStockItem(allocation.stockItemId);
    if (stockItem) {
      await this.updateStockItem(stockItem.id, {
        quantity: stockItem.quantity - allocation.quantity
      });
    }
    
    return allocation;
  }
  
  async updateAllocationStatus(id: number, status: string): Promise<Allocation | undefined> {
    // Get the existing allocation first
    const allocation = await this.getallocation(id);
    if (!allocation) return undefined;
    
    // If status is changing to cancelled and wasn't cancelled before, return stock
    if (status === "cancelled" && allocation.status !== "cancelled") {
      const stockItem = await this.getStockItem(allocation.stockItemId);
      if (stockItem) {
        await this.updateStockItem(stockItem.id, {
          quantity: stockItem.quantity + allocation.quantity
        });
      }
    }
    
    // Update the allocation status
    const [updatedAllocation] = await db.update(allocations)
      .set({ status })
      .where(eq(allocations.id, id))
      .returning();
    
    return updatedAllocation;
  }
  
  async getallocation(id: number): Promise<Allocation | undefined> {
    const [allocation] = await db.select().from(allocations).where(eq(allocations.id, id));
    return allocation;
  }
  
  async getAllocations(): Promise<Allocation[]> {
    return await db.select().from(allocations);
  }
  
  // Movement methods
  async createMovement(movementData: InsertMovement): Promise<Movement> {
    const [movement] = await db.insert(movements).values({
      ...movementData,
      performedAt: new Date()
    }).returning();
    
    return movement;
  }
  
  async getMovementsForStockItem(stockItemId: number): Promise<Movement[]> {
    return await db.select().from(movements).where(eq(movements.stockItemId, stockItemId));
  }
  
  async getAllMovements(): Promise<Movement[]> {
    return await db.select().from(movements);
  }
}

export const storage = new DatabaseStorage();