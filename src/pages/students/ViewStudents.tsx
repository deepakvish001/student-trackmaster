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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Edit, Trash, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/types";

export default function ViewStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
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
          table: 'students'
        },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        batches (
          batch_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStudents(data);
  };

  const handleToggleStatus = async (student: Student) => {
    const { error } = await supabase
      .from('students')
      .update({ is_enabled: !student.is_enabled })
      .eq('id', student.id);

    if (error) {
      toast({
        title: "Error updating student status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Student ${student.is_enabled ? 'disabled' : 'enabled'} successfully`,
    });
  };

  const handleDelete = async (student: Student) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', student.id);

    if (error) {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Student deleted successfully",
    });
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>View Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

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
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.student_name}</TableCell>
                  <TableCell>{(student.batches as any)?.batch_name}</TableCell>
                  <TableCell>{student.finger_1 || '-'}</TableCell>
                  <TableCell>{student.finger_2 || '-'}</TableCell>
                  <TableCell>{student.finger_3 || '-'}</TableCell>
                  <TableCell>{student.finger_4 || '-'}</TableCell>
                  <TableCell>{student.finger_5 || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      student.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.is_enabled ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(student)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Implement edit functionality
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(student)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}