
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedStudentTable } from '@/components/students/EnhancedStudentTable';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
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
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .update({ is_enabled: false })
        .eq('id', studentId);
      if (error) throw error;
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
      const { error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);
      if (error) throw error;
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
    setEditingStudent(student);
    setShowEditDialog(true);
  };

  const handleDelete = (studentId: number) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteMutation.mutate(studentId.toString());
    }
  };

  const handleUpdateStudent = (updates: Partial<Student>) => {
    if (editingStudent) {
      updateMutation.mutate({
        studentId: editingStudent.id.toString(),
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
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Enhanced Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose bg-clip-text text-transparent">
                📋 Student Management List
              </h1>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-electric-blue animate-pulse" />
                  <span className="font-mono text-electric-blue text-lg">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-emerald-green" />
                  <span className="text-emerald-green font-semibold">
                    {stats.totalStudents} Total Records
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => window.location.href = '/students/enhanced-add'}
                className="bg-gradient-to-r from-emerald-green to-electric-blue hover:scale-105 transition-all duration-300 shadow-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 shadow-glow"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="glass border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export List
              </Button>
            </div>
          </div>

          {/* Real-time Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wide">Complete</p>
                    <p className="text-3xl font-bold text-electric-blue">{stats.completeBiometrics}</p>
                  </div>
                  <Fingerprint className="h-8 w-8 text-electric-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wide">Partial</p>
                    <p className="text-3xl font-bold text-sunset-orange">{stats.partialBiometrics}</p>
                  </div>
                  <Shield className="h-8 w-8 text-sunset-orange" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wide">Incomplete</p>
                    <p className="text-3xl font-bold text-pink-rose">{stats.noBiometrics}</p>
                  </div>
                  <Activity className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wide">Total</p>
                    <p className="text-3xl font-bold text-emerald-green">{stats.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Filters */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-electric-blue">Search Students</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue" />
                    <Input
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-green">Filter by Batch</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="pl-12 pr-8 py-3 glass bg-surface-darker border-emerald-green/30 text-foreground rounded-lg focus:border-emerald-green h-12 min-w-[200px]"
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-sunset-orange">Sort By</label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortOrder(order as any);
                    }}
                    className="px-4 py-3 glass bg-surface-darker border-sunset-orange/30 text-foreground rounded-lg focus:border-sunset-orange h-12 min-w-[160px]"
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

          {/* Enhanced Student Table with CRUD Operations */}
          <Card className="glass-card border-foreground/10">
            <CardHeader className="bg-gradient-to-r from-electric-blue/5 via-emerald-green/5 to-pink-rose/5">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                <Users className="h-6 w-6 mr-3 text-electric-blue" />
                Student Records ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <EnhancedStudentTable
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
