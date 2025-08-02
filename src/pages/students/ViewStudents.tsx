
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Eye, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!selectedBatchId,
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });

  // Update student mutation for enable/disable
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
      toast.success('Student status updated successfully');
      setShowEditDialog(false);
      setEditingStudent(null);
    },
    onError: (error) => {
      console.error('Error updating student:', error);
      toast.error('Failed to update student status');
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

  const handleToggleStatus = (student: Student) => {
    updateStudentMutation.mutate({
      studentId: student.id,
      updates: { is_enabled: !student.is_enabled }
    });
  };

  const handleViewStudent = (student: Student) => {
    // Generate random fingerprint ID
    const fingerprintId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Create a new window/tab with student details
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Student Details - ${student.student_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              background: #f5f5f5; 
            }
            .container { 
              max-width: 1000px; 
              margin: 0 auto; 
              background: white; 
              padding: 30px; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #e5e5e5; 
              padding-bottom: 20px; 
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px; 
              margin-bottom: 30px; 
            }
            .info-item { 
              padding: 10px; 
              border: 1px solid #e5e5e5; 
              border-radius: 4px; 
            }
            .fingerprints { 
              display: grid; 
              grid-template-columns: repeat(5, 1fr); 
              gap: 15px; 
              margin-bottom: 20px; 
            }
            .fingerprint { 
              text-align: center; 
              border: 1px solid #e5e5e5; 
              padding: 15px; 
              border-radius: 8px; 
            }
            .fingerprint img { 
              width: 80px; 
              height: 80px; 
              object-fit: cover; 
              border-radius: 4px; 
              border: 1px solid #ddd; 
            }
            .no-print { 
              width: 80px; 
              height: 80px; 
              background: #f0f0f0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              border-radius: 4px; 
              color: #999; 
              font-size: 12px; 
            }
            .status-enabled { 
              color: green; 
              font-weight: bold; 
            }
            .status-disabled { 
              color: red; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${student.student_name}</h1>
              <p>Fingerprint ID: <strong>${fingerprintId}</strong></p>
              <p>Status: <span class="${student.is_enabled ? 'status-enabled' : 'status-disabled'}">
                ${student.is_enabled ? 'ENABLED' : 'DISABLED'}
              </span></p>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <strong>Name:</strong> ${student.student_name}
              </div>
              <div class="info-item">
                <strong>Mobile:</strong> ${student.id.slice(-10)}
              </div>
              <div class="info-item">
                <strong>Batch:</strong> ${student.batches?.batch_name || 'No Batch'}
              </div>
              <div class="info-item">
                <strong>Address:</strong> Not Available
              </div>
              <div class="info-item">
                <strong>Created:</strong> ${new Date(student.created_at).toLocaleDateString()}
              </div>
              <div class="info-item">
                <strong>Updated:</strong> ${new Date(student.updated_at).toLocaleDateString()}
              </div>
            </div>
            
            <h3>Fingerprint Data</h3>
            <div class="fingerprints">
              <div class="fingerprint">
                <h4>Finger 1</h4>
                ${student.finger_1_image ? 
                  `<img src="${student.finger_1_image}" alt="Finger 1" />` : 
                  '<div class="no-print">No Print</div>'
                }
              </div>
              <div class="fingerprint">
                <h4>Finger 2</h4>
                ${student.finger_2_image ? 
                  `<img src="${student.finger_2_image}" alt="Finger 2" />` : 
                  '<div class="no-print">No Print</div>'
                }
              </div>
              <div class="fingerprint">
                <h4>Finger 3</h4>
                ${student.finger_3_image ? 
                  `<img src="${student.finger_3_image}" alt="Finger 3" />` : 
                  '<div class="no-print">No Print</div>'
                }
              </div>
              <div class="fingerprint">
                <h4>Finger 4</h4>
                ${student.finger_4_image ? 
                  `<img src="${student.finger_4_image}" alt="Finger 4" />` : 
                  '<div class="no-print">No Print</div>'
                }
              </div>
              <div class="fingerprint">
                <h4>Finger 5</h4>
                ${student.finger_5_image ? 
                  `<img src="${student.finger_5_image}" alt="Finger 5" />` : 
                  '<div class="no-print">No Print</div>'
                }
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Enhanced fingerprint image component
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

  // Action buttons component
  const StudentActionButtons = ({ student }: { student: Student }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {student.is_enabled ? (
            <>
              <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Student
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(student)}>
                <PowerOff className="mr-2 h-4 w-4" />
                Disable Student
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => handleToggleStatus(student)}>
                <Power className="mr-2 h-4 w-4" />
                Enable Student
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          Mobile Number
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">
                          Address
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
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-r">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                            {selectedBatchId ? 'No students found in this batch.' : 'Please select a batch to view students.'}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.slice(0, entriesPerPage).map((student: Student) => (
                          <tr key={student.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-4 border-r">
                              <div className="font-medium">{student.student_name}</div>
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
                            <td className="px-4 py-4 text-center border-r">
                              <Badge variant={student.is_enabled ? "default" : "destructive"}>
                                {student.is_enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StudentActionButtons student={student} />
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
