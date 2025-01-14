import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

export default function Downloads() {
  const handleDownload = async (type: 'students' | 'batches') => {
    try {
      let data;
      if (type === 'students') {
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            *,
            batches (
              batch_name
            )
          `);
        
        if (error) throw error;
        data = studentsData.map(student => ({
          'Student Name': student.student_name,
          'Batch': (student.batches as any)?.batch_name,
          'Finger 1': student.finger_1,
          'Finger 2': student.finger_2,
          'Finger 3': student.finger_3,
          'Finger 4': student.finger_4,
          'Finger 5': student.finger_5,
          'Status': student.is_enabled ? 'Active' : 'Inactive',
          'Created At': new Date(student.created_at).toLocaleDateString(),
        }));
      } else {
        const { data: batchesData, error } = await supabase
          .from('batches')
          .select('*');
        
        if (error) throw error;
        data = batchesData.map(batch => ({
          'Serial Number': batch.serial_number,
          'Batch Name': batch.batch_name,
          'Admin': batch.admin_name,
          'Username': batch.username,
          'Max Students': batch.max_students,
          'Status': batch.is_enabled ? 'Active' : 'Inactive',
          'Created At': new Date(batch.created_at).toLocaleDateString(),
        }));
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
      XLSX.writeFile(wb, `${type}_data.xlsx`);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data downloaded successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Error downloading ${type} data`);
    }
  };

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Students Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/90 mb-4">
              Download complete students data in Excel format
            </p>
            <Button 
              onClick={() => handleDownload('students')}
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-white/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Students Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Batches Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/90 mb-4">
              Download complete batches data in Excel format
            </p>
            <Button 
              onClick={() => handleDownload('batches')}
              variant="secondary"
              className="bg-white text-green-600 hover:bg-white/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Batches Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}