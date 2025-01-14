import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Search, Edit, Trash, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Batch } from "@/types";

const batchSchema = z.object({
  batch_name: z.string().min(1, "Batch name is required"),
  admin_name: z.string().min(1, "Admin name is required"),
  username: z.string().min(1, "Username is required"),
  max_students: z.number().min(1, "Number of students is required"),
});

const ITEMS_PER_PAGE = 10;

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof batchSchema>>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batch_name: "",
      admin_name: "",
      username: "",
      max_students: 0,
    },
  });

  useEffect(() => {
    fetchBatches();
    subscribeToChanges();
  }, []);

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        () => {
          fetchBatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching batches",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setBatches(data);
  };

  const onSubmit = async (values: z.infer<typeof batchSchema>) => {
    const { data: existingBatch } = await supabase
      .from('batches')
      .select()
      .eq('batch_name', values.batch_name)
      .single();

    if (existingBatch) {
      toast({
        title: "Error",
        description: "Batch name already exists",
        variant: "destructive",
      });
      return;
    }

    // Get the next serial number
    const { data: maxSerial } = await supabase
      .from('batches')
      .select('serial_number')
      .order('serial_number', { ascending: false })
      .limit(1)
      .single();

    const nextSerial = maxSerial ? maxSerial.serial_number + 1 : 1;

    const batchData = {
      batch_name: values.batch_name,
      serial_number: nextSerial,
      admin_name: values.admin_name,
      username: values.username,
      max_students: values.max_students,
    };

    const { error } = await supabase
      .from('batches')
      .insert([batchData]);

    if (error) {
      toast({
        title: "Error creating batch",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Batch created successfully",
    });
    setIsAddDialogOpen(false);
    form.reset();
  };

  const handleDelete = async (batch: Batch) => {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batch.id);

    if (error) {
      toast({
        title: "Error deleting batch",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Batch deleted successfully",
    });
  };

  const handleToggleStatus = async (batch: Batch) => {
    const { error } = await supabase
      .from('batches')
      .update({ is_enabled: !batch.is_enabled })
      .eq('id', batch.id);

    if (error) {
      toast({
        title: "Error updating batch status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Batch ${batch.is_enabled ? 'disabled' : 'enabled'} successfully`,
    });
  };

  const filteredBatches = batches.filter(batch =>
    batch.batch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);
  const paginatedBatches = filteredBatches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <DashboardLayout>
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Batch List</CardTitle>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Batch
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 hover:border-primary focus:border-primary transition-colors"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr. No</TableHead>
                <TableHead>Batch Name</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBatches.map((batch, index) => (
                <TableRow key={batch.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{batch.batch_name}</TableCell>
                  <TableCell>{batch.admin_name}</TableCell>
                  <TableCell>{batch.username}</TableCell>
                  <TableCell>{batch.max_students}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      batch.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {batch.is_enabled ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(batch)}
                        className="hover:bg-primary/10 transition-colors"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Implement edit functionality
                        }}
                        className="hover:bg-primary/10 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(batch)}
                        className="hover:bg-destructive/10 transition-colors"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="hover:bg-primary/10 transition-colors"
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="hover:bg-primary/10 transition-colors"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new batch
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="batch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Batch Name" 
                        {...field}
                        className="hover:border-primary focus:border-primary transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admin_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Admin Name" 
                        {...field}
                        className="hover:border-primary focus:border-primary transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Username" 
                        {...field}
                        className="hover:border-primary focus:border-primary transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_students"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Students</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter Max Students"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="hover:border-primary focus:border-primary transition-colors"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90 transition-colors"
                >
                  Create Batch
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}