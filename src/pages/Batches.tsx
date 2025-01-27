import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus,
  Edit2, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  batch_name: z.string().min(2, "Batch name must be at least 2 characters"),
  serial_number: z.number().min(1, "Serial number must be at least 1"),
  admin_name: z.string().min(2, "Admin name must be at least 2 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  max_students: z.number().min(1, "Maximum students must be at least 1"),
});

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBatch, setEditingBatch] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batch_name: "",
      serial_number: 1,
      admin_name: "",
      username: "",
      max_students: 1,
    },
  });

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch batches. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredBatches = batches.filter((batch) =>
    batch.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBatches = filteredBatches.slice(startIndex, endIndex);

  const handleSubmit = async (values) => {
    try {
      if (editingBatch) {
        const { error } = await supabase
          .from("batches")
          .update({
            batch_name: values.batch_name,
            serial_number: values.serial_number,
            admin_name: values.admin_name,
            username: values.username,
            max_students: values.max_students,
          })
          .eq("id", editingBatch.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Batch updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("batches")
          .insert([{
            batch_name: values.batch_name,
            serial_number: values.serial_number,
            admin_name: values.admin_name,
            username: values.username,
            max_students: values.max_students,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Batch created successfully",
        });
      }
      
      fetchBatches();
      setEditingBatch(null);
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving batch:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingBatch ? 'update' : 'create'} batch. Please try again.`,
      });
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("batches")
        .update({ is_enabled: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Batch ${currentStatus ? "disabled" : "enabled"} successfully`,
      });
      
      fetchBatches();
    } catch (error) {
      console.error("Error toggling batch status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update batch status. Please try again.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-primary">Batch List</h2>
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingBatch(null);
                    form.reset({
                      batch_name: "",
                      serial_number: 1,
                      admin_name: "",
                      username: "",
                      max_students: 1,
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Batch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBatch ? "Edit" : "Add"} Batch</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="batch_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
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
                          <FormLabel>Max Students</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      {editingBatch ? "Save Changes" : "Create Batch"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr. No.</TableHead>
                <TableHead>Batch Name</TableHead>
                <TableHead>Admin Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBatches.map((batch) => (
                <TableRow 
                  key={batch.id}
                  className={!batch.is_enabled ? "bg-red-50" : ""}
                >
                  <TableCell>{batch.serial_number}</TableCell>
                  <TableCell className="font-medium">{batch.batch_name}</TableCell>
                  <TableCell>{batch.admin_name}</TableCell>
                  <TableCell>{batch.username}</TableCell>
                  <TableCell>{batch.max_students}</TableCell>
                  <TableCell>
                    <Button
                      variant={batch.is_enabled ? "default" : "destructive"}
                      size="sm"
                      onClick={() => toggleStatus(batch.id, batch.is_enabled)}
                    >
                      {batch.is_enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingBatch(batch);
                          form.reset({
                            batch_name: batch.batch_name,
                            serial_number: batch.serial_number,
                            admin_name: batch.admin_name,
                            username: batch.username,
                            max_students: batch.max_students,
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}