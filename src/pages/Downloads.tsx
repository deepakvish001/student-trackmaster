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
  const isValidImageData = (imageData: string | null): boolean => {
    if (!imageData || typeof imageData !== 'string') {
      return false;
    }
    
    // Check for valid data URL format
    if (imageData.startsWith('data:image/')) {
      return true;
    }
    
    // Check for base64 data without prefix (length check for substantial data)
    if (imageData.length > 10000) {
      return true;
    }
    
    return false;
  };

  // Helper function to convert base64 image data for Excel
  const processImageForExcel = (imageData: string | null): string => {
    if (!isValidImageData(imageData)) {
      return 'No Image Available';
    }
    
    try {
      const validImageData = imageData as string;
      
      // If it's already a data URL, return it
      if (validImageData.startsWith('data:image/')) {
        return validImageData;
      }
      
      // If it's raw base64, add the data URL prefix
      if (validImageData.length > 10000) {
        return `data:image/png;base64,${validImageData}`;
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

      console.log('📊 Processing student data with fingerprint images for Excel export...');

      // Prepare data for Excel export
      const exportData = students.map((student, index) => {
        const row: any = {
          'Sr. No.': index + 1,
          'Student Name': student.student_name || 'N/A',
          'Mobile Number': student.mobile_number || 'Not Provided',
          'Batch Name': student.batches?.batch_name || 'No Batch',
          'Address': student.address || 'Not Provided'
        };

        // Process each fingerprint image
        const fingerKeys = ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image'];
        
        fingerKeys.forEach((key, i) => {
          const imageData = student[key as keyof typeof student] as string | null;
          const processedImage = processImageForExcel(imageData);
          row[`Finger ${i + 1} Image`] = processedImage;
          
          if (isValidImageData(imageData)) {
            console.log(`✅ Processed image data for student ${student.student_name}, finger ${i + 1}`);
          } else {
            console.log(`❌ No valid image data for student ${student.student_name}, finger ${i + 1}`);
          }
        });

        return row;
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Create main worksheet
      const mainWorksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-adjust column widths
      const colWidths = [
        { wch: 8 },  // Sr. No.
        { wch: 25 }, // Student Name
        { wch: 15 }, // Mobile Number
        { wch: 20 }, // Batch Name
        { wch: 30 }, // Address
        { wch: 30 }, // Finger 1 Image
        { wch: 30 }, // Finger 2 Image
        { wch: 30 }, // Finger 3 Image
        { wch: 30 }, // Finger 4 Image
        { wch: 30 }  // Finger 5 Image
      ];
      mainWorksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Students with Fingerprints');

      // Calculate statistics
      const studentsWithImages = students.filter(student => 
        ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
          .some(key => isValidImageData(student[key as keyof typeof student] as string | null))
      ).length;

      const totalImages = students.reduce((count, student) => {
        return count + ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
          .filter(key => isValidImageData(student[key as keyof typeof student] as string | null)).length;
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
        { 'Metric': 'Image Format', 'Value': 'PNG/JPEG Base64 Data URLs' },
        { 'Metric': 'Export Content', 'Value': 'Name, Mobile, Batch, Address, 5 Fingerprint Images' }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Export Summary');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Students_Complete_Data_With_Images_${timestamp}.xlsx`;

      // Complete progress and download
      setDownloadProgress(100);
      
      setTimeout(() => {
        // Write and download file
        XLSX.writeFile(workbook, filename);
        
        toast({
          title: "Download Complete! 📊",
          description: `Downloaded ${students.length} students with ${totalImages} fingerprint images.`,
        });

        console.log('✅ Excel export with fingerprint images completed');
        console.log(`📈 Export stats: ${students.length} students, ${totalImages} images, ${studentsWithImages} students with images`);
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

  const studentsWithImages = students.filter(student => 
    ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
      .some(key => isValidImageData(student[key as keyof typeof student] as string | null))
  ).length;

  const totalImages = students.reduce((count, student) => {
    return count + ['finger_1_image', 'finger_2_image', 'finger_3_image', 'finger_4_image', 'finger_5_image']
      .filter(key => isValidImageData(student[key as keyof typeof student] as string | null)).length;
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
              Export complete student data with actual fingerprint images in Excel format
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
                      <span className="text-foreground font-semibold">Processing Images for Excel Export...</span>
                      <span className="text-electric-blue font-bold">{downloadProgress}%</span>
                    </div>
                    <Progress value={downloadProgress} className="h-3" />
                    <div className="text-sm text-muted-foreground text-center">
                      Converting {totalImages} fingerprint images to Excel-compatible format...
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
                      Download Complete Data with Images
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Downloads: Name, Mobile, Batch, Address & All Actual Fingerprint Images
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
                    Actual Fingerprint Images
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>✓ All 5 Fingerprint Images (PNG/JPEG)</div>
                    <div>✓ Full resolution image data</div>
                    <div>✓ Excel-compatible format</div>
                    <div>✓ Real captured biometric images</div>
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
