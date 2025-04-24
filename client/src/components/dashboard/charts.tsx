import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export function Charts() {
  const { user } = useAuth();
  
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock"],
    enabled: !!user,
  });
  
  const { data: allocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: !!user,
  });
  
  const { data: movements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["/api/movements"],
    enabled: !!user,
  });
  
  const isLoading = isLoadingStock || isLoadingAllocations || isLoadingMovements;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Stock Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Stock Movement Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for distribution chart
  const departmentColors = ["#1976d2", "#4caf50", "#ff9800", "#f44336"];
  
  // This would normally come from real data calculation
  const distributionData = [
    { name: 'Sales', value: 40 },
    { name: 'Marketing', value: 30 },
    { name: 'Medical', value: 20 },
    { name: 'Admin', value: 10 }
  ];
  
  // Prepare data for movement chart
  // This would normally be calculated from movements data
  const movementData = [
    { month: 'Jan', allocation: 65, usage: 40 },
    { month: 'Feb', allocation: 59, usage: 45 },
    { month: 'Mar', allocation: 80, usage: 60 },
    { month: 'Apr', allocation: 81, usage: 70 },
    { month: 'May', allocation: 56, usage: 45 },
    { month: 'Jun', allocation: 55, usage: 50 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Stock Distribution by Department</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={departmentColors[index % departmentColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Stock Movement Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={movementData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="allocation"
                  stroke="#1976d2"
                  activeDot={{ r: 8 }}
                />
                <Line type="monotone" dataKey="usage" stroke="#4caf50" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
