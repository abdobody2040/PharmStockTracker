import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InsertAllocation, UserRole } from "@shared/schema";

interface AllocationFormProps {
  onSuccess?: () => void;
}

const formSchema = z.object({
  stockItemId: z.coerce.number().min(1, "Please select a stock item"),
  userId: z.coerce.number().min(1, "Please select a user"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

export function AllocationForm({ onSuccess }: AllocationFormProps) {
  const { toast } = useToast();
  
  const { data: stockItems, isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock"],
  });
  
  // We only want to load sales managers and medical reps
  const { data: salesManagers, isLoading: isLoadingManagers } = useQuery({
    queryKey: ["/api/users/role/Sales Manager"],
  });
  
  const { data: medicalReps, isLoading: isLoadingReps } = useQuery({
    queryKey: ["/api/users/role/Medical Rep"],
  });
  
  const isLoading = isLoadingStock || isLoadingManagers || isLoadingReps;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stockItemId: 0,
      userId: 0,
      quantity: 1,
    },
  });
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await apiRequest(
        "POST",
        "/api/allocations",
        values
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Allocation created successfully",
        description: "The stock items have been allocated to the user.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to create allocation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }
  
  const recipients = [
    ...(salesManagers || []),
    ...(medicalReps || [])
  ];
  
  // Get max quantity for the selected stock item
  const selectedStockItem = stockItems?.find(
    item => item.id === form.watch("stockItemId")
  );
  
  // Update max quantity when stock item changes
  useEffect(() => {
    if (selectedStockItem) {
      const currentQuantity = form.getValues("quantity");
      if (currentQuantity > selectedStockItem.quantity) {
        form.setValue("quantity", selectedStockItem.quantity);
      }
    }
  }, [form.watch("stockItemId")]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="stockItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Item</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stock item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stockItems && stockItems.map((item) => (
                    <SelectItem 
                      key={item.id} 
                      value={item.id.toString()}
                      disabled={item.quantity <= 0}
                    >
                      {item.name} ({item.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recipient" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {recipients && recipients.map((user) => (
                    <SelectItem 
                      key={user.id} 
                      value={user.id.toString()}
                    >
                      {user.fullName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  min={1} 
                  max={selectedStockItem?.quantity || 1}
                />
              </FormControl>
              {selectedStockItem && (
                <FormDescription>
                  Maximum available: {selectedStockItem.quantity}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Allocation
        </Button>
      </form>
    </Form>
  );
}
