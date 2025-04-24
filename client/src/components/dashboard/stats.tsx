import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export function Stats() {
  const { user } = useAuth();
  
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock"],
    enabled: !!user,
  });
  
  const { data: expiringItems, isLoading: isLoadingExpiring } = useQuery({
    queryKey: ["/api/stock/expiring/30"],
    enabled: !!user,
  });
  
  const { data: allocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: !!user,
  });
  
  const { data: lowStockItems, isLoading: isLoadingLow } = useQuery({
    queryKey: ["/api/stock/low/25"],
    enabled: !!user,
  });

  const isLoading = isLoadingStock || isLoadingExpiring || isLoadingAllocations || isLoadingLow;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 mt-4" />
              <Skeleton className="h-4 w-24 mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Stock Items",
      value: stockItems?.length || 0,
      icon: <Package className="h-5 w-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-primary",
      trend: {
        value: "8.2%",
        direction: "up",
        text: "vs last month"
      },
      borderColor: "border-primary"
    },
    {
      title: "Expiring Soon",
      value: expiringItems?.length || 0,
      icon: <Clock className="h-5 w-5" />,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      trend: {
        value: "12.5%",
        direction: "up",
        text: "vs last month"
      },
      borderColor: "border-yellow-500"
    },
    {
      title: "Allocated Items",
      value: allocations?.filter(a => a.status === "received").length || 0,
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: {
        value: "4.3%",
        direction: "up",
        text: "vs last month"
      },
      borderColor: "border-green-500"
    },
    {
      title: "Low Stock Items",
      value: lowStockItems?.length || 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      trend: {
        value: "2.1%",
        direction: "down",
        text: "vs last month"
      },
      borderColor: "border-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className={`border-l-4 ${stat.borderColor}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
              </div>
              <div className={`rounded-full p-2 ${stat.iconBg}`}>
                <span className={stat.iconColor}>{stat.icon}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium flex items-center ${stat.trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend.direction === 'up' ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )}
                {stat.trend.value}
              </span>
              <span className="text-gray-500 text-sm ml-2">{stat.trend.text}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
