
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileSpreadsheet, Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function Downloads() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  // Fetch real-time student data with batch information
  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students-for-download'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          batches (
            batch_name,
            admin_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    refetchInterval: 5000 // Refresh every 5 seconds for real-time data
  });

  const handleDownloadStudentData = async () => {
    if (students.length === 0) {
      toast({
        title: "No Data",
        description: "No student data available to download.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Prepare data for Excel export
      const exportData = students.map((student, index) => ({
        'Sr. No.': index + 1,
        'Student Name': student.student_name,
        'Batch Name': student.batches?.batch_name || 'No Batch',
        'Admin Name': student.batches?.admin_name || 'N/A',
        'Username': student.batches?.username || 'N/A',
        'Status': student.is_enabled ? 'Active' : 'Inactive',
        'Fingerprint 1': student.finger_1 ? 'Available' : 'Not Captured',
        'Fingerprint 2': student.finger_2 ? 'Available' : 'Not Captured',
        'Fingerprint 3': student.finger_3 ? 'Available' : 'Not Captured',
        'Fingerprint 4': student.finger_4 ? 'Available' : 'Not Captured',
        'Fingerprint 5': student.finger_5 ? 'Available' : 'Not Captured',
        'Total Fingerprints': [
          student.finger_1,
          student.finger_2,
          student.finger_3,
          student.finger_4,
          student.finger_5
        ].filter(Boolean).length,
        'Created Date': new Date(student.created_at).toLocaleDateString(),
        'Created Time': new Date(student.created_at).toLocaleTimeString(),
        'Last Updated': new Date(student.updated_at).toLocaleDateString(),
        'Student ID': student.id,
        'Batch ID': student.batch_id || 'No Batch',
        'Has Fingerprint 1 Image': student.finger_1_image ? 'Yes' : 'No',
        'Has Fingerprint 2 Image': student.finger_2_image ? 'Yes' : 'No',
        'Has Fingerprint 3 Image': student.finger_3_image ? 'Yes' : 'No',
        'Has Fingerprint 4 Image': student.finger_4_image ? 'Yes' : 'No',
        'Has Fingerprint 5 Image': student.finger_5_image ? 'Yes' : 'No'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-adjust column widths
      const colWidths = [
        { wch: 8 },  // Sr. No.
        { wch: 20 }, // Student Name
        { wch: 15 }, // Batch Name
        { wch: 15 }, // Admin Name
        { wch: 12 }, // Username
        { wch: 10 }, // Status
        { wch: 12 }, // Fingerprints
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }, // Total Fingerprints
        { wch: 12 }, // Dates
        { wch: 12 },
        { wch: 12 },
        { wch: 30 }, // IDs
        { wch: 30 },
        { wch: 15 }, // Image availability
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Data');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Students_Data_${timestamp}.xlsx`;

      // Complete progress and download
      setDownloadProgress(100);
      
      setTimeout(() => {
        // Write and download file
        XLSX.writeFile(workbook, filename);
        
        toast({
          title: "Download Complete",
          description: `${students.length} student records downloaded successfully.`,
        });

        setIsDownloading(false);
        setDownloadProgress(0);
      }, 500);

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate student data file. Please try again.",
        variant: "destructive"
      });
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Student Data...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose bg-clip-text text-transparent">
              📥 Download Center
            </h1>
            <p className="text-lg text-muted-foreground">
              Export student data with real-time information
            </p>
          </div>

          {/* Statistics Card */}
          <Card className="glass-card border-electric-blue/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                <Users className="h-6 w-6 mr-3 text-electric-blue" />
                Student Data Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-electric-blue">{students.length}</div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-emerald-green">
                    {students.filter(s => s.is_enabled).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-sunset-orange">
                    {students.filter(s => 
                      [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].some(Boolean)
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">With Fingerprints</div>
                </div>
              </div>

              {/* Download Section */}
              <div className="border-t pt-6">
                {isDownloading ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-semibold">Preparing Download...</span>
                      <span className="text-electric-blue font-bold">{downloadProgress}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-3" />
                    <div className="text-sm text-muted-foreground text-center">
                      Generating Excel file with {students.length} student records...
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Button
                      onClick={handleDownloadStudentData}
                      disabled={students.length === 0}
                      className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 shadow-glow px-8 py-6 text-lg font-semibold"
                    >
                      <FileSpreadsheet className="h-6 w-6 mr-3" />
                      Download Student Data (Excel)
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Includes all student information, batch details, and fingerprint status
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card className="glass-card border-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-emerald-green" />
                Data Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>✓ Student names and IDs</div>
                <div>✓ Batch information (name, admin, username)</div>
                <div>✓ Fingerprint capture status (all 5 fingers)</div>
                <div>✓ Image availability status</div>
                <div>✓ Active/inactive status</div>
                <div>✓ Creation and update timestamps</div>
                <div>✓ Complete audit trail</div>
              </div>
            </CardContent>
          </Card>

          {/* Refresh Button */}
          <div className="text-center">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-electric-blue/30 hover:bg-electric-blue/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Data automatically refreshes every 5 seconds
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
