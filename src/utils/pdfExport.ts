import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table width
  
  // Determine document type based on filters
  let documentTitle = 'Student List Report';
  if (filters?.searchTerm || (filters?.selectedBatch && filters?.selectedBatch !== 'all')) {
    if (filters.searchTerm && filters.selectedBatch && filters.selectedBatch !== 'all') {
      documentTitle = `Filtered Student Report - Search: "${filters.searchTerm}" | Batch: ${filters.batchName}`;
    } else if (filters.searchTerm) {
      documentTitle = `Filtered Student Report - Search: "${filters.searchTerm}"`;
    } else if (filters.selectedBatch && filters.selectedBatch !== 'all') {
      documentTitle = `Batch Student Report - ${filters.batchName}`;
    }
  } else {
    documentTitle = 'Complete Student Database Report';
  }
  
  // Add title with filter information
  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(documentTitle, 14, 20);
  
  // Add generation info with real-time indicator
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`📊 Generated: ${new Date().toLocaleString()} | Total Students: ${students.length} | 🔴 Real-time Data`, 14, 30);
  
  let yPosition = 40;

  // Helper function to get fingerprint image data
  const getFingerprintImageData = (fingerprintData: string | null) => {
    if (!fingerprintData) return null;
    if (fingerprintData.startsWith('data:image/')) return fingerprintData;
    if (fingerprintData.length > 50000) return `data:image/png;base64,${fingerprintData}`;
    return null;
  };

  // Helper function to get biometric status
  const getBiometricStatus = (student: Student): string => {
    const count = getFingerprintCount(student);
    if (count === 0) return 'None';
    if (count >= 3) return 'Complete';
    return 'Partial';
  };

  // Helper function to count fingerprints
  const getFingerprintCount = (student: Student): number => {
    let count = 0;
    if (student.finger_1) count++;
    if (student.finger_2) count++;
    if (student.finger_3) count++;
    if (student.finger_4) count++;
    if (student.finger_5) count++;
    return count;
  };

  // Create main table with simplified columns: only Name/Mobile and Fingerprint Images
  const tableBodyData = students.map((student, index) => {
    const nameAndMobile = `${student.student_name || 'N/A'}${student.mobile_number ? '\n' + student.mobile_number : ''}`;
    
    return [
      index + 1,                // #
      nameAndMobile,           // Name & Mobile (combined)
      '',                      // Fingerprint Images (will be filled with actual images)
    ];
  });

  // Create the simplified table with only Name/Mobile and Fingerprint Images
  autoTable(doc, {
    head: [['#', 'Student Name & Mobile', 'Fingerprint Images']],
    body: tableBodyData,
    startY: yPosition,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
      minCellHeight: 45, // Increased for larger fingerprint images
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue header
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      minCellHeight: 15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15, minCellHeight: 45 },   // #
      1: { halign: 'left', cellWidth: 60, minCellHeight: 45 },     // Name & Mobile  
      2: { halign: 'center', cellWidth: 200, minCellHeight: 45 },  // Fingerprint Images (very wide for full images)
    },
    didDrawCell: function(data) {
      // Only add fingerprint images to data rows (not header), column index 2 (Fingerprint Images column)
      if (data.column.index === 2 && data.row.index >= 0 && data.section === 'body') {
        const student = students[data.row.index];
        if (!student) return;
        
        const imageFields = [
          student.finger_1_image,
          student.finger_2_image, 
          student.finger_3_image,
          student.finger_4_image,
          student.finger_5_image
        ];
        
        const fingerNames = [
          'Right Thumb',
          'Right Index', 
          'Right Middle',
          'Left Index',
          'Left Thumb'
        ];
        
        const cellX = data.cell.x;
        const cellY = data.cell.y;
        const cellWidth = data.cell.width;
        const cellHeight = data.cell.height;
        
        // Calculate positions for 5 large fingerprint images in a row
        const imageWidth = 35;    // Much larger images
        const imageHeight = 40;   // Much larger images
        const gap = 3;            // Gap between images
        const totalImagesWidth = 5 * imageWidth + 4 * gap;
        const startX = cellX + (cellWidth - totalImagesWidth) / 2;
        const imageY = cellY + 2;
        
        // Draw large fingerprint images with labels
        for (let i = 0; i < imageFields.length; i++) {
          const imageData = getFingerprintImageData(imageFields[i]);
          const currentX = startX + i * (imageWidth + gap);
          
          if (imageData) {
            try {
              // Add actual fingerprint image (large size)
              doc.addImage(imageData, 'PNG', currentX, imageY, imageWidth, imageHeight);
              
              // Add finger name label above image
              doc.setFontSize(7);
              doc.setTextColor('#333333');
              const labelText = fingerNames[i];
              const textWidth = doc.getTextWidth(labelText);
              doc.text(labelText, currentX + (imageWidth - textWidth) / 2, imageY - 2);
              
              // Add green checkmark below
              doc.setFontSize(8);
              doc.setTextColor('#00AA00');
              doc.text('✓ Captured', currentX + imageWidth/2 - 7, imageY + imageHeight + 5);
              
            } catch (error) {
              console.warn(`Failed to add fingerprint image ${i + 1}:`, error);
              // Fallback: gray rectangle with error message
              doc.setDrawColor('#CCCCCC');
              doc.setFillColor('#F5F5F5');
              doc.rect(currentX, imageY, imageWidth, imageHeight, 'FD');
              
              doc.setFontSize(6);
              doc.setTextColor('#999999');
              doc.text('Image Error', currentX + 8, imageY + imageHeight/2);
              
              // Add finger name label above
              doc.setFontSize(7);
              doc.setTextColor('#333333');
              const labelText = fingerNames[i];
              const textWidth = doc.getTextWidth(labelText);
              doc.text(labelText, currentX + (imageWidth - textWidth) / 2, imageY - 2);
            }
          } else {
            // Empty slot - show placeholder
            doc.setDrawColor('#DDDDDD');
            doc.setFillColor('#FAFAFA');
            doc.rect(currentX, imageY, imageWidth, imageHeight, 'FD');
            
            // Add finger name label above
            doc.setFontSize(7);
            doc.setTextColor('#333333');
            const labelText = fingerNames[i];
            const textWidth = doc.getTextWidth(labelText);
            doc.text(labelText, currentX + (imageWidth - textWidth) / 2, imageY - 2);
            
            // Add "Not Captured" text
            doc.setFontSize(6);
            doc.setTextColor('#CCCCCC');
            doc.text('Not Captured', currentX + 6, imageY + imageHeight/2);
            
            // Add red X below
            doc.setFontSize(8);
            doc.setTextColor('#CC0000');
            doc.text('✗ Missing', currentX + imageWidth/2 - 6, imageY + imageHeight + 5);
          }
        }
      }
    },
    didDrawPage: function (data) {
      // Add page numbers
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    },
    margin: { top: 10, left: 14, right: 14, bottom: 20 },
  });

  // Add summary section at the end
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Summary:', 14, finalY);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  const completeCount = students.filter(s => getBiometricStatus(s) === 'Complete').length;
  const partialCount = students.filter(s => getBiometricStatus(s) === 'Partial').length;
  const noneCount = students.filter(s => getBiometricStatus(s) === 'None').length;
  
  doc.text(`• Complete Biometrics (5/5): ${completeCount} students`, 20, finalY + 10);
  doc.text(`• Partial Biometrics (1-4/5): ${partialCount} students`, 20, finalY + 18);
  doc.text(`• No Biometrics (0/5): ${noneCount} students`, 20, finalY + 26);
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  let filename = `students-complete-list-${timestamp}.pdf`;
  
  if (filters?.batchName) {
    filename = `students-${filters.batchName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
  }
  
  // Log the PDF download activity
  try {
    await supabase.rpc('log_file_operation', {
      operation_type: 'PDF_DOWNLOAD',
      file_details: {
        report_type: filters?.searchTerm || filters?.selectedBatch ? 'filtered' : 'complete',
        student_count: students.length,
        batch_name: filters?.batchName,
        search_term: filters?.searchTerm,
        total_pages: doc.getNumberOfPages(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (auditError) {
    console.error('Failed to log PDF download:', auditError);
  }
  
  // Save the PDF
  doc.save(filename);
};