
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudentFingerprintView } from "@/components/StudentFingerprintView";
import { BulkImportDialog } from "@/components/students/BulkImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Filter, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";

interface Student {
  id: string;
  student_name: string;
  batch_id: string;
  finger_1?: string;
  finger_2?: string;
  finger_3?: string;
  finger_4?: string;
  finger_5?: string;
  finger_1_image?: string;
  finger_2_image?: string;
  finger_3_image?: string;
  finger_4_image?: string;
  finger_5_image?: string;
  created_at: string;
  batches?: {
    batch_name: string;
    admin_name: string;
  };
}

export default function ViewStudents() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const { data: students, isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      console.log('Fetching students...');
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_name,
          batch_id,
          finger_1,
          finger_2,
          finger_3,
          finger_4,
          finger_5,
          finger_1_image,
          finger_2_image,
          finger_3_image,
          finger_4_image,
          finger_5_image,
          created_at,
          batches (
            batch_name,
            admin_name
          )
        `)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      console.log('Students fetched:', data?.length || 0);
      return data as Student[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');

      if (error) throw error;
      return data;
    },
  });

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.student_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatch ? student.batch_id === selectedBatch : true;
    return matchesSearch && matchesBatch;
  });

  const exportToExcel = () => {
    if (!filteredStudents?.length) {
      toast.error('No students to export');
      return;
    }

    const exportData = filteredStudents.map(student => ({
      'Student Name': student.student_name,
      'Batch': student.batches?.batch_name || 'Unknown',
      'Admin': student.batches?.admin_name || 'Unknown',
      'Fingerprints': [
        student.finger_1,
        student.finger_2,
        student.finger_3,
        student.finger_4,
        student.finger_5
      ].filter(Boolean).length,
      'Registration Date': new Date(student.created_at).toLocaleDateString(),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Students exported successfully!');
  };

  const getFingerprintCount = (student: Student) => {
    return [
      student.finger_1,
      student.finger_2,
      student.finger_3,
      student.finger_4,
      student.finger_5
    ].filter(Boolean).length;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Student Management</h2>
          <div className="flex gap-3">
            <BulkImportDialog onImportComplete={refetch} />
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => navigate('/students/add')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{students?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Fingerprints</p>
                  <p className="text-2xl font-bold">
                    {students?.filter(s => getFingerprintCount(s) > 0).length || 0}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600">
                  {students?.length ? Math.round((students.filter(s => getFingerprintCount(s) > 0).length / students.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Complete Profiles</p>
                  <p className="text-2xl font-bold">
                    {students?.filter(s => getFingerprintCount(s) === 5).length || 0}
                  </p>
                </div>
                <Badge variant="outline" className="text-blue-600">
                  {students?.length ? Math.round((students.filter(s => getFingerprintCount(s) === 5).length / students.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Batches</option>
                  {batches?.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <div className="grid gap-4">
          {filteredStudents?.map((student) => (
            <Card key={student.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="cursor-pointer" onClick={() => 
                setExpandedStudent(expandedStudent === student.id ? null : student.id)
              }>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-lg">{student.student_name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {student.batches?.batch_name || 'Unknown Batch'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">
                      {getFingerprintCount(student)}/5 Fingerprints
                    </Badge>
                    <Badge 
                      variant={getFingerprintCount(student) === 5 ? "default" : 
                              getFingerprintCount(student) > 0 ? "secondary" : "outline"}
                    >
                      {getFingerprintCount(student) === 5 ? 'Complete' : 
                       getFingerprintCount(student) > 0 ? 'Partial' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {expandedStudent === student.id && (
                <CardContent>
                  <StudentFingerprintView student={student} showQuality />
                </CardContent>
              )}
            </Card>
          ))}

          {filteredStudents?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Students Found</h3>
                <p className="text-gray-500">
                  {searchTerm || selectedBatch ? 'Try adjusting your filters.' : 'Start by adding your first student.'}
                </p>
                {!searchTerm && !selectedBatch && (
                  <Button onClick={() => navigate('/students/add')} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Student
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
