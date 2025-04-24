import { useState, useRef } from "react";
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
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { InsertStockItem, StockItem } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface StockFormProps {
  onSuccess?: () => void;
  initialData?: InsertStockItem;
  isEdit?: boolean;
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  uniqueNumber: z.string().min(3, "Item ID must be at least 3 characters"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  expiryDate: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function StockForm({ onSuccess, initialData, isEdit = false }: StockFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  
  const form = useForm<FormValues>({
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
  
  const mutation = useMutation<StockItem, Error, FormValues>({
    mutationFn: async (values: FormValues) => {
      const formattedValues = {
        ...values,
        expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : null,
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
      form.reset();
      setImagePreview(null);
    },
    onError: (error) => {
      toast({
        title: `Failed to ${isEdit ? "update" : "create"} stock item`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    mutation.mutate(values);
  }

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue("imageUrl", base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Item Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter item name" {...field} required />
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
              <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Unique Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CPK-2023-001" {...field} required />
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
              <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cardiovascular" {...field} required />
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
              <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} required />
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
              <FormLabel>Expiry Date (Optional)</FormLabel>
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
              <FormLabel>Product Image (Optional)</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center space-y-4">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <div 
                    className="border-2 border-dashed rounded-md p-6 w-full flex flex-col items-center cursor-pointer hover:bg-gray-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={imagePreview} 
                          alt="Item preview" 
                          className="h-40 w-40 object-contain mb-2"
                        />
                        <p className="text-sm text-gray-500">Click to change image</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload an image</p>
                      </>
                    )}
                  </div>
                  
                  <input 
                    type="hidden" 
                    {...field} 
                    value={imagePreview || ""} 
                  />
                </div>
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
