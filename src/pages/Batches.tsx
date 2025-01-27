import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, AlertOctagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BatchTable } from "@/components/batches/BatchTable";
import { BatchForm } from "@/components/batches/BatchForm";
import { BatchSearch } from "@/components/batches/BatchSearch";
import { BatchPagination } from "@/components/batches/BatchPagination";
import { Batch, BatchFormData } from "@/types/batch";

const formSchema = z.object({
  batch_name: z.string().min(2, "Batch name must be at least 2 characters"),
  serial_number: z.number().min(1, "Serial number must be at least 1"),
  admin_name: z.string().min(2, "Admin name must be at least 2 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  max_students: z.number().min(1, "Maximum students must be at least 1"),
});

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchToDisable, setBatchToDisable] = useState<Batch | null>(null);
  const [showDisableAlert, setShowDisableAlert] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const form = useForm<BatchFormData>({
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

    // Subscribe to real-time updates
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
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (values: BatchFormData) => {
    try {
      if (editingBatch) {
        const { error } = await supabase
          .from("batches")
          .update(values)
          .eq("id", editingBatch.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Batch updated successfully",
        });
      } else {
        const { error } = await supabase.from("batches").insert([values]);

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

  const handleStatusChange = async (batch: Batch) => {
    if (batch.is_enabled) {
      setBatchToDisable(batch);
      setShowDisableAlert(true);
    } else {
      await toggleStatus(batch.id, batch.is_enabled);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
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
      setShowDisableAlert(false);
      setBatchToDisable(null);
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
            <BatchSearch searchTerm={searchTerm} onSearch={handleSearch} />
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
                <BatchForm 
                  form={form} 
                  onSubmit={handleSubmit} 
                  isEditing={!!editingBatch} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <BatchTable
            currentBatches={currentBatches}
            onEdit={(batch) => {
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
            onStatusChange={handleStatusChange}
          />
        </div>

        <BatchPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <AlertDialog open={showDisableAlert} onOpenChange={setShowDisableAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-red-500" />
                  Disable Batch
                </div>
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to disable this batch? This action can be reversed later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDisableAlert(false);
                setBatchToDisable(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => batchToDisable && toggleStatus(batchToDisable.id, batchToDisable.is_enabled)}
                className="bg-red-500 hover:bg-red-600"
              >
                Disable
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}