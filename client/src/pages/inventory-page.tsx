import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StockTable } from "@/components/inventory/stock-table";
import { StockForm } from "@/components/inventory/stock-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

export default function InventoryPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  
  if (!user) return null;
  
  // Only these roles can add/edit stock
  const canManageStock = [
    UserRole.CEO, 
    UserRole.ADMIN, 
    UserRole.STOCK_MANAGER, 
    UserRole.MARKETER, 
    UserRole.SALES_MANAGER
  ].includes(user.role as UserRole);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[270px]">
        <Header title="Inventory" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold">Stock Items</h1>
            
            {canManageStock && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Item
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Add New Stock Item</SheetTitle>
                    <SheetDescription>
                      Fill in the details to add a new stock item to the inventory.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <StockForm onSuccess={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
          
          <StockTable />
        </main>
      </div>
    </div>
  );
}
