import { 
  User, InsertUser, StockItem, InsertStockItem, 
  Allocation, InsertAllocation, Movement, InsertMovement
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stockItems: Map<number, StockItem>;
  private allocations: Map<number, Allocation>;
  private movements: Map<number, Movement>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private stockIdCounter: number;
  private allocationIdCounter: number;
  private movementIdCounter: number;

  constructor() {
    this.users = new Map();
    this.stockItems = new Map();
    this.allocations = new Map();
    this.movements = new Map();
    
    this.userIdCounter = 1;
    this.stockIdCounter = 1;
    this.allocationIdCounter = 1;
    this.movementIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  // Stock methods
  async getStockItem(id: number): Promise<StockItem | undefined> {
    return this.stockItems.get(id);
  }

  async getStockItemByUniqueNumber(uniqueNumber: string): Promise<StockItem | undefined> {
    return Array.from(this.stockItems.values()).find(
      (item) => item.uniqueNumber === uniqueNumber
    );
  }

  async createStockItem(itemData: InsertStockItem): Promise<StockItem> {
    const id = this.stockIdCounter++;
    const now = new Date();
    const item: StockItem = { 
      ...itemData, 
      id, 
      createdAt: now 
    };
    this.stockItems.set(id, item);
    return item;
  }

  async updateStockItem(id: number, itemData: Partial<StockItem>): Promise<StockItem | undefined> {
    const item = this.stockItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.stockItems.set(id, updatedItem);
    return updatedItem;
  }

  async getAllStockItems(): Promise<StockItem[]> {
    return Array.from(this.stockItems.values());
  }

  async getExpiringStockItems(days: number): Promise<StockItem[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    
    return Array.from(this.stockItems.values()).filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry <= threshold;
    });
  }

  async getLowStockItems(threshold: number): Promise<StockItem[]> {
    return Array.from(this.stockItems.values()).filter(item => {
      return item.quantity <= threshold;
    });
  }

  // Allocation methods
  async getAllocationsForUser(userId: number): Promise<Allocation[]> {
    return Array.from(this.allocations.values()).filter(
      allocation => allocation.userId === userId
    );
  }

  async createAllocation(allocationData: InsertAllocation): Promise<Allocation> {
    const id = this.allocationIdCounter++;
    const now = new Date();
    const allocation: Allocation = {
      ...allocationData,
      id,
      status: "pending",
      allocatedAt: now
    };
    this.allocations.set(id, allocation);
    
    // Update stock item quantity
    const stockItem = this.stockItems.get(allocationData.stockItemId);
    if (stockItem) {
      const newQuantity = stockItem.quantity - allocationData.quantity;
      this.stockItems.set(stockItem.id, { ...stockItem, quantity: newQuantity });
    }
    
    return allocation;
  }

  async updateAllocationStatus(id: number, status: string): Promise<Allocation | undefined> {
    const allocation = this.allocations.get(id);
    if (!allocation) return undefined;
    
    const updatedAllocation = { ...allocation, status };
    this.allocations.set(id, updatedAllocation);
    return updatedAllocation;
  }

  async getAllocations(): Promise<Allocation[]> {
    return Array.from(this.allocations.values());
  }

  // Movement methods
  async createMovement(movementData: InsertMovement): Promise<Movement> {
    const id = this.movementIdCounter++;
    const now = new Date();
    const movement: Movement = {
      ...movementData,
      id,
      performedAt: now
    };
    this.movements.set(id, movement);
    return movement;
  }

  async getMovementsForStockItem(stockItemId: number): Promise<Movement[]> {
    return Array.from(this.movements.values()).filter(
      movement => movement.stockItemId === stockItemId
    );
  }

  async getAllMovements(): Promise<Movement[]> {
    return Array.from(this.movements.values());
  }
}

export const storage = new MemStorage();
