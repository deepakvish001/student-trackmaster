import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  student_name: string;
  batch_id: string;
  finger_1?: string;
  finger_2?: string;
  finger_3?: string;
  finger_4?: string;
  finger_5?: string;
  finger_1_image?: string;
  finger_2_image?: string;
  finger_3_image?: string;
  finger_4_image?: string;
  finger_5_image?: string;
  created_at: string;
  batches?: {
    batch_name: string;
    admin_name: string;
  };
}

export default function StudentList() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const { data: students, isLoading, refetch } = useQuery({
    queryKey: ['students-list'],
    queryFn: async () => {
      console.log('Fetching students for list...');
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_name,
          batch_id,
          finger_1,
          finger_2,
          finger_3,
          finger_4,
          finger_5,
          finger_1_image,
          finger_2_image,
          finger_3_image,
          finger_4_image,
          finger_5_image,
          created_at,
          batches (
            batch_name,
            admin_name
          )
        `)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }

      console.log('Students fetched for list:', data?.length || 0);
      return data as Student[];
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');

      if (error) throw error;
      return data;
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('students-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          refetch();
          
          if (payload.eventType === 'INSERT') {
            toast.success('New student added!');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Student updated!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.student_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatch ? student.batch_id === selectedBatch : true;
    return matchesSearch && matchesBatch;
  }).slice(0, entriesPerPage);

  const getFingerprintImageUrl = (fingerprintData: string) => {
    if (!fingerprintData) return null;
    
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    if (fingerprintData.length > 100 && !fingerprintData.includes('data:')) {
      if (fingerprintData.startsWith('iVBOR') || 
          fingerprintData.startsWith('/9j/') ||  
          fingerprintData.startsWith('UklGR') || 
          fingerprintData.startsWith('R0lGOD')) {
        let mimeType = 'image/png';
        if (fingerprintData.startsWith('/9j/')) mimeType = 'image/jpeg';
        else if (fingerprintData.startsWith('UklGR')) mimeType = 'image/webp';
        else if (fingerprintData.startsWith('R0lGOD')) mimeType = 'image/gif';
        
        return `data:${mimeType};base64,${fingerprintData}`;
      }
    }
    
    return null;
  };

  const FingerprintImage = ({ data, index }: { data?: string; index: number }) => {
    const imageUrl = data ? getFingerprintImageUrl(data) : null;
    
    return (
      <div className="w-16 h-16 border border-gray-300 rounded flex items-center justify-center bg-white">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Fingerprint ${index}`}
            className="max-w-14 max-h-14 object-contain"
            style={{ 
              filter: 'contrast(1.2) brightness(0.8)',
              imageRendering: 'crisp-edges'
            }}
          />
        ) : (
          <div className="text-gray-400 text-xs">No Print</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Student List</h2>
          <div className="text-sm text-gray-600">
            Home / Student List
          </div>
        </div>

        {/* Batch Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Name
                </label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="-- Select Batch --" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches?.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => refetch()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Submit
                </Button>
                {selectedBatch && (
                  <Button 
                    onClick={() => setSelectedBatch("")}
                    variant="outline"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Table Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show</span>
                  <Select 
                    value={entriesPerPage.toString()} 
                    onValueChange={(value) => setEntriesPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Search:</span>
                  <Input
                    type="text"
                    className="w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search students..."
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        StudentName
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Finger 1
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Finger 2
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Finger 3
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Finger 4
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                        Finger 5
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents?.map((student, index) => (
                      <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 border-r border-gray-200">
                          <div>
                            <div className="font-medium text-gray-900">{student.student_name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r border-gray-200">
                          <div className="text-gray-900">
                            {student.batches?.batch_name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <FingerprintImage 
                              data={student.finger_1_image || student.finger_1} 
                              index={1} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <FingerprintImage 
                              data={student.finger_2_image || student.finger_2} 
                              index={2} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <FingerprintImage 
                              data={student.finger_3_image || student.finger_3} 
                              index={3} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <FingerprintImage 
                              data={student.finger_4_image || student.finger_4} 
                              index={4} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <FingerprintImage 
                              data={student.finger_5_image || student.finger_5} 
                              index={5} 
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                              >
                                Action
                                <ChevronDown className="ml-1 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* No Results */}
              {filteredStudents?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No students found.
                </div>
              )}

              {/* Pagination info */}
              <div className="text-sm text-gray-600">
                Showing {filteredStudents?.length || 0} of {students?.length || 0} entries
                {selectedBatch && (
                  <span className="ml-2 text-blue-600">
                    (filtered by batch)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
