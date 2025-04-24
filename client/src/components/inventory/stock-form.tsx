import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { InsertStockItem } from "@shared/schema";

interface StockFormProps {
  onSuccess?: () => void;
  initialData?: InsertStockItem;
  isEdit?: boolean;
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  uniqueNumber: z.string().min(3, "Item ID must be at least 3 characters"),
  category: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  expiryDate: z.string().optional(),
  imageUrl: z.string().optional(),
});

export function StockForm({ onSuccess, initialData, isEdit = false }: StockFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      uniqueNumber: "",
      category: "",
      quantity: 0,
      expiryDate: "",
      imageUrl: "",
    },
  });
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const formattedValues = {
        ...values,
        expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : undefined,
      };
      
      const response = await apiRequest(
        isEdit ? "PUT" : "POST",
        isEdit ? `/api/stock/${initialData?.id}` : "/api/stock",
        formattedValues
      );
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Stock item ${isEdit ? "updated" : "created"} successfully`,
        description: `The stock item has been ${isEdit ? "updated" : "added to the inventory"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stock"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: `Failed to ${isEdit ? "update" : "create"} stock item`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter item name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="uniqueNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unique Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CPK-2023-001" {...field} />
              </FormControl>
              <FormDescription>
                A unique identifier for this stock item
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cardiovascular" {...field} />
              </FormControl>
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
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="URL to item image" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Update Stock Item" : "Add Stock Item"}
        </Button>
      </form>
    </Form>
  );
}
