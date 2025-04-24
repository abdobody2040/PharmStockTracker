import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Calendar } from "lucide-react";
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
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, addDays, subDays, parseISO } from "date-fns";

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("stockLevels");

  // Fetch all the data needed for reports
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock"],
  });

  const { data: allocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: ["/api/allocations"],
  });

  const { data: movements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ["/api/movements"],
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const isLoading = isLoadingStock || isLoadingAllocations || isLoadingMovements || isLoadingUsers;

  // Handle report download
  const handleDownload = () => {
    toast({
      title: "Report downloaded",
      description: "Your report has been downloaded successfully.",
    });
  };

  // Prepare data for stock levels chart
  const prepareStockLevelsData = () => {
    if (!stockItems) return [];
    
    // Group by category and sum quantities
    const categories: Record<string, number> = {};
    
    stockItems.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += item.quantity;
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Prepare data for expiry chart
  const prepareExpiryData = () => {
    if (!stockItems) return [];
    
    const now = new Date();
    const expiryRanges = [
      { name: "< 30 days", count: 0 },
      { name: "30-90 days", count: 0 },
      { name: "90-180 days", count: 0 },
      { name: "> 180 days", count: 0 },
      { name: "No Expiry", count: 0 },
    ];
    
    stockItems.forEach(item => {
      if (!item.expiryDate) {
        expiryRanges[4].count += item.quantity;
        return;
      }
      
      const expiryDate = new Date(item.expiryDate);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 30) {
        expiryRanges[0].count += item.quantity;
      } else if (daysUntilExpiry < 90) {
        expiryRanges[1].count += item.quantity;
      } else if (daysUntilExpiry < 180) {
        expiryRanges[2].count += item.quantity;
      } else {
        expiryRanges[3].count += item.quantity;
      }
    });
    
    return expiryRanges;
  };

  // Prepare data for allocation by user
  const prepareAllocationByUserData = () => {
    if (!allocations || !users) return [];
    
    const userAllocations: Record<number, { user: string, role: string, count: number }> = {};
    
    allocations.forEach(allocation => {
      if (!userAllocations[allocation.userId]) {
        const user = users.find(u => u.id === allocation.userId);
        if (user) {
          userAllocations[allocation.userId] = {
            user: user.fullName,
            role: user.role,
            count: 0
          };
        }
      }
      
      if (userAllocations[allocation.userId]) {
        userAllocations[allocation.userId].count += allocation.quantity;
      }
    });
    
    return Object.values(userAllocations)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Prepare data for movement trends
  const prepareMovementTrendsData = () => {
    if (!movements) return [];
    
    // Get the number of days from the date range
    const days = parseInt(dateRange, 10);
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    // Initialize data for each day in the range
    const dailyData: Record<string, { adds: number, removes: number, allocates: number, date: string }> = {};
    
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dailyData[dateStr] = { adds: 0, removes: 0, allocates: 0, date: dateStr };
    }
    
    // Aggregate movement data by day and type
    movements.forEach(movement => {
      if (!movement.performedAt) return;
      
      const date = new Date(movement.performedAt);
      if (date < startDate) return;
      
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!dailyData[dateStr]) return;
      
      const { type, quantity } = movement;
      
      if (type === 'add') {
        dailyData[dateStr].adds += quantity;
      } else if (type === 'remove') {
        dailyData[dateStr].removes += quantity;
      } else if (type === 'allocate') {
        dailyData[dateStr].allocates += quantity;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        date: format(parseISO(item.date), 'MMM dd'),
        'Items Added': item.adds,
        'Items Removed': item.removes,
        'Items Allocated': item.allocates
      }));
  };

  // Prepare low stock items data
  const prepareLowStockItems = () => {
    if (!stockItems) return [];
    
    // Consider items with quantity less than 25 as low stock
    return stockItems
      .filter(item => item.quantity < 25)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);
  };

  // Prepare recent movements data
  const prepareRecentMovements = () => {
    if (!movements || !stockItems || !users) return [];
    
    return movements
      .sort((a, b) => {
        const dateA = a.performedAt ? new Date(a.performedAt).getTime() : 0;
        const dateB = b.performedAt ? new Date(b.performedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(movement => {
        const stockItem = stockItems.find(item => item.id === movement.stockItemId);
        const performer = users.find(user => user.id === movement.performedBy);
        
        let description = '';
        if (movement.type === 'add') {
          description = `Added ${movement.quantity} units`;
        } else if (movement.type === 'remove') {
          description = `Removed ${movement.quantity} units`;
        } else if (movement.type === 'allocate') {
          const recipient = users.find(user => user.id === movement.toUserId);
          description = `Allocated ${movement.quantity} units to ${recipient?.fullName || 'Unknown'}`;
        }
        
        return {
          id: movement.id,
          itemName: stockItem?.name || 'Unknown Item',
          type: movement.type,
          quantity: movement.quantity,
          description,
          performer: performer?.fullName || 'Unknown',
          date: movement.performedAt,
        };
      });
  };

  // Generate color palette for charts
  const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#e91e63', '#00bcd4', '#607d8b'];
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-[270px]">
          <Header title="Reports" />
          <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[270px]">
        <Header title="Reports" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-xl font-semibold">Analytics & Reports</h1>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto md:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 180 days</SelectItem>
                    <SelectItem value="365">Last 365 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
          
          <Tabs value={reportType} onValueChange={setReportType}>
            <TabsList className="mb-4">
              <TabsTrigger value="stockLevels">Stock Levels</TabsTrigger>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
              <TabsTrigger value="movements">Stock Movement</TabsTrigger>
              <TabsTrigger value="expiry">Expiry Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stockLevels">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock by Category</CardTitle>
                    <CardDescription>Distribution of stock items across categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareStockLevelsData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {prepareStockLevelsData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>Items with critically low stock levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prepareLowStockItems().map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>{item.category || "Uncategorized"}</TableCell>
                              <TableCell className="text-right">
                                <span className={`${item.quantity < 10 ? 'text-red-500 font-bold' : 'text-orange-500'}`}>
                                  {item.quantity}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {prepareLowStockItems().length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center">No low stock items found</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Stock Quantity by Item</CardTitle>
                  <CardDescription>Current stock levels for each item</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stockItems?.slice(0, 10).map(item => ({
                          name: item.name,
                          quantity: item.quantity
                        }))}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          scale="band" 
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="quantity" fill="#1976d2" name="Quantity" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="allocations">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Recipients</CardTitle>
                    <CardDescription>Users with the most allocated items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareAllocationByUserData()}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="user" 
                            type="category" 
                            scale="band" 
                            tick={{ fontSize: 12 }}
                            width={100}
                          />
                          <Tooltip formatter={(value) => [`${value} units`, 'Allocated']} />
                          <Legend />
                          <Bar dataKey="count" fill="#4caf50" name="Items Allocated" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Allocation Status</CardTitle>
                    <CardDescription>Status of all allocations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Pending', value: allocations?.filter(a => a.status === 'pending').length || 0 },
                              { name: 'Received', value: allocations?.filter(a => a.status === 'received').length || 0 },
                              { name: 'Cancelled', value: allocations?.filter(a => a.status === 'cancelled').length || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            <Cell fill="#ff9800" />
                            <Cell fill="#4caf50" />
                            <Cell fill="#f44336" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Allocation History</CardTitle>
                  <CardDescription>Recent allocation history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Stock Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations?.slice(0, 10).map((allocation) => {
                          const stockItem = stockItems?.find(item => item.id === allocation.stockItemId);
                          const recipient = users?.find(user => user.id === allocation.userId);
                          
                          return (
                            <TableRow key={allocation.id}>
                              <TableCell className="font-medium">{recipient?.fullName || 'Unknown'}</TableCell>
                              <TableCell>{stockItem?.name || 'Unknown Item'}</TableCell>
                              <TableCell>{allocation.quantity} units</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  allocation.status === 'received' ? 'bg-green-100 text-green-800' :
                                  allocation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {allocation.status.charAt(0).toUpperCase() + allocation.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {allocation.allocatedAt ? 
                                  formatDistanceToNow(new Date(allocation.allocatedAt), { addSuffix: true }) : 
                                  'Unknown date'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!allocations || allocations.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No allocation history found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="movements">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Stock Movement Trends</CardTitle>
                  <CardDescription>Track additions, removals, and allocations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={prepareMovementTrendsData()}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Items Added" stackId="1" stroke="#4caf50" fill="#4caf50" />
                        <Area type="monotone" dataKey="Items Removed" stackId="1" stroke="#f44336" fill="#f44336" />
                        <Area type="monotone" dataKey="Items Allocated" stackId="1" stroke="#1976d2" fill="#1976d2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Movement History</CardTitle>
                  <CardDescription>Latest stock movement activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prepareRecentMovements().map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                movement.type === 'add' ? 'bg-green-100 text-green-800' :
                                movement.type === 'remove' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{movement.itemName}</TableCell>
                            <TableCell>{movement.quantity} units</TableCell>
                            <TableCell>{movement.performer}</TableCell>
                            <TableCell>
                              {movement.date ? 
                                formatDistanceToNow(new Date(movement.date), { addSuffix: true }) : 
                                'Unknown date'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {prepareRecentMovements().length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No movement history found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="expiry">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock Expiry Analysis</CardTitle>
                    <CardDescription>Distribution of stock items by expiration date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareExpiryData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            <Cell fill="#f44336" /> {/* < 30 days */}
                            <Cell fill="#ff9800" /> {/* 30-90 days */}
                            <Cell fill="#4caf50" /> {/* 90-180 days */}
                            <Cell fill="#1976d2" /> {/* > 180 days */}
                            <Cell fill="#9e9e9e" /> {/* No Expiry */}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Items Expiring Soon</CardTitle>
                    <CardDescription>Stock items expiring within 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Time Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockItems
                            ?.filter(item => {
                              if (!item.expiryDate) return false;
                              const now = new Date();
                              const expiryDate = new Date(item.expiryDate);
                              const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              return daysUntilExpiry < 30 && daysUntilExpiry >= 0;
                            })
                            .sort((a, b) => {
                              if (!a.expiryDate || !b.expiryDate) return 0;
                              return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                            })
                            .map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.quantity} units</TableCell>
                                <TableCell>{item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                                <TableCell>
                                  {item.expiryDate ? (
                                    <span className="text-red-500 font-semibold">
                                      {formatDistanceToNow(new Date(item.expiryDate))}
                                    </span>
                                  ) : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          {!stockItems?.some(item => {
                            if (!item.expiryDate) return false;
                            const now = new Date();
                            const expiryDate = new Date(item.expiryDate);
                            const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            return daysUntilExpiry < 30 && daysUntilExpiry >= 0;
                          }) && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">No items expiring soon</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Expired Items</CardTitle>
                  <CardDescription>Stock items that have already expired</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Expired For</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockItems
                          ?.filter(item => {
                            if (!item.expiryDate) return false;
                            const now = new Date();
                            const expiryDate = new Date(item.expiryDate);
                            return expiryDate < now;
                          })
                          .sort((a, b) => {
                            if (!a.expiryDate || !b.expiryDate) return 0;
                            return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
                          })
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>{item.category || 'Uncategorized'}</TableCell>
                              <TableCell>{item.quantity} units</TableCell>
                              <TableCell>{item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                              <TableCell>
                                {item.expiryDate ? (
                                  <span className="text-red-600 font-bold">
                                    {formatDistanceToNow(new Date(item.expiryDate))}
                                  </span>
                                ) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        {!stockItems?.some(item => {
                          if (!item.expiryDate) return false;
                          const now = new Date();
                          const expiryDate = new Date(item.expiryDate);
                          return expiryDate < now;
                        }) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">No expired items found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
