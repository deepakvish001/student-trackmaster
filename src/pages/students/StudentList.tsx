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
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOptimizedStudents } from '@/hooks/useOptimizedStudents';
import { useRealTimeBatchAccess } from '@/hooks/useRealTimeBatchAccess';
import { useInstantStudentUpdates } from '@/hooks/useInstantStudentUpdates';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StudentListSkeleton } from '@/components/students/StudentListSkeleton';
import { Users, Search, Filter, Download, RefreshCw, Shield, Activity, Clock, Database, Fingerprint, Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { exportStudentsToPDF } from '@/utils/pdfExport';
export default function StudentList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortBy, setSortBy] = useState<'student_name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const queryClient = useQueryClient();
  const {
    profile
  } = useUserProfile();

  // Enable real-time batch access updates
  const { isSubscribed } = useRealTimeBatchAccess();

  // Enable instant student updates for real-time CRUD operations (shared with Dashboard)
  const { forceRefresh } = useInstantStudentUpdates();

  // Use optimized data fetching hook with debounced search
  const {
    students,
    batches,
    stats,
    isLoading,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refetch,
    prefetchNextPage
  } = useOptimizedStudents({
    searchTerm,
    selectedBatch,
    sortBy,
    sortOrder,
    pageSize: 1000 // Show all students without pagination
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

  // Prefetch next page on hover for better UX
  const handlePrefetchNext = useCallback(() => {
    if (hasNextPage) {
      prefetchNextPage();
    }
  }, [hasNextPage, prefetchNextPage]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      console.log('Deleting student with ID:', studentId);
      const {
        error
      } = await supabase.from('students').update({
        is_enabled: false
      }).eq('id', studentId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['students-list']
      });
      toast.success('Student deleted successfully');
    },
    onError: error => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      studentId,
      updates
    }: {
      studentId: string;
      updates: Partial<Student>;
    }) => {
      console.log('Updating student:', studentId, updates);
      const {
        error
      } = await supabase.from('students').update({
        ...updates,
        updated_at: new Date().toISOString()
      }).eq('id', studentId);
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['students-list']
      });
      toast.success('Student updated successfully');
      setShowEditDialog(false);
      setEditingStudent(null);
    },
    onError: error => {
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

  // Print current page as PDF - exactly as it appears like Ctrl+P
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      toast.loading('🖨️ Preparing page for printing...', { id: 'pdf-generation' });
      
      // Add print-specific styles
      const printStyles = document.createElement('style');
      printStyles.id = 'print-styles';
      printStyles.innerHTML = `
        @media print {
          /* Hide navigation and non-essential elements */
          .sidebar, .header-nav, .print-hide {
            display: none !important;
          }
          
          /* Optimize page layout for printing */
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          /* Ensure content uses full page width */
          .max-w-7xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0.5in !important;
          }
          
          /* Optimize cards for printing */
          .premium-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            margin-bottom: 1rem !important;
            break-inside: avoid;
          }
          
          /* Optimize table for printing */
          .table-container {
            overflow: visible !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            border: 1px solid #ccc !important;
            padding: 8px !important;
            font-size: 12px !important;
            break-inside: avoid;
          }
          
          /* Ensure fingerprint images print correctly */
          img {
            max-width: 40px !important;
            max-height: 40px !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          /* Add page breaks appropriately */
          .page-break {
            page-break-before: always;
          }
          
          /* Hide buttons and interactive elements */
          button, .button, .btn {
            display: none !important;
          }
          
          /* Show only essential content */
          .print-only {
            display: block !important;
          }
        }
      `;
      document.head.appendChild(printStyles);
      
      // Add print title
      const printTitle = document.createElement('div');
      printTitle.className = 'print-only';
      printTitle.style.display = 'none';
      printTitle.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem; padding: 1rem; border-bottom: 2px solid #333;">
          <h1 style="margin: 0; font-size: 24px; color: #333;">Student Management Report</h1>
          <p style="margin: 0.5rem 0; color: #666;">Generated on ${new Date().toLocaleString()}</p>
          <p style="margin: 0; color: #666;">Total Students: ${stats.totalStudents}</p>
        </div>
      `;
      document.body.insertBefore(printTitle, document.body.firstChild);
      
      // Show success message
      toast.success('🖨️ Opening print dialog...', { id: 'pdf-generation' });
      
      // Small delay to ensure styles are applied
      setTimeout(() => {
        // Trigger print dialog
        window.print();
        
        // Cleanup after print
        setTimeout(() => {
          document.head.removeChild(printStyles);
          document.body.removeChild(printTitle);
          setIsGeneratingPDF(false);
          toast.success('✅ Print dialog opened successfully!', { id: 'pdf-generation' });
        }, 100);
      }, 500);
      
    } catch (error) {
      console.error('❌ Print preparation error:', error);
      toast.error('Failed to prepare page for printing', { id: 'pdf-generation' });
      setIsGeneratingPDF(false);
    }
  };
  if (isLoading) {
    return <DashboardLayout>
        <StudentListSkeleton />
      </DashboardLayout>;
  }
  return <DashboardLayout>
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
              
              {/* Real-time indicator (synced with Dashboard) */}
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-green font-medium">Live Updates Active (Synced)</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
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
              <Button 
                onClick={forceRefresh} 
                variant="outline" 
                className="h-12 px-6 border-2 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/5 rounded-2xl font-semibold transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Force Refresh
              </Button>
            </div>
          </div>

          {/* Premium Statistics */}
          

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
                      <Input placeholder="Search by name, mobile, or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-muted/20 border-2 border-border/50 focus:border-electric-blue focus:bg-background rounded-xl transition-all duration-300" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-vibrant-purple uppercase tracking-wider">Filter by Batch</Label>
                    <div className="relative group">
                      <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-vibrant-purple group-focus-within:scale-110 transition-transform duration-300" />
                      <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="pl-12 pr-4 h-12 w-full bg-muted/20 border-2 border-border/50 focus:border-vibrant-purple focus:bg-background rounded-xl transition-all duration-300 text-foreground">
                        <option value="all">All Batches</option>
                        {batches.map(batch => (
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
                      <select value={`${sortBy}-${sortOrder}`} onChange={e => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortOrder(order as any);
                    }} className="pl-12 pr-4 h-12 w-full bg-muted/20 border-2 border-border/50 focus:border-emerald-green focus:bg-background rounded-xl transition-all duration-300 text-foreground">
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
                  <EnhancedStudentTable students={students} onEdit={handleEdit} onDelete={handleDelete} />
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && <div className="flex items-center justify-between px-4 py-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Page {currentPage + 1} of {totalPages}</span>
                        <span>•</span>
                        <span>{stats.totalStudents} total students</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button onClick={goToPreviousPage} disabled={!hasPreviousPage} variant="outline" size="sm" className="h-10 px-4 border-border/50 hover:bg-electric-blue/5">
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({
                        length: Math.min(5, totalPages)
                      }, (_, i) => {
                        const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i;
                        return <Button key={pageNum} onClick={() => goToPage(pageNum)} variant={pageNum === currentPage ? "default" : "outline"} size="sm" className="h-10 w-10">
                                {pageNum + 1}
                              </Button>;
                      })}
                        </div>
                        
                        <Button onClick={goToNextPage} disabled={!hasNextPage} variant="outline" size="sm" className="h-10 px-4 border-border/50 hover:bg-electric-blue/5" onMouseEnter={handlePrefetchNext}>
                          Next
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>}
                </TabsContent>
                
                <TabsContent value="debug" className="space-y-4">
                  <StudentDataDebugger />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Edit Student Dialog */}
          <EditStudentDialog student={editingStudent} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={handleUpdateStudent} batches={batches} isUpdating={updateMutation.isPending} />
        </div>
      </div>
    </DashboardLayout>;
}