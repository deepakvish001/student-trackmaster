
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';

export default function ViewStudents() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);

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

  // Fetch students based on selected batch
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
      return data || [];
    },
    enabled: !!selectedBatchId
  });

  // Filter students based on search term
  const filteredStudents = students.filter((student: Student) =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    // This would typically trigger the student fetch, but we're using reactive queries
    console.log('Submit clicked with batch:', selectedBatchId);
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
                <h3 className="text-lg font-semibold">Student List</h3>
                
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
                              {student.finger_1_image ? (
                                <img
                                  src={student.finger_1_image}
                                  alt="Finger 1"
                                  className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
                                  style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                                />
                              ) : (
                                <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No Print
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              {student.finger_2_image ? (
                                <img
                                  src={student.finger_2_image}
                                  alt="Finger 2"
                                  className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
                                  style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                                />
                              ) : (
                                <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No Print
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              {student.finger_3_image ? (
                                <img
                                  src={student.finger_3_image}
                                  alt="Finger 3"
                                  className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
                                  style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                                />
                              ) : (
                                <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No Print
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              {student.finger_4_image ? (
                                <img
                                  src={student.finger_4_image}
                                  alt="Finger 4"
                                  className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
                                  style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                                />
                              ) : (
                                <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No Print
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center border-r">
                              {student.finger_5_image ? (
                                <img
                                  src={student.finger_5_image}
                                  alt="Finger 5"
                                  className="w-12 h-12 mx-auto rounded border bg-gray-100 object-cover"
                                  style={{ filter: 'contrast(1.2) brightness(1.1)' }}
                                />
                              ) : (
                                <div className="w-12 h-12 mx-auto bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No Print
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                              >
                                Action
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
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
      </div>
    </DashboardLayout>
  );
}
