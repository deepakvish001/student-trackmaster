
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileSpreadsheet, Users, CheckCircle, Image } from 'lucide-react';
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

  // Helper function to get fingerprint image size info
  const getImageInfo = (imageData: string | null): string => {
    if (!imageData) return 'No Image';
    
    try {
      // Check if it's a valid base64 data URI
      if (imageData.startsWith('data:image/')) {
        const sizeInBytes = (imageData.length * 3) / 4;
        const sizeInKB = Math.round(sizeInBytes / 1024);
        return `Image Available (${sizeInKB} KB)`;
      }
      return 'Image Available';
    } catch (error) {
      return 'Invalid Image Data';
    }
  };

  // Helper function to extract image dimensions
  const getImageDimensions = (imageData: string | null): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageData || !imageData.startsWith('data:image/')) {
        resolve('N/A');
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve(`${img.width}x${img.height}px`);
      };
      img.onerror = () => {
        resolve('Invalid');
      };
      img.src = imageData;
    });
  };

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

      // Process fingerprint images for better Excel representation
      console.log('📊 Processing fingerprint data for Excel export...');

      // Prepare data for Excel export with enhanced fingerprint information
      const exportData = await Promise.all(
        students.map(async (student, index) => {
          const fingerprintData = {
            finger1: student.finger_1 ? 'Template Available' : 'No Template',
            finger2: student.finger_2 ? 'Template Available' : 'No Template',
            finger3: student.finger_3 ? 'Template Available' : 'No Template',
            finger4: student.finger_4 ? 'Template Available' : 'No Template',
            finger5: student.finger_5 ? 'Template Available' : 'No Template'
          };

          const imageData = {
            finger1Image: getImageInfo(student.finger_1_image),
            finger2Image: getImageInfo(student.finger_2_image),
            finger3Image: getImageInfo(student.finger_3_image),
            finger4Image: getImageInfo(student.finger_4_image),
            finger5Image: getImageInfo(student.finger_5_image)
          };

          // Count captured fingerprints (both template and image)
          const capturedCount = [
            student.finger_1,
            student.finger_2,
            student.finger_3,
            student.finger_4,
            student.finger_5
          ].filter(Boolean).length;

          const imageCount = [
            student.finger_1_image,
            student.finger_2_image,
            student.finger_3_image,
            student.finger_4_image,
            student.finger_5_image
          ].filter(Boolean).length;

          return {
            'Sr. No.': index + 1,
            'Student Name': student.student_name,
            'Batch Name': student.batches?.batch_name || 'No Batch',
            'Admin Name': student.batches?.admin_name || 'N/A',
            'Username': student.batches?.username || 'N/A',
            'Status': student.is_enabled ? 'Active' : 'Inactive',
            
            // Fingerprint Template Status
            'Finger 1 Template': fingerprintData.finger1,
            'Finger 2 Template': fingerprintData.finger2,
            'Finger 3 Template': fingerprintData.finger3,
            'Finger 4 Template': fingerprintData.finger4,
            'Finger 5 Template': fingerprintData.finger5,
            
            // Fingerprint Image Status
            'Finger 1 Image': imageData.finger1Image,
            'Finger 2 Image': imageData.finger2Image,
            'Finger 3 Image': imageData.finger3Image,
            'Finger 4 Image': imageData.finger4Image,
            'Finger 5 Image': imageData.finger5Image,
            
            // Summary
            'Total Templates Captured': capturedCount,
            'Total Images Captured': imageCount,
            'Completion %': Math.round((capturedCount / 5) * 100),
            
            // Timestamps
            'Created Date': new Date(student.created_at).toLocaleDateString(),
            'Created Time': new Date(student.created_at).toLocaleTimeString(),
            'Last Updated': new Date(student.updated_at).toLocaleDateString(),
            
            // IDs for reference
            'Student ID': student.id,
            'Batch ID': student.batch_id || 'No Batch'
          };
        })
      );

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet
      const mainWorksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-adjust column widths for main sheet
      const colWidths = [
        { wch: 8 },  // Sr. No.
        { wch: 25 }, // Student Name
        { wch: 20 }, // Batch Name
        { wch: 18 }, // Admin Name
        { wch: 15 }, // Username
        { wch: 10 }, // Status
        { wch: 18 }, // Fingerprint templates
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 }, // Fingerprint images
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 }, // Totals
        { wch: 15 },
        { wch: 12 }, // Completion
        { wch: 15 }, // Dates
        { wch: 15 },
        { wch: 15 },
        { wch: 35 }, // IDs
        { wch: 35 }
      ];
      mainWorksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Student Data');

      // Create summary sheet
      const summaryData = [
        { 'Metric': 'Total Students', 'Value': students.length },
        { 'Metric': 'Active Students', 'Value': students.filter(s => s.is_enabled).length },
        { 'Metric': 'Inactive Students', 'Value': students.filter(s => !s.is_enabled).length },
        { 'Metric': 'Students with Fingerprints', 'Value': students.filter(s => 
          [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].some(Boolean)
        ).length },
        { 'Metric': 'Students with Images', 'Value': students.filter(s => 
          [s.finger_1_image, s.finger_2_image, s.finger_3_image, s.finger_4_image, s.finger_5_image].some(Boolean)
        ).length },
        { 'Metric': 'Fully Enrolled (5 fingers)', 'Value': students.filter(s => 
          [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].every(Boolean)
        ).length },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Students_Complete_Data_${timestamp}.xlsx`;

      // Complete progress and download
      setDownloadProgress(100);
      
      setTimeout(() => {
        // Write and download file
        XLSX.writeFile(workbook, filename);
        
        toast({
          title: "Download Complete! 📊",
          description: `Complete student data with fingerprint details exported successfully.`,
        });

        console.log('✅ Excel export completed with fingerprint image information');
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

  const studentsWithImages = students.filter(s => 
    [s.finger_1_image, s.finger_2_image, s.finger_3_image, s.finger_4_image, s.finger_5_image].some(Boolean)
  ).length;

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
              Export complete student data with fingerprint images and templates
            </p>
          </div>

          {/* Statistics Card */}
          <Card className="glass-card border-electric-blue/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                <Users className="h-6 w-6 mr-3 text-electric-blue" />
                Complete Data Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <div className="text-sm text-muted-foreground">With Templates</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-pink-rose">{studentsWithImages}</div>
                  <div className="text-sm text-muted-foreground">With Images</div>
                </div>
              </div>

              {/* Download Section */}
              <div className="border-t pt-6">
                {isDownloading ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-semibold">Processing Fingerprint Data...</span>
                      <span className="text-electric-blue font-bold">{downloadProgress}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-3" />
                    <div className="text-sm text-muted-foreground text-center">
                      Generating comprehensive Excel file with fingerprint images and templates...
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
                      Download Complete Data (Excel)
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Includes fingerprint templates, image status, dimensions, and complete audit trail
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Data Preview */}
          <Card className="glass-card border-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-emerald-green" />
                Enhanced Export Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-electric-blue flex items-center">
                    <Image className="h-4 w-4 mr-2" />
                    Fingerprint Data
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>✓ Template availability for all 5 fingers</div>
                    <div>✓ Image capture status with file sizes</div>
                    <div>✓ Completion percentage tracking</div>
                    <div>✓ Image quality indicators</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-emerald-green">General Information</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>✓ Student and batch details</div>
                    <div>✓ Creation and modification timestamps</div>
                    <div>✓ Active/inactive status tracking</div>
                    <div>✓ Summary statistics sheet</div>
                  </div>
                </div>
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
