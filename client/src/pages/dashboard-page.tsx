import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Stats } from "@/components/dashboard/stats";
import { Charts } from "@/components/dashboard/charts";
import { StockTable } from "@/components/inventory/stock-table";
import { AllocationList } from "@/components/allocations/allocation-list";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  
  if (!user) return null;

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.CEO:
        return "You have complete access to all system functions and company-wide stock visibility.";
      case UserRole.MARKETER:
        return "You can add, remove, edit and move quantities across Sales reps and Sales managers.";
      case UserRole.SALES_MANAGER:
        return "You can add, remove, edit and move quantities across Sales reps and Sales managers.";
      case UserRole.STOCK_MANAGER:
        return "You can add, remove and edit stocks.";
      case UserRole.ADMIN:
        return "You can add, remove and edit stocks, extract reports.";
      case UserRole.MEDICAL_REP:
        return "You can view stocks allocated to you.";
      default:
        return "";
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[270px]">
        <Header title="Dashboard" />
        <main className="flex-1 p-4 md:p-6">
          <Alert className="mb-6 bg-blue-50 border-primary">
            <InfoIcon className="h-4 w-4 text-primary" />
            <AlertTitle>Welcome to the {user.role} Dashboard</AlertTitle>
            <AlertDescription>
              {getRoleDescription(user.role as UserRole)}
            </AlertDescription>
          </Alert>

          <Stats />
          
          <Charts />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-medium mb-4">Recent Stock Items</h2>
              <StockTable limit={5} showViewAllLink={true} />
            </div>
            <div>
              <h2 className="text-lg font-medium mb-4">Recent Allocations</h2>
              <AllocationList limit={3} showViewAllLink={true} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
