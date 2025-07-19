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
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
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
import { BatchSelector } from "@/components/BatchSelector";

const formSchema = z.object({
  student_name: z.string().min(2, "Student name must be at least 2 characters"),
  batch_id: z.string().min(1, "Please select a batch"),
});

export default function ViewStudents() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState(null);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student_name: "",
      batch_id: "",
    },
  });

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          batches (
            batch_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch students. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  const handleEdit = async (values) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          student_name: values.student_name,
          batch_id: values.batch_id,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student updated successfully",
      });
      
      fetchStudents();
      setEditingStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update student. Please try again.",
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        const { error } = await supabase
          .from("students")
          .delete()
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Student deleted successfully",
        });
        
        fetchStudents();
      } catch (error) {
        console.error("Error deleting student:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete student. Please try again.",
        });
      }
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ is_enabled: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Student ${currentStatus ? "disabled" : "enabled"} successfully`,
      });
      
      fetchStudents();
    } catch (error) {
      console.error("Error toggling student status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update student status. Please try again.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-primary">Student List</h2>
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Finger 1</TableHead>
                <TableHead>Finger 2</TableHead>
                <TableHead>Finger 3</TableHead>
                <TableHead>Finger 4</TableHead>
                <TableHead>Finger 5</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentStudents.map((student) => (
                <TableRow 
                  key={student.id}
                  className={!student.is_enabled ? "bg-red-50" : ""}
                >
                  <TableCell className="font-medium">{student.student_name}</TableCell>
                  <TableCell>{student.batches?.batch_name}</TableCell>
                  <TableCell>{student.finger_1 ? "✓" : "✗"}</TableCell>
                  <TableCell>{student.finger_2 ? "✓" : "✗"}</TableCell>
                  <TableCell>{student.finger_3 ? "✓" : "✗"}</TableCell>
                  <TableCell>{student.finger_4 ? "✓" : "✗"}</TableCell>
                  <TableCell>{student.finger_5 ? "✓" : "✗"}</TableCell>
                  <TableCell>
                    <Button
                      variant={student.is_enabled ? "default" : "destructive"}
                      size="sm"
                      onClick={() => toggleStatus(student.id, student.is_enabled)}
                    >
                      {student.is_enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStudent(student);
                              form.reset({
                                student_name: student.student_name,
                                batch_id: student.batch_id?.toString(),
                              });
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Student</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="student_name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Student Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="batch_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Batch</FormLabel>
                                    <FormControl>
                                      <BatchSelector
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full">
                                Save Changes
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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