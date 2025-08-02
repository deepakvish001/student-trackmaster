
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { StudentActions } from '@/components/students/StudentActions';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { toast } from 'sonner';

export default function ViewStudents() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const queryClient = useQueryClient();

  // Fetch batches for dropdown
  const { data: batches = [] } = useQuery({
    queryKey: ['batches-for-filter'],
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
    }
  });

  // Fetch students based on selected batch with real-time updates
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-filtered', selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            batch_name
          )
        `)
        .eq('batch_id', selectedBatchId)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      
      console.log('Students data with fingerprints:', data?.map(student => ({
        id: student.id,
        name: student.student_name,
        fingerprints: {
          finger_1_image: !!student.finger_1_image,
          finger_2_image: !!student.finger_2_image,
          finger_3_image: !!student.finger_3_image,
          finger_4_image: !!student.finger_4_image,
          finger_5_image: !!student.finger_5_image,
        }
      })));
      
      return data || [];
    },
    enabled: !!selectedBatchId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async ({ studentId, updates }: { studentId: string; updates: Partial<Student> }) => {
      const { error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) {
        console.error('Update student error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-filtered'] });
      toast.success('Student updated successfully');
      setShowEditDialog(false);
      setEditingStudent(null);
    },
    onError: (error) => {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  });

  // Delete student mutation (soft delete)
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .update({ 
          is_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) {
        console.error('Delete student error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-filtered'] });
      toast.success('Student deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  });

  // Filter students based on search term
  const filteredStudents = students.filter((student: Student) =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    console.log('Submit clicked with batch:', selectedBatchId);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditDialog(true);
  };

  const handleUpdateStudent = (updates: Partial<Student>) => {
    if (editingStudent) {
      updateStudentMutation.mutate({
        studentId: editingStudent.id,
        updates
      });
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    deleteStudentMutation.mutate(studentId);
  };

  const handleViewStudent = (student: Student) => {
    console.log('Viewing student:', student);
    // You can implement a view dialog here if needed
    toast.info(`Viewing details for ${student.student_name}`);
  };

  // Enhanced fingerprint image component with real-time display
  const FingerprintImage = ({ imageData, fingerNumber }: { imageData: string | null, fingerNumber: number }) => {
    if (!imageData) {
      return (
        <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
          No Print
        </div>
      );
    }

    // Handle different image data formats
    let imageSrc = imageData;
    if (imageData && !imageData.startsWith('data:image/')) {
      // If it's base64 without data URL prefix, add it
      if (imageData.length > 1000) {
        imageSrc = `data:image/png;base64,${imageData}`;
      }
    }

    return (
      <div className="relative">
        <img
          src={imageSrc}
          alt={`Finger ${fingerNumber}`}
          className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
          style={{ 
            filter: 'contrast(1.2) brightness(1.1)',
            imageRendering: 'crisp-edges'
          }}
          onError={(e) => {
            console.error(`Failed to load fingerprint image for finger ${fingerNumber}`, imageData?.substring(0, 100));
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="w-12 h-12 mx-auto bg-red-100 rounded border flex items-center justify-center text-red-400 text-xs">
                  Error
                </div>
              `;
            }
          }}
          onLoad={() => {
            console.log(`✅ Fingerprint image loaded successfully for finger ${fingerNumber}`);
          }}
        />
        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
          ✓
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student List</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="text-blue-600 hover:underline cursor-pointer">Home</span>
            <span className="mx-2">/</span>
            <span>Student List</span>
          </div>
        </div>

        {/* Batch Selection Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Name</label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="-- Select Batch --" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        {selectedBatchId && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Student List</h3>
                  <div className="text-sm text-green-600 font-medium">
                    Auto-refreshing every 5 seconds
                  </div>
                </div>
                
                {/* Table Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Show</span>
                    <Select value={entriesPerPage.toString()} onValueChange={(value) => setEntriesPerPage(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">entries</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Search:</span>
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                      placeholder=""
                    />
                  </div>
                </div>

                {/* Students Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          StudentName
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Finger 1
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Finger 2
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Finger 3
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Finger 4
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Finger 5
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            {selectedBatchId ? 'No students found in this batch.' : 'Please select a batch to view students.'}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.slice(0, entriesPerPage).map((student: Student) => (
                          <tr key={student.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-4 border-r">
                              <div>
                                <div className="font-medium">{student.student_name}</div>
                                <div className="text-sm text-gray-600">Mob: {student.id.slice(-10)}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-r">
                              <div>
                                <div>{student.batches?.batch_name}</div>
                                <div className="text-sm text-gray-600">Batch 1</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage 
                                imageData={student.finger_1_image} 
                                fingerNumber={1} 
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage 
                                imageData={student.finger_2_image} 
                                fingerNumber={2} 
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage 
                                imageData={student.finger_3_image} 
                                fingerNumber={3} 
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage 
                                imageData={student.finger_4_image} 
                                fingerNumber={4} 
                              />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage 
                                imageData={student.finger_5_image} 
                                fingerNumber={5} 
                              />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StudentActions
                                student={student}
                                onEdit={handleEditStudent}
                                onDelete={handleDeleteStudent}
                                onView={handleViewStudent}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Student Dialog */}
        <EditStudentDialog
          student={editingStudent}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onUpdate={handleUpdateStudent}
          batches={batches}
          isUpdating={updateStudentMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
