import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Box, Clock, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Allocation, StockItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

interface AllocationListProps {
  limit?: number;
  showViewAllLink?: boolean;
}

export function AllocationList({ limit, showViewAllLink = false }: AllocationListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: allocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: ["/api/allocations"],
  });
  
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock"],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(
        "PUT",
        `/api/allocations/${id}/status`,
        { status }
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Allocation status updated",
        description: "The allocation status has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const isLoading = isLoadingAllocations || isLoadingStock || isLoadingUsers;
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-3 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-16 ml-auto" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="mt-4 flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const displayAllocations = limit && allocations
    ? allocations.slice(0, limit)
    : allocations || [];
    
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "received":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getStockItemName = (stockItemId: number) => {
    const item = stockItems?.find(item => item.id === stockItemId);
    return item ? item.name : "Unknown Item";
  };
  
  const getUserName = (userId: number) => {
    const foundUser = users?.find(u => u.id === userId);
    return foundUser ? foundUser.fullName : "Unknown User";
  };
  
  const getUserRole = (userId: number) => {
    const foundUser = users?.find(u => u.id === userId);
    return foundUser ? foundUser.role : "Unknown";
  };
  
  const getInitials = (userId: number) => {
    const foundUser = users?.find(u => u.id === userId);
    if (!foundUser) return "?";
    
    return foundUser.fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  };
  
  // Check if user can manage allocations
  const canManageAllocations = user && [
    UserRole.CEO, 
    UserRole.ADMIN, 
    UserRole.MARKETER, 
    UserRole.SALES_MANAGER
  ].includes(user.role as UserRole);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {displayAllocations.length > 0 ? (
        displayAllocations.map((allocation) => (
          <Card key={allocation.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(allocation.userId)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <div className="text-sm font-medium">{getUserName(allocation.userId)}</div>
                    <div className="text-xs text-muted-foreground">{getUserRole(allocation.userId)}</div>
                  </div>
                </div>
                {getStatusBadge(allocation.status)}
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">Items Allocated:</div>
                <div className="mt-2 flex items-center">
                  <Box className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-sm">
                    {getStockItemName(allocation.stockItemId)} ({allocation.quantity} units)
                  </span>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {allocation.allocatedAt
                      ? `Allocated ${formatDistanceToNow(new Date(allocation.allocatedAt))} ago`
                      : "Recently allocated"}
                  </span>
                </div>
                
                {canManageAllocations && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({ 
                          id: allocation.id, 
                          status: "received" 
                        })}
                        disabled={allocation.status === "received"}
                      >
                        Mark as Received
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({ 
                          id: allocation.id, 
                          status: "cancelled" 
                        })}
                        disabled={allocation.status === "cancelled"}
                      >
                        Cancel Allocation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No allocations found</p>
          </CardContent>
        </Card>
      )}
      
      {showViewAllLink && allocations && allocations.length > limit! && (
        <div className="col-span-full mt-4 text-center">
          <Link href="/allocations">
            <Button variant="outline">
              View All Allocations
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
