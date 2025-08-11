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

  // Create main table with all student information
  const tableBodyData = students.map((student, index) => {
    const imageFields = [
      student.finger_1_image,
      student.finger_2_image, 
      student.finger_3_image,
      student.finger_4_image,
      student.finger_5_image
    ];

    let fingerprintCount = 0;
    imageFields.forEach(imageData => {
      if (getFingerprintImageData(imageData)) fingerprintCount++;
    });
    
    const biometricStatus = fingerprintCount === 5 ? 'Complete' : 
                          fingerprintCount > 0 ? 'Partial' : 'None';

    return [
      index + 1,                                    // #
      student.student_name || 'N/A',               // Name
      student.mobile_number || 'N/A',              // Mobile
      student.address || 'N/A',                    // Address  
      student.batches?.batch_name || 'N/A',        // Batch
      '',                                          // Fingerprint Images (filled manually)
      biometricStatus,                             // Bio Status
      student.is_enabled ? 'Active' : 'Inactive',  // Status
      new Date(student.created_at).toLocaleDateString() // Created Date
    ];
  });

  // Create the main table with separate columns for each field
  autoTable(doc, {
    head: [['#', 'Student Name', 'Mobile Number', 'Address', 'Batch', 'Fingerprint Images', 'Bio Status', 'Status', 'Created Date']],
    body: tableBodyData,
    startY: yPosition,
    styles: {
      fontSize: 7, // Smaller font to fit more columns
      cellPadding: 2,
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
      minCellHeight: 35, // Increased minimum cell height for fingerprint images
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue header like website
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: 12,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray alternating rows
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8, minCellHeight: 40 },   // #
      1: { halign: 'left', cellWidth: 40, minCellHeight: 40 },    // Student Name  
      2: { halign: 'center', cellWidth: 30, minCellHeight: 40 },  // Mobile Number (wider)
      3: { halign: 'left', cellWidth: 35, minCellHeight: 40 },    // Address
      4: { halign: 'center', cellWidth: 25, minCellHeight: 40 },  // Batch
      5: { halign: 'center', cellWidth: 100, minCellHeight: 40 }, // Fingerprint Images (even wider for clearer images)
      6: { halign: 'center', cellWidth: 20, minCellHeight: 40 },  // Bio Status
      7: { halign: 'center', cellWidth: 18, minCellHeight: 40 },  // Status
      8: { halign: 'center', cellWidth: 25, minCellHeight: 40 },  // Created Date
    },
    didDrawCell: function(data) {
      // Only add fingerprint images to data rows (not header), column index 5 (Fingerprint Images column)
      if (data.column.index === 5 && data.row.index >= 0 && data.section === 'body') {
        const student = students[data.row.index];
        if (!student) return;
        
        const imageFields = [
          student.finger_1_image,
          student.finger_2_image, 
          student.finger_3_image,
          student.finger_4_image,
          student.finger_5_image
        ];
        
        const cellX = data.cell.x;
        const cellY = data.cell.y;
        const cellWidth = data.cell.width;
        const cellHeight = data.cell.height;
        
        // Calculate positions for 5 fingerprint images in a row (larger for better visibility)
        const imageWidth = 16;  // Increased for better visibility
        const imageHeight = 20; // Increased for better visibility
        const gap = 2;          // Better spacing between images
        const totalImagesWidth = 5 * imageWidth + 4 * gap;
        const startX = cellX + (cellWidth - totalImagesWidth) / 2;
        const imageY = cellY + 3; // Better padding from top of cell
        
        // Draw fingerprint images
        for (let i = 0; i < imageFields.length; i++) {
          const imageData = getFingerprintImageData(imageFields[i]);
          const currentX = startX + i * (imageWidth + gap);
          
          if (imageData) {
            try {
              // Add actual fingerprint image
              doc.addImage(imageData, 'PNG', currentX, imageY, imageWidth, imageHeight);
              
              // Add green checkmark below
              doc.setFontSize(6);
              doc.setTextColor('#00AA00');
              doc.text('✓', currentX + imageWidth/2 - 1, imageY + imageHeight + 3);
              
              // Add finger number
              doc.setFontSize(6);
              doc.setTextColor('#666666');
              doc.text((i + 1).toString(), currentX + imageWidth/2 - 1, imageY - 2);
            } catch (error) {
              console.warn(`Failed to add fingerprint image ${i + 1}:`, error);
              // Fallback: gray rectangle
              doc.setDrawColor('#CCCCCC');
              doc.setFillColor('#F5F5F5');
              doc.rect(currentX, imageY, imageWidth, imageHeight, 'FD');
              
              doc.setFontSize(5);
              doc.setTextColor('#999999');
              doc.text('No Img', currentX + 4, imageY + imageHeight/2 + 1);
            }
          } else {
            // Empty slot - dashed border like website
            doc.setDrawColor('#DDDDDD');
            doc.setFillColor('#FAFAFA');
            doc.rect(currentX, imageY, imageWidth, imageHeight, 'FD');
            
            // Add fingerprint icon placeholder
            doc.setFontSize(5);
            doc.setTextColor('#CCCCCC');
            doc.text('👆', currentX + imageWidth/2 - 2, imageY + imageHeight/2 + 1);
            
            // Add red X
            doc.setFontSize(6);
            doc.setTextColor('#CC0000');
            doc.text('✗', currentX + imageWidth/2 - 1, imageY + imageHeight + 3);
            
            // Add finger number
            doc.setFontSize(6);
            doc.setTextColor('#666666');
            doc.text((i + 1).toString(), currentX + imageWidth/2 - 1, imageY - 2);
          }
        }
        
        // Add completion badge below fingerprints
        const fingerprintCount = imageFields.filter(img => getFingerprintImageData(img)).length;
        doc.setFontSize(6);
        doc.setTextColor('#0066CC');
        const badgeText = `${fingerprintCount}/5 fingerprints captured`;
        const textWidth = doc.getTextWidth(badgeText);
        doc.text(badgeText, cellX + (cellWidth - textWidth) / 2, imageY + imageHeight + 8);
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