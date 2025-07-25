
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Eye } from 'lucide-react';

interface StudentData {
  id: string;
  student_name: string;
  batch_id: string;
  is_enabled: boolean;
  finger_1?: string;
  finger_1_image?: string;
  created_at: string;
}

export function StudentDataDebugger() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawQuery, setRawQuery] = useState<string>('');

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Debugging: Fetching students data...');
      
      // Try different queries to debug the issue
      const queries = [
        // Query 1: Basic select all
        { 
          name: 'All students (basic)', 
          query: supabase.from('students').select('*') 
        },
        // Query 2: With batch info
        { 
          name: 'Students with batch info', 
          query: supabase.from('students').select(`
            *,
            batches(batch_name)
          `) 
        },
        // Query 3: Only enabled students
        { 
          name: 'Only enabled students', 
          query: supabase.from('students').select('*').eq('is_enabled', true) 
        }
      ];

      for (const { name, query } of queries) {
        console.log(`🔍 Testing query: ${name}`);
        const { data, error, count } = await query;
        
        console.log(`📊 ${name} results:`, {
          data,
          error,
          count,
          dataLength: data?.length || 0
        });

        if (error) {
          console.error(`❌ Error in ${name}:`, error);
        }
      }

      // Main query for display
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_name,
          batch_id,
          is_enabled,
          finger_1,
          finger_1_image,
          created_at,
          batches(batch_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('✅ Final students data:', data);
      setStudents(data || []);
      setRawQuery(JSON.stringify(data, null, 2));
      
    } catch (err) {
      console.error('💥 Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Student Data Debugger</span>
          </CardTitle>
          <Button onClick={fetchStudents} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">Error:</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Students Found: {students.length}</span>
            </h3>
            
            {students.length > 0 ? (
              <div className="space-y-2">
                {students.map((student, index) => (
                  <div key={student.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="font-medium">{index + 1}. {student.student_name}</div>
                    <div className="text-gray-600">ID: {student.id}</div>
                    <div className="text-gray-600">Batch: {student.batch_id}</div>
                    <div className="text-gray-600">Enabled: {student.is_enabled ? 'Yes' : 'No'}</div>
                    <div className="text-gray-600">
                      Has Template: {student.finger_1 ? 'Yes' : 'No'}
                    </div>
                    <div className="text-gray-600">
                      Has Image: {student.finger_1_image ? 'Yes' : 'No'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  No students found in database. This could be due to:
                  <br />• Row Level Security policies
                  <br />• Students being disabled (is_enabled = false)
                  <br />• Database connection issues
                  <br />• No students actually exist in the database
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Raw Query Response:</h3>
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono overflow-auto max-h-96">
              <pre>{rawQuery || 'No data'}</pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
