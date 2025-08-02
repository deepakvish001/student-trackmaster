
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Calendar, Hash, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-details', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            batch_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }
      
      return data as Student;
    },
    enabled: !!id,
    refetchInterval: 2000, // Real-time updates every 2 seconds
    refetchIntervalInBackground: true
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/students')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student List
          </Button>
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900">Student Not Found</h1>
            <p className="text-gray-500 mt-2">The student you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const randomFingerprintId = Math.random().toString(36).substr(2, 9).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/students')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Details</h1>
                <div className="text-sm text-gray-500">
                  <span className="text-blue-600 hover:underline cursor-pointer">Home</span>
                  <span className="mx-2">/</span>
                  <span className="text-blue-600 hover:underline cursor-pointer">Student List</span>
                  <span className="mx-2">/</span>
                  <span>Student Details</span>
                </div>
              </div>
            </div>
            <Badge 
              variant={student.is_enabled ? "default" : "secondary"}
              className={`${student.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {student.is_enabled ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Student Information Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Student Name</p>
                  <p className="text-lg font-semibold text-gray-900">{student.student_name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Batch</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {student.batches?.batch_name || 'No Batch'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Hash className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fingerprint ID</p>
                  <p className="text-lg font-semibold text-gray-900">{randomFingerprintId}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(student.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fingerprint Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Fingerprint Data</h2>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                🔄 Real-time Data
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((fingerNum) => {
                const imageData = student[`finger_${fingerNum}_image`] as string | null;
                const hasTemplate = student[`finger_${fingerNum}`] as string | null;

                return (
                  <div key={fingerNum} className="text-center">
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="w-32 h-32 mx-auto mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {imageData ? (
                          <img
                            src={imageData}
                            alt={`Finger ${fingerNum}`}
                            className="w-full h-full object-cover"
                            style={{ 
                              filter: 'contrast(1.2) brightness(1.1)',
                              imageRendering: 'crisp-edges'
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-3xl text-gray-400 mb-2">👆</div>
                            <div className="text-sm text-gray-500">No Print</div>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2">Finger {fingerNum}</h3>
                      
                      <div className="space-y-1">
                        {imageData && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                            RD Service
                          </Badge>
                        )}
                        {hasTemplate && (
                          <Badge 
                            variant={imageData ? "secondary" : "default"} 
                            className={`text-xs ${imageData ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-800'}`}
                          >
                            Template
                          </Badge>
                        )}
                        {!hasTemplate && !imageData && (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                            Not Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Information */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <strong>RD Service Images:</strong> {
                      [1, 2, 3, 4, 5].filter(i => student[`finger_${i}_image`]).length
                    } captured
                  </div>
                  <div>
                    <strong>Templates Only:</strong> {
                      [1, 2, 3, 4, 5].filter(i => student[`finger_${i}`] && !student[`finger_${i}_image`]).length
                    } stored
                  </div>
                  <div>
                    <strong>Total Fingerprints:</strong> {
                      [1, 2, 3, 4, 5].filter(i => student[`finger_${i}`] || student[`finger_${i}_image`]).length
                    } / 5
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
