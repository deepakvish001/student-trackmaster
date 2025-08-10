
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Clean Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-electric-blue/10 border border-electric-blue/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-electric-blue" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Student List</h1>
                <p className="text-muted-foreground">{stats.totalStudents} total students</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.location.href = '/students/enhanced-add'}
                className="h-10 px-4 bg-electric-blue hover:bg-electric-blue/90 text-white font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="h-10 px-4 border border-border hover:bg-muted/50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Main Content Card */}
          <Card className="premium-card">
            <CardContent className="p-6">
              {/* Batch Filter */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-64">
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Batch Name
                    </label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-md text-foreground focus:border-electric-blue focus:outline-none"
                    >
                      <option value="all">-- Select Batch --</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-6">
                    <Button
                      onClick={() => refetch()}
                      className="h-10 px-6 bg-electric-blue hover:bg-electric-blue/90 text-white font-medium"
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </div>

              {/* Student List Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Student List</h3>
                
                {/* Table Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show</span>
                    <select className="h-8 px-2 bg-background border border-border rounded text-sm">
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <span className="text-sm text-muted-foreground">entries</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Search:</span>
                    <Input
                      placeholder=""
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Data Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-semibold text-foreground border-r border-border">StudentName</th>
                        <th className="text-left p-3 font-semibold text-foreground border-r border-border">Batch</th>
                        <th className="text-center p-3 font-semibold text-foreground border-r border-border">Finger 1</th>
                        <th className="text-center p-3 font-semibold text-foreground border-r border-border">Finger 2</th>
                        <th className="text-center p-3 font-semibold text-foreground border-r border-border">Finger 3</th>
                        <th className="text-center p-3 font-semibold text-foreground border-r border-border">Finger 4</th>
                        <th className="text-center p-3 font-semibold text-foreground border-r border-border">Finger 5</th>
                        <th className="text-center p-3 font-semibold text-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                          <td className="p-3 border-r border-border">
                            <div>
                              <div className="font-medium text-foreground">{student.student_name}</div>
                              <div className="text-sm text-muted-foreground">ID: {student.id}</div>
                            </div>
                          </td>
                          <td className="p-3 border-r border-border">
                            <div className="text-foreground">
                              {student.batches?.batch_name || 'No Batch'}
                            </div>
                          </td>
                          {[1, 2, 3, 4, 5].map((fingerIndex) => (
                            <td key={fingerIndex} className="p-3 border-r border-border text-center">
                              <div className="w-16 h-16 mx-auto bg-muted/20 border border-border rounded flex items-center justify-center overflow-hidden">
                                {student[`finger_${fingerIndex}_image` as keyof typeof student] ? (
                                  <img 
                                    src={student[`finger_${fingerIndex}_image` as keyof typeof student] as string}
                                    alt={`Finger ${fingerIndex}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : student[`finger_${fingerIndex}` as keyof typeof student] ? (
                                  <div className="w-12 h-12 bg-electric-blue/10 rounded flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-electric-blue" />
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No Data</div>
                                )}
                              </div>
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <select 
                              className="h-8 px-3 bg-sunset-orange hover:bg-sunset-orange/90 text-white rounded font-medium cursor-pointer"
                              onChange={(e) => {
                                if (e.target.value === 'edit') {
                                  handleEdit(student);
                                } else if (e.target.value === 'delete') {
                                  handleDelete(student.id);
                                }
                                e.target.value = 'action'; // Reset selection
                              }}
                              defaultValue="action"
                            >
                              <option value="action">Action</option>
                              <option value="edit">Edit</option>
                              <option value="delete">Delete</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {students.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Database className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No students found</p>
                    </div>
                  )}
                </div>

                {/* Pagination Info */}
                {students.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Showing 1 to {students.length} of {stats.totalStudents} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" disabled>
                        Previous
                      </Button>
                      <span className="px-3 py-1 bg-electric-blue text-white rounded text-sm">1</span>
                      <Button variant="outline" size="sm" disabled>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
