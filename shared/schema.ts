import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export enum UserRole {
  CEO = "CEO",
  MARKETER = "Marketer",
  SALES_MANAGER = "Sales Manager",
  STOCK_MANAGER = "Stock Manager",
  ADMIN = "Admin",
  MEDICAL_REP = "Medical Rep"
}

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").$type<UserRole>().notNull().default(UserRole.MEDICAL_REP),
  department: text("department"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  department: true,
});

// Stock item schema
export const stockItems = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  uniqueNumber: text("unique_number").notNull().unique(),
  category: text("category"),
  quantity: integer("quantity").notNull().default(0),
  expiryDate: timestamp("expiry_date"),
  imageUrl: text("image_url"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStockItemSchema = createInsertSchema(stockItems).pick({
  name: true,
  uniqueNumber: true,
  category: true,
  quantity: true,
  expiryDate: true,
  imageUrl: true,
  createdBy: true,
});

// Stock allocation schema
export const allocations = pgTable("allocations", {
  id: serial("id").primaryKey(),
  stockItemId: integer("stock_item_id").notNull(),
  userId: integer("user_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"),
  allocatedBy: integer("allocated_by").notNull(),
  allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
});

export const insertAllocationSchema = createInsertSchema(allocations).pick({
  stockItemId: true,
  userId: true,
  quantity: true,
  allocatedBy: true,
});

// Stock movement history
export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  stockItemId: integer("stock_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  type: text("type").notNull(), // "add", "remove", "allocate", "deallocate"
  fromUserId: integer("from_user_id"),
  toUserId: integer("to_user_id"),
  performedBy: integer("performed_by").notNull(),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
});

export const insertMovementSchema = createInsertSchema(movements).pick({
  stockItemId: true,
  quantity: true,
  type: true,
  fromUserId: true,
  toUserId: true,
  performedBy: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type StockItem = typeof stockItems.$inferSelect;
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;

export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;

export type Movement = typeof movements.$inferSelect;
export type InsertMovement = z.infer<typeof insertMovementSchema>;
