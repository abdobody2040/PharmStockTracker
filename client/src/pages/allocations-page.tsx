import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AllocationList } from "@/components/allocations/allocation-list";
import { AllocationForm } from "@/components/allocations/allocation-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

export default function AllocationsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  
  if (!user) return null;
  
  // Only these roles can create allocations
  const canAllocate = [
    UserRole.CEO, 
    UserRole.ADMIN, 
    UserRole.MARKETER, 
    UserRole.SALES_MANAGER
  ].includes(user.role as UserRole);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[270px]">
        <Header title="Allocations" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold">Stock Allocations</h1>
            
            {canAllocate && (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Allocation
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Allocate Stock Items</SheetTitle>
                    <SheetDescription>
                      Assign stock items to users within the organization.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <AllocationForm onSuccess={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
          
          <AllocationList />
        </main>
      </div>
    </div>
  );
}
