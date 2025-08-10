
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Plus,
  AlertTriangle,
  Edit,
  Trash2,
  Eye
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

  // Real-time students data with optimized fetching
  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students-realtime', searchTerm, selectedBatch, sortBy, sortOrder],
    queryFn: async () => {
      console.log('Fetching students with real-time setup...');
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
        toast.error('Failed to fetch students');
        throw error;
      }
      console.log('Students fetched successfully:', data?.length);
      return data || [];
    },
    refetchInterval: false, // Disable polling since we use real-time
    staleTime: 30000, // Cache for 30 seconds
  });

  // Real-time subscription for students table
  useEffect(() => {
    console.log('Setting up real-time subscription for students...');
    
    const channel = supabase
      .channel('students-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          // Invalidate and refetch the students query
          queryClient.invalidateQueries({ queryKey: ['students-realtime'] });
          
          // Show notification based on event type
          switch (payload.eventType) {
            case 'INSERT':
              toast.success('New student added');
              break;
            case 'UPDATE':
              toast.info('Student updated');
              break;
            case 'DELETE':
              toast.info('Student removed');
              break;
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Optimized batches query with caching
  const { data: batches = [] } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Optimized delete mutation with real-time updates
  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      console.log('Deleting student with ID:', studentId);
      const { error } = await supabase
        .from('students')
        .update({ is_enabled: false, updated_at: new Date().toISOString() })
        .eq('id', studentId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: (_, studentId) => {
      // Real-time will handle the update, but we can show immediate feedback
      queryClient.invalidateQueries({ queryKey: ['students-realtime'] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Optimized update mutation with real-time updates
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
      // Real-time will handle the update, but we can show immediate feedback
      queryClient.invalidateQueries({ queryKey: ['students-realtime'] });
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

  const handleDelete = async (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      console.log('Delete confirmed for student:', studentId);
      deleteMutation.mutate(studentId);
    }
  };

  const handleView = (student: Student) => {
    console.log('Viewing student details:', student);
    // Could implement a view-only dialog here
    toast.info(`Viewing details for ${student.student_name}`);
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

  // Real-time optimized statistics with memoization
  const stats = React.useMemo(() => {
    const totalStudents = students.length;
    const completeBiometrics = students.filter(s => 
      [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5
    ).length;
    const partialBiometrics = students.filter(s => {
      const count = [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length;
      return count > 0 && count < 5;
    }).length;
    const noBiometrics = students.filter(s => 
      [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 0
    ).length;

    return {
      totalStudents,
      completeBiometrics,
      partialBiometrics,
      noBiometrics
    };
  }, [students]);

  // Fast loading state with real-time indicator
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-electric-blue/5 flex items-center justify-center p-6">
          <div className="premium-card p-12 text-center space-y-6 max-w-md">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div>
              <h3 className="text-2xl font-bold text-electric-blue animate-pulse">Loading Students...</h3>
              <p className="text-muted-foreground mt-2">Setting up real-time data connection</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-electric-blue/5 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Real-time header with live indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-electric-blue/10 border border-electric-blue/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-electric-blue" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">Student List</h1>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-green/10 border border-emerald-green/20 rounded-full">
                    <div className="w-2 h-2 bg-emerald-green rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-emerald-green">Live</span>
                  </div>
                </div>
                <p className="text-muted-foreground">{stats.totalStudents} students • Real-time updates enabled</p>
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
                          {[1, 2, 3, 4, 5].map((fingerIndex) => {
                            const imageData = student[`finger_${fingerIndex}_image` as keyof typeof student] as string;
                            const templateData = student[`finger_${fingerIndex}` as keyof typeof student] as string;
                            
                            return (
                              <td key={fingerIndex} className="p-3 border-r border-border text-center">
                                <div className="w-16 h-16 mx-auto bg-muted/20 border border-border rounded flex items-center justify-center overflow-hidden">
                                  {imageData && imageData.trim() ? (
                                    <img 
                                      src={imageData}
                                      alt={`Finger ${fingerIndex}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Hide broken images and show template icon instead
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent && templateData) {
                                          parent.innerHTML = `
                                            <div class="w-12 h-12 bg-electric-blue/10 rounded flex items-center justify-center">
                                              <svg class="w-6 h-6 text-electric-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                              </svg>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  ) : templateData && templateData.trim() ? (
                                    <div className="w-12 h-12 bg-electric-blue/10 rounded flex items-center justify-center">
                                      <Shield className="w-6 h-6 text-electric-blue" />
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">No Data</div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleView(student)}
                                className="h-8 w-8 p-0 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(student)}
                                className="h-8 w-8 p-0 border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10"
                                title="Edit Student"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(student.id)}
                                disabled={deleteMutation.isPending}
                                className="h-8 w-8 p-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                                title="Delete Student"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
