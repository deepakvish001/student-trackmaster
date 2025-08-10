import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student } from '@/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export const exportStudentsToPDF = async (students: Student[], filters?: {
  searchTerm?: string;
  selectedBatch?: string;
  batchName?: string;
}) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table layout
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('Student List Report with Fingerprint Images', 14, 22);
  
  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  doc.text(`Total Students: ${students.length}`, 14, 38);
  
  // Add filter information if applied
  let yPosition = 48;
  if (filters?.searchTerm || (filters?.selectedBatch && filters?.selectedBatch !== 'all')) {
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text('Applied Filters:', 14, yPosition);
    yPosition += 8;
    
    if (filters.searchTerm) {
      doc.setFontSize(10);
      doc.text(`• Search: "${filters.searchTerm}"`, 20, yPosition);
      yPosition += 6;
    }
    
    if (filters.selectedBatch && filters.selectedBatch !== 'all') {
      doc.setFontSize(10);
      doc.text(`• Batch: ${filters.batchName || filters.selectedBatch}`, 20, yPosition);
      yPosition += 6;
    }
    yPosition += 5;
  }

  // Helper function to convert fingerprint data to displayable format
  const getFingerprintImageData = (fingerprintData: string | null) => {
    if (!fingerprintData) return null;
    
    // Check if it's already a data URL
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    // If it's a very long string (image data), treat it as base64
    if (fingerprintData.length > 50000) {
      return `data:image/png;base64,${fingerprintData}`;
    }
    
    return null;
  };

  // Process students with fingerprint images
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Check if we need a new page
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Student header information
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`${i + 1}. ${student.student_name}`, 14, yPosition);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Mobile: ${student.mobile_number || 'N/A'}`, 14, yPosition + 8);
    doc.text(`Batch: ${student.batches?.batch_name || 'N/A'}`, 14, yPosition + 16);
    doc.text(`Status: ${student.is_enabled ? 'Active' : 'Inactive'}`, 14, yPosition + 24);
    
    // Fingerprint images section
    const imageFields = [
      student.finger_1_image,
      student.finger_2_image, 
      student.finger_3_image,
      student.finger_4_image,
      student.finger_5_image
    ];
    
    const fingerNames = [
      "Right Thumb",
      "Right Index", 
      "Right Middle",
      "Left Index",
      "Left Thumb"
    ];
    
    let fingerprintCount = 0;
    let xOffset = 120; // Start position for fingerprints
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('Fingerprints:', xOffset, yPosition + 8);
    
    // Display fingerprint images in a row
    for (let j = 0; j < imageFields.length; j++) {
      const imageData = getFingerprintImageData(imageFields[j]);
      const fingerX = xOffset + (j * 30);
      const fingerY = yPosition + 12;
      
      if (imageData) {
        try {
          // Add fingerprint image to PDF
          doc.addImage(imageData, 'PNG', fingerX, fingerY, 25, 30);
          fingerprintCount++;
          
          // Add finger label
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.text(fingerNames[j], fingerX, fingerY + 35);
          
          // Add quality indicator
          doc.setTextColor('#00AA00'); // Green for captured
          doc.text('✓', fingerX + 11, fingerY + 40);
        } catch (error) {
          console.warn(`Failed to add fingerprint image ${j + 1}:`, error);
          // Fallback: show placeholder
          doc.setDrawColor('#CCCCCC');
          doc.setFillColor('#F0F0F0');
          doc.rect(fingerX, fingerY, 25, 30, 'FD');
          
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('No Image', fingerX + 5, fingerY + 18);
          doc.text(fingerNames[j], fingerX, fingerY + 35);
        }
      } else {
        // Empty slot
        doc.setDrawColor('#CCCCCC');
        doc.setFillColor('#FAFAFA');
        doc.rect(fingerX, fingerY, 25, 30, 'FD');
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Empty', fingerX + 7, fingerY + 18);
        doc.text(fingerNames[j], fingerX, fingerY + 35);
        
        // Add X for missing
        doc.setTextColor('#CC0000'); // Red for missing
        doc.text('✗', fingerX + 11, fingerY + 40);
      }
    }
    
    // Add completion status
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(`Completion: ${fingerprintCount}/5 fingerprints`, xOffset, yPosition + 50);
    
    // Add separator line
    doc.setDrawColor('#DDDDDD');
    doc.line(14, yPosition + 55, 280, yPosition + 55);
    
    yPosition += 65;
  }
  
  // Add final summary
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Summary:', 14, yPosition);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Students: ${students.length}`, 20, yPosition + 8);
  
  const completeCount = students.filter(s => getBiometricStatus(s) === 'Complete').length;
  const partialCount = students.filter(s => getBiometricStatus(s) === 'Partial').length;
  const noneCount = students.filter(s => getBiometricStatus(s) === 'None').length;
  
  doc.text(`Complete Biometrics: ${completeCount}`, 20, yPosition + 16);
  doc.text(`Partial Biometrics: ${partialCount}`, 20, yPosition + 24);
  doc.text(`No Biometrics: ${noneCount}`, 20, yPosition + 32);
  
  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  let filename = `students-report-${timestamp}.pdf`;
  
  if (filters?.batchName) {
    filename = `students-${filters.batchName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
  }
  
  // Save the PDF
  doc.save(filename);
};

// Helper functions
const getFingerprintCount = (student: Student): number => {
  let count = 0;
  if (student.finger_1) count++;
  if (student.finger_2) count++;
  if (student.finger_3) count++;
  if (student.finger_4) count++;
  if (student.finger_5) count++;
  return count;
};

const getBiometricStatus = (student: Student): string => {
  const count = getFingerprintCount(student);
  if (count === 0) return 'None';
  if (count >= 3) return 'Complete';
  return 'Partial';
};