
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedStudentTable } from '@/components/students/EnhancedStudentTable';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { StudentDataDebugger } from '@/components/students/StudentDataDebugger';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Shield, 
  Activity,
  Clock,
  Database,
  Fingerprint,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortBy, setSortBy] = useState<'student_name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const queryClient = useQueryClient();
  const { profile } = useUserProfile();

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students-list', searchTerm, selectedBatch, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            batch_name
          )
        `)
        .eq('is_enabled', true);

      if (searchTerm) {
        query = query.ilike('student_name', `%${searchTerm}%`);
      }

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      return data || [];
    },
    refetchInterval: 30000
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true);
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      console.log('Deleting student with ID:', studentId);
      const { error } = await supabase
        .from('students')
        .update({ is_enabled: false })
        .eq('id', studentId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ studentId, updates }: { studentId: string; updates: Partial<Student> }) => {
      console.log('Updating student:', studentId, updates);
      const { error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-list'] });
      toast.success('Student updated successfully');
      setShowEditDialog(false);
      setEditingStudent(null);
    },
    onError: (error) => {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  });

  const handleEdit = (student: Student) => {
    console.log('Editing student:', student);
    setEditingStudent(student);
    setShowEditDialog(true);
  };

  const handleDelete = (studentId: string) => {
    console.log('Delete requested for student:', studentId);
    deleteMutation.mutate(studentId);
  };

  const handleUpdateStudent = (updates: Partial<Student>) => {
    console.log('Update student with:', updates);
    if (editingStudent) {
      updateMutation.mutate({
        studentId: editingStudent.id,
        updates
      });
    }
  };

  // Real-time statistics
  const stats = {
    totalStudents: students.length,
    completeBiometrics: students.filter(s => [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5).length,
    partialBiometrics: students.filter(s => {
      const count = [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length;
      return count > 0 && count < 5;
    }).length,
    noBiometrics: students.filter(s => [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 0).length
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Student List...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">Students</h1>
              <p className="text-sm text-muted-foreground">{stats.totalStudents} total records</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.location.href = '/students/enhanced-add'}
                className="modern-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="modern-button-outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complete</p>
                    <p className="text-lg font-semibold text-foreground">{stats.completeBiometrics}</p>
                  </div>
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Partial</p>
                    <p className="text-lg font-semibold text-foreground">{stats.partialBiometrics}</p>
                  </div>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incomplete</p>
                    <p className="text-lg font-semibold text-foreground">{stats.noBiometrics}</p>
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                    <p className="text-lg font-semibold text-foreground">{stats.totalStudents}</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="modern-card">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium">Search Students</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="modern-input pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filter by Batch</Label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="modern-input min-w-[200px]"
                  >
                    <option value="all">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortOrder(order as any);
                    }}
                    className="modern-input min-w-[160px]"
                  >
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                    <option value="student_name-asc">Name A-Z</option>
                    <option value="student_name-desc">Name Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Table */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Student Records ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="table" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">Student List</TabsTrigger>
                  <TabsTrigger value="debug">Debug Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table" className="space-y-4">
                  <EnhancedStudentTable
                    students={students}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </TabsContent>
                
                <TabsContent value="debug" className="space-y-4">
                  <StudentDataDebugger />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Edit Student Dialog */}
          <EditStudentDialog
            student={editingStudent}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onUpdate={handleUpdateStudent}
            batches={batches}
            isUpdating={updateMutation.isPending}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
