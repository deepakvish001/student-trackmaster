import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Student } from '@/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOfflineStudents } from '@/hooks/useOfflineStudents';
import { useOfflineMutations } from '@/hooks/useOfflineMutations';
import { useCollaborativeStudents } from '@/hooks/useCollaborativeStudents';
import { SyncButton } from '@/components/SyncButton';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineTooltip } from '@/components/OfflineTooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StudentListSkeleton } from '@/components/students/StudentListSkeleton';
import { Users, Search, Filter, Download, RefreshCw, Shield, Activity, Clock, Database, Fingerprint, Plus, AlertTriangle, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortBy, setSortBy] = useState<'student_name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Initialize hooks
  const { profile } = useUserProfile();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();
  const { students: offlineMutations } = useOfflineMutations();

  // Use offline-capable students hook
  const {
    students,
    batches,
    stats,
    totalCount,
    isLoading,
    isLoadingStudents,
    isLoadingBatches,
    error,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPage,
    refetch
  } = useCollaborativeStudents({
    searchTerm,
    selectedBatch,
    sortBy,
    sortOrder,
    enabled: !!profile
  });

  // Debug students data
  useEffect(() => {
    console.log('🔍 StudentList: Students data updated:', {
      count: students.length,
      totalStats: stats.totalStudents,
      students: students.map(s => ({ id: s.id, name: s.student_name }))
    });
  }, [students, stats.totalStudents]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Delete student mutation using offline capabilities
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await offlineMutations.delete.mutateAsync(studentId);
    },
    onSuccess: () => {
      toast.success(isOnline ? 'Student deleted successfully!' : 'Student deleted offline - will sync when online');
      refetch();
    },
    onError: (error) => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ studentId, updates }: { studentId: string; updates: Partial<Student> }) => {
      await offlineMutations.update.mutateAsync({ id: studentId, data: updates });
    },
    onSuccess: () => {
      toast.success(isOnline ? 'Student updated successfully' : 'Student updated offline - will sync when online');
      setShowEditDialog(false);
      setEditingStudent(null);
      refetch();
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
    deleteStudentMutation.mutate(studentId);
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

  // Download PDF function - exactly like Ctrl+P
  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    
    try {
      console.log('🔄 Opening print dialog (same as Ctrl+P)');
      toast.success('📄 Opening print dialog - save as PDF!', { duration: 2000 });
      
      // Exactly like pressing Ctrl+P
      window.print();
      
    } catch (error) {
      console.error('❌ Print dialog error:', error);
      toast.error('Failed to open print dialog');
    } finally {
      // Reset loading state after a short delay
      setTimeout(() => {
        setIsGeneratingPDF(false);
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <StudentListSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
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
                  <p className="text-lg text-muted-foreground">View and manage students in your accessible batches</p>
                </div>
              </div>
              
              {/* Online/Offline indicator */}
              <div className="flex items-center space-x-2 text-sm">
                {isOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-green font-medium">Online - Live Updates Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-500 font-medium">Offline Mode - Changes will sync when online</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SyncButton />
              
              <OfflineTooltip requiresOnline={false}>
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={isGeneratingPDF}
                  variant="outline" 
                  className="h-12 px-6 border-2 border-emerald-green/30 text-emerald-green hover:bg-emerald-green/5 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-semibold transition-all duration-300 hover:scale-105"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin h-5 w-5 mr-3 border-2 border-emerald-green border-t-transparent rounded-full"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-3" />
                      Download PDF
                    </>
                  )}
                </Button>
              </OfflineTooltip>
              
              <OfflineTooltip requiresOnline={false}>
                <Button 
                  onClick={() => {
                    const enabledBatches = batches.filter(batch => batch.is_enabled);
                    if (enabledBatches.length === 0) {
                      toast.error('No enabled batches available. Enable a batch first to add students.');
                      return;
                    }
                    window.location.href = '/students/enhanced-add';
                  }} 
                  className="h-12 px-6 bg-sunset-orange hover:bg-sunset-orange/90 text-white rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-3" />
                  Add New Student
                </Button>
              </OfflineTooltip>
              
              <Button 
                onClick={refetch} 
                variant="outline" 
                className="h-12 px-6 border-2 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/5 rounded-2xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Premium Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-electric-blue/10 border border-electric-blue/20 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-electric-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-green/10 border border-emerald-green/20 rounded-xl flex items-center justify-center">
                    <Fingerprint className="h-6 w-6 text-emerald-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Complete Biometrics</p>
                    <p className="text-2xl font-bold text-foreground">{stats.completeBiometrics}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-sunset-orange/10 border border-sunset-orange/20 rounded-xl flex items-center justify-center">
                    <Activity className="h-6 w-6 text-sunset-orange" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Partial Biometrics</p>
                    <p className="text-2xl font-bold text-foreground">{stats.partialBiometrics}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No Biometrics</p>
                    <p className="text-2xl font-bold text-foreground">{stats.noBiometrics}</p>
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
                            {batch.batch_name} {!batch.is_enabled ? '(Disabled)' : ''}
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
                  <p className="text-sm text-muted-foreground">{stats.totalStudents} active student records</p>
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