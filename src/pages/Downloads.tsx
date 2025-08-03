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
          student_name,
          mobile_number,
          address,
          finger_1_image,
          finger_2_image,
          finger_3_image,
          finger_4_image,
          finger_5_image,
          batches (
            batch_name
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

  // Helper function to validate and process image data
  const isValidImageData = (imageData: any): boolean => {
    if (!imageData || typeof imageData !== 'string') {
      return false;
    }
    
    // Check for valid data URL format
    if (imageData.startsWith('data:image/')) {
      return true;
    }
    
    // Check for base64 data without prefix (length check for substantial data)
    if (imageData.length > 100) {
      return true;
    }
    
    return false;
  };

  // Helper function to process image data for Excel
  const processImageForExcel = (imageData: any): string => {
    if (!isValidImageData(imageData)) {
      return 'No Image Available';
    }
    
    try {
      const validImageData = imageData as string;
      
      // If it's already a data URL, return a truncated version for display
      if (validImageData.startsWith('data:image/')) {
        return `Image Available (${Math.round(validImageData.length / 1024)}KB)`;
      }
      
      // If it's raw base64, add info
      if (validImageData.length > 100) {
        return `Base64 Image (${Math.round(validImageData.length / 1024)}KB)`;
      }
      
      return 'Invalid Image Format';
    } catch (error) {
      console.error('Error processing image:', error);
      return 'Image Processing Error';
    }
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
      console.log('📊 Starting Excel export with student data...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 15;
        });
      }, 300);

      // Prepare data for Excel export
      const exportData = students.map((student, index) => {
        const batchName = student.batches && typeof student.batches === 'object' && 'batch_name' in student.batches 
          ? student.batches.batch_name 
          : 'No Batch';

        const row: any = {
          'Sr. No.': index + 1,
          'Student Name': student.student_name || 'N/A',
          'Mobile Number': student.mobile_number || 'Not Provided',
          'Batch Name': batchName,
          'Address': student.address || 'Not Provided'
        };

        // Process each fingerprint image
        const fingerKeys = ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image'] as const;
        
        fingerKeys.forEach((key, i) => {
          const imageData = student[key];
          const processedImage = processImageForExcel(imageData);
          row[`Finger ${i + 1} Status`] = processedImage;
          
          if (isValidImageData(imageData)) {
            console.log(`✅ Image found for student ${student.student_name}, finger ${i + 1}`);
          }
        });

        return row;
      });

      console.log('📊 Creating Excel workbook...');

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const mainWorksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 8 },  // Sr. No.
        { wch: 25 }, // Student Name
        { wch: 15 }, // Mobile Number
        { wch: 20 }, // Batch Name
        { wch: 30 }, // Address
        { wch: 25 }, // Finger 1 Status
        { wch: 25 }, // Finger 2 Status
        { wch: 25 }, // Finger 3 Status
        { wch: 25 }, // Finger 4 Status
        { wch: 25 }  // Finger 5 Status
      ];
      mainWorksheet['!cols'] = colWidths;

      // Add the main worksheet
      XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Students Data');

      // Calculate statistics
      const studentsWithImages = students.filter(student => 
        ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
          .some(key => isValidImageData(student[key]))
      ).length;

      const totalImages = students.reduce((count, student) => {
        return count + ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
          .filter(key => isValidImageData(student[key])).length;
      }, 0);

      const studentsWithMobile = students.filter(s => s.mobile_number).length;
      const studentsWithAddress = students.filter(s => s.address).length;

      // Create summary sheet
      const summaryData = [
        { 'Metric': 'Total Students', 'Value': students.length },
        { 'Metric': 'Students with Mobile Numbers', 'Value': studentsWithMobile },
        { 'Metric': 'Students with Addresses', 'Value': studentsWithAddress },
        { 'Metric': 'Students with Fingerprint Images', 'Value': studentsWithImages },
        { 'Metric': 'Total Fingerprint Images', 'Value': totalImages },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
        { 'Metric': 'Export Notes', 'Value': 'Image data status included in main sheet' }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Complete progress
      setDownloadProgress(100);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Students_Complete_Data_${timestamp}.xlsx`;

      console.log('📊 Writing Excel file...');

      // Use a small delay to ensure progress is visible
      setTimeout(() => {
        try {
          // Write and download file
          XLSX.writeFile(workbook, filename);
          
          console.log('✅ Excel file downloaded successfully');
          
          toast({
            title: "Download Complete! 📊",
            description: `Downloaded ${students.length} students with ${totalImages} fingerprint images.`,
          });

          setIsDownloading(false);
          setDownloadProgress(0);
        } catch (downloadError) {
          console.error('❌ Download error:', downloadError);
          toast({
            title: "Download Failed",
            description: "Failed to download the file. Please try again.",
            variant: "destructive"
          });
          setIsDownloading(false);
          setDownloadProgress(0);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Export error:', error);
      toast({
        title: "Export Failed",
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

  const studentsWithImages = students.filter(student => 
    ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
      .some(key => isValidImageData(student[key]))
  ).length;

  const totalImages = students.reduce((count, student) => {
    return count + ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
      .filter(key => isValidImageData(student[key])).length;
  }, 0);

  const studentsWithMobile = students.filter(s => s.mobile_number).length;
  const studentsWithAddress = students.filter(s => s.address).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose bg-clip-text text-transparent">
              📥 Student Data with Images
            </h1>
            <p className="text-lg text-muted-foreground">
              Export complete student data with fingerprint image information in Excel format
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
                  <div className="text-3xl font-bold text-emerald-green">{studentsWithMobile}</div>
                  <div className="text-sm text-muted-foreground">With Mobile</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-sunset-orange">{studentsWithAddress}</div>
                  <div className="text-sm text-muted-foreground">With Address</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-pink-rose">{totalImages}</div>
                  <div className="text-sm text-muted-foreground">Total Images</div>
                </div>
              </div>

              {/* Download Section */}
              <div className="border-t pt-6">
                {isDownloading ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-semibold">Generating Excel File...</span>
                      <span className="text-electric-blue font-bold">{downloadProgress}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-3" />
                    <div className="text-sm text-muted-foreground text-center">
                      Processing {students.length} students with {totalImages} fingerprint images...
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
                      Download Complete Data
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Downloads: Name, Mobile, Batch, Address & Fingerprint Image Status
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* What's Included Preview */}
          <Card className="glass-card border-foreground/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-emerald-green" />
                What's Included in Your Download
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-electric-blue">Student Information</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>✓ Student Name</div>
                    <div>✓ Mobile Number</div>
                    <div>✓ Batch Name</div>
                    <div>✓ Complete Address</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-emerald-green flex items-center">
                    <Image className="h-4 w-4 mr-2" />
                    Fingerprint Image Status
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>✓ All 5 Fingerprint Status Info</div>
                    <div>✓ Image availability indicators</div>
                    <div>✓ File size information</div>
                    <div>✓ Complete data overview</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50/50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-blue-700 mb-2">📊 Current Database Status:</div>
                  <div className="grid grid-cols-2 gap-4 text-blue-600">
                    <div>• {studentsWithImages} students have fingerprint images</div>
                    <div>• {totalImages} total fingerprint images available</div>
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
              Data automatically refreshes every 5 seconds with real-time updates
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
