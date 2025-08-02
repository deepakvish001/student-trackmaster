
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { StudentActions } from '@/components/students/StudentActions';
import { toast } from 'sonner';

export default function ViewStudents() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const queryClient = useQueryClient();

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!selectedBatchId,
    refetchInterval: 2000, // Real-time updates every 2 seconds
    refetchIntervalInBackground: true
  });

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

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
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

  // Real-time update function for inline editing
  const handleInlineUpdate = async (studentId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) {
        console.error('Inline update error:', error);
        toast.error('Failed to update student');
        return;
      }
      
      // Refresh data immediately
      queryClient.invalidateQueries({ queryKey: ['students-filtered'] });
      toast.success('Student updated');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  };

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

  const handleToggleStatus = (student: Student) => {
    updateStudentMutation.mutate({
      studentId: student.id,
      updates: { is_enabled: !student.is_enabled }
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleViewStudent = (student: Student) => {
    const randomFingerprintId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const studentData = {
      ...student,
      fingerprintId: randomFingerprintId
    };

    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Student Details - ${student.student_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { border-bottom: 2px solid #007bff; padding-bottom: 15px; margin-bottom: 20px; }
            .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-group { background: #f8f9fa; padding: 15px; border-radius: 6px; }
            .label { font-weight: bold; color: #333; margin-bottom: 5px; }
            .value { color: #666; }
            .fingerprint-section { margin-top: 20px; }
            .fingerprint-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 15px; }
            .fingerprint-card { text-align: center; background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; }
            .fingerprint-image { width: 80px; height: 80px; margin: 0 auto 10px; background: #e9ecef; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #6c757d; }
            .fingerprint-status { font-size: 12px; font-weight: bold; }
            .available { color: #28a745; }
            .unavailable { color: #dc3545; }
            .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .status-active { background: #d4edda; color: #155724; }
            .status-inactive { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Student Finger List</h1>
              <p>Real-time student fingerprint details</p>
            </div>
            
            <div class="student-info">
              <div class="info-group">
                <div class="label">Student Name:</div>
                <div class="value">${student.student_name}</div>
              </div>
              <div class="info-group">
                <div class="label">Batch:</div>
                <div class="value">${student.batches?.batch_name || 'No Batch'}</div>
              </div>
              <div class="info-group">
                <div class="label">Fingerprint ID:</div>
                <div class="value">${randomFingerprintId}</div>
              </div>
              <div class="info-group">
                <div class="label">Status:</div>
                <div class="value">
                  <span class="status-badge ${student.is_enabled ? 'status-active' : 'status-inactive'}">
                    ${student.is_enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div class="fingerprint-section">
              <h2>Fingerprint Data</h2>
              <div class="fingerprint-grid">
                ${[1, 2, 3, 4, 5].map(i => `
                  <div class="fingerprint-card">
                    <div class="fingerprint-image">
                      ${student[`finger_${i}_image`] ? `<img src="${student[`finger_${i}_image`]}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />` : 'No Print'}
                    </div>
                    <div>Finger ${i}</div>
                    <div class="fingerprint-status ${student[`finger_${i}`] ? 'available' : 'unavailable'}">
                      ${student[`finger_${i}`] ? 'Available' : 'Not Available'}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  const FingerprintImage = ({ imageData, fingerNumber }: { imageData: string | null, fingerNumber: number }) => {
    if (!imageData) {
      return (
        <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
          No Print
        </div>
      );
    }

    let imageSrc = imageData;
    if (imageData && !imageData.startsWith('data:image/')) {
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

        {selectedBatchId && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Student List</h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-green-600 font-medium">
                      🔄 Real-time updates every 2 seconds
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Live Data
                    </Badge>
                  </div>
                </div>
                
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

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          Name
                          <Badge variant="outline" className="ml-2 text-xs bg-blue-50">Real-time</Badge>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Mobile Number</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Batch</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Address</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">Finger 1</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">Finger 2</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">Finger 3</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">Finger 4</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">Finger 5</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                            {selectedBatchId ? 'No students found in this batch.' : 'Please select a batch to view students.'}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.slice(0, entriesPerPage).map((student: Student) => (
                          <tr key={student.id} className={`border-t hover:bg-gray-50 transition-colors ${!student.is_enabled ? 'opacity-75 bg-gray-50' : ''}`}>
                            <td className="px-4 py-4 border-r">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  defaultValue={student.student_name}
                                  onBlur={(e) => {
                                    if (e.target.value !== student.student_name) {
                                      handleInlineUpdate(student.id, 'student_name', e.target.value);
                                    }
                                  }}
                                  className="font-medium bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 rounded px-2 py-1 w-full"
                                />
                                <Badge 
                                  variant={student.is_enabled ? "default" : "secondary"}
                                  className={`text-xs ${student.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                  {student.is_enabled ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4 border-r">
                              <div>{student.id.slice(-10)}</div>
                            </td>
                            <td className="px-4 py-4 border-r">
                              <div>{student.batches?.batch_name || 'No Batch'}</div>
                            </td>
                            <td className="px-4 py-4 border-r">
                              <div className="text-gray-500 text-sm">Not Available</div>
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage imageData={student.finger_1_image} fingerNumber={1} />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage imageData={student.finger_2_image} fingerNumber={2} />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage imageData={student.finger_3_image} fingerNumber={3} />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage imageData={student.finger_4_image} fingerNumber={4} />
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              <FingerprintImage imageData={student.finger_5_image} fingerNumber={5} />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StudentActions 
                                student={student}
                                onEdit={handleEditStudent}
                                onDelete={handleDeleteStudent}
                                onView={handleViewStudent}
                                onToggleStatus={handleToggleStatus}
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
