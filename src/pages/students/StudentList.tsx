
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
  Plus,
  AlertTriangle
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-electric-blue/5 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Premium Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-electric-blue/10 border border-electric-blue/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-electric-blue" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-branded-gradient">Student Management</h1>
                  <p className="text-lg text-muted-foreground">{stats.totalStudents} active enrollments across all batches</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => window.location.href = '/students/enhanced-add'}
                className="h-12 px-6 bg-electric-blue hover:bg-electric-blue/90 text-white rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-glow"
              >
                <Plus className="h-5 w-5 mr-3" />
                Add New Student
              </Button>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="h-12 px-6 border-2 border-vibrant-purple/30 text-vibrant-purple hover:bg-vibrant-purple/5 rounded-2xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Premium Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-emerald-green/10 border border-emerald-green/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Fingerprint className="h-7 w-7 text-emerald-green" />
                    </div>
                    <Activity className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-green uppercase tracking-wider">
                      Complete Biometrics
                    </h3>
                    <p className="text-3xl font-bold text-foreground">{stats.completeBiometrics}</p>
                    <p className="text-sm text-muted-foreground">Fully enrolled students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-sunset-orange/10 border border-sunset-orange/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-7 w-7 text-sunset-orange" />
                    </div>
                    <Clock className="h-5 w-5 text-sunset-orange" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sunset-orange uppercase tracking-wider">
                      Partial Biometrics
                    </h3>
                    <p className="text-3xl font-bold text-foreground">{stats.partialBiometrics}</p>
                    <p className="text-sm text-muted-foreground">In progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-pink-rose/10 border border-pink-rose/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Activity className="h-7 w-7 text-pink-rose" />
                    </div>
                    <AlertTriangle className="h-5 w-5 text-pink-rose" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-pink-rose uppercase tracking-wider">
                      Incomplete
                    </h3>
                    <p className="text-3xl font-bold text-foreground">{stats.noBiometrics}</p>
                    <p className="text-sm text-muted-foreground">Requires enrollment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-electric-blue/10 border border-electric-blue/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-7 w-7 text-electric-blue" />
                    </div>
                    <Database className="h-5 w-5 text-electric-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-electric-blue uppercase tracking-wider">
                      Total Students
                    </h3>
                    <p className="text-3xl font-bold text-foreground">{stats.totalStudents}</p>
                    <p className="text-sm text-muted-foreground">System-wide</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Filters */}
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-xl flex items-center justify-center">
                    <Search className="h-5 w-5 text-vibrant-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Advanced Search & Filters</h3>
                    <p className="text-sm text-muted-foreground">Find students quickly with powerful filtering options</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-electric-blue uppercase tracking-wider">Search Students</Label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue group-focus-within:scale-110 transition-transform duration-300" />
                      <Input
                        placeholder="Search by name, mobile, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 h-12 bg-muted/20 border-2 border-border/50 focus:border-electric-blue focus:bg-background rounded-xl transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-vibrant-purple uppercase tracking-wider">Filter by Batch</Label>
                    <div className="relative group">
                      <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-vibrant-purple group-focus-within:scale-110 transition-transform duration-300" />
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="pl-12 pr-4 h-12 w-full bg-muted/20 border-2 border-border/50 focus:border-vibrant-purple focus:bg-background rounded-xl transition-all duration-300 text-foreground"
                      >
                        <option value="all">All Batches</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-emerald-green uppercase tracking-wider">Sort By</Label>
                    <div className="relative group">
                      <Database className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green group-focus-within:scale-110 transition-transform duration-300" />
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setSortBy(field as any);
                          setSortOrder(order as any);
                        }}
                        className="pl-12 pr-4 h-12 w-full bg-muted/20 border-2 border-border/50 focus:border-emerald-green focus:bg-background rounded-xl transition-all duration-300 text-foreground"
                      >
                        <option value="created_at-desc">Newest First</option>
                        <option value="created_at-asc">Oldest First</option>
                        <option value="student_name-asc">Name A-Z</option>
                        <option value="student_name-desc">Name Z-A</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Student Table */}
          <Card className="premium-card">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-electric-blue/10 border border-electric-blue/20 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-electric-blue" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">Student Database</CardTitle>
                  <p className="text-sm text-muted-foreground">{students.length} active student records</p>
                </div>
              </div>
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
