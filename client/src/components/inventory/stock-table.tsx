import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Edit, ShoppingCart, Eye, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { StockItem } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface StockTableProps {
  limit?: number;
  showViewAllLink?: boolean;
}

export function StockTable({ limit, showViewAllLink = false }: StockTableProps) {
  const { toast } = useToast();
  const { data: stockItems = [], isLoading, isError, refetch } = useQuery<StockItem[]>({
    queryKey: ["/api/stock"],
    refetchOnWindowFocus: true,
    staleTime: 10000, // Refresh data if it's older than 10 seconds
    retry: 2,
    onSuccess: () => {
      console.log("Stock items loaded successfully");
    },
    onSettled: (_data, error) => {
      if (error) {
        toast({
          title: "Error fetching stock items",
          description: "There was a problem loading the inventory items.",
          variant: "destructive",
        });
      }
    }
  });
  
  const [page, setPage] = useState(1);
  const pageSize = limit || 10;
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
    toast({
      title: "Refreshing inventory",
      description: "Refreshing the inventory items list...",
    });
  };
  
  if (isLoading) {
    return (
      <div className="w-full rounded-md border">
        <div className="h-24 flex items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 ml-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }
  
  const items = stockItems || [];
  const totalPages = Math.ceil(items.length / pageSize);
  const displayItems = limit 
    ? items.slice(0, limit) 
    : items.slice((page - 1) * pageSize, page * pageSize);
    
  const getStatusBadge = (item: StockItem) => {
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const now = new Date();
    
    // Check if item is expiring in the next 30 days
    if (expiryDate && expiryDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Expiring Soon</Badge>;
    }
    
    // Check if item has low stock (less than 25)
    if (item.quantity < 25) {
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Low Stock</Badge>;
    }
    
    // Default is in stock
    return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>;
  };
  
  const formatExpiry = (date: string | null) => {
    if (!date) return "N/A";
    
    const expiryDate = new Date(date);
    return expiryDate.toLocaleDateString();
  };

  return (
    <div className="w-full rounded-md border">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-medium">Inventory Items</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.length > 0 ? (
              displayItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.uniqueNumber}</TableCell>
                  <TableCell>
                    <div>{item.quantity}</div>
                    <div className="text-xs text-muted-foreground">units</div>
                  </TableCell>
                  <TableCell>{formatExpiry(item.expiryDate)}</TableCell>
                  <TableCell>{getStatusBadge(item)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-primary">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ShoppingCart className="h-4 w-4" />
                      <span className="sr-only">Allocate</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  No stock items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {showViewAllLink && items.length > limit! && (
        <div className="flex items-center justify-center p-4">
          <Link href="/inventory">
            <Button variant="outline" size="sm">
              View All Stock Items
            </Button>
          </Link>
        </div>
      )}
      
      {!showViewAllLink && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(page * pageSize, items.length)}
            </span>{" "}
            of <span className="font-medium">{items.length}</span> items
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
