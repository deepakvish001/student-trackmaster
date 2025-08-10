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
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table width
  
  // Add title - same as website
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('Student List Report - Complete Data', 14, 20);
  
  // Add generation info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total Students: ${students.length}`, 14, 30);
  
  // Add filter information if applied
  let yPosition = 40;
  if (filters?.searchTerm || (filters?.selectedBatch && filters?.selectedBatch !== 'all')) {
    doc.setFontSize(10);
    doc.setTextColor(60);
    let filterText = 'Filters Applied: ';
    if (filters.searchTerm) filterText += `Search: "${filters.searchTerm}" `;
    if (filters.selectedBatch && filters.selectedBatch !== 'all') filterText += `Batch: ${filters.batchName}`;
    doc.text(filterText, 14, yPosition);
    yPosition += 10;
  }

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

  // Create main table exactly like website - with embedded fingerprint images
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
      index + 1,
      `${student.student_name}\n${student.mobile_number || 'N/A'}`,
      student.batches?.batch_name || 'N/A',
      '', // Fingerprint images column - will be filled manually with images
      biometricStatus,
      student.is_enabled ? 'Active' : 'Inactive',
      new Date(student.created_at).toLocaleDateString()
    ];
  });

  // Create the main table exactly like website
  autoTable(doc, {
    head: [['#', 'Name & Mobile', 'Batch', 'High-Quality Fingerprint Images', 'Status', 'Active', 'Created']],
    body: tableBodyData,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
      minCellHeight: 35, // Increased minimum cell height for fingerprint images
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue header like website
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      minCellHeight: 12,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray alternating rows
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, minCellHeight: 35 }, // #
      1: { halign: 'left', cellWidth: 45, minCellHeight: 35 },   // Name & Mobile  
      2: { halign: 'center', cellWidth: 30, minCellHeight: 35 }, // Batch
      3: { halign: 'center', cellWidth: 120, minCellHeight: 35 }, // Fingerprint Images (increased height)
      4: { halign: 'center', cellWidth: 20, minCellHeight: 35 }, // Status
      5: { halign: 'center', cellWidth: 18, minCellHeight: 35 }, // Active
      6: { halign: 'center', cellWidth: 25, minCellHeight: 35 }, // Created
    },
    didDrawCell: function(data) {
      // Only add fingerprint images to data rows (not header), column index 3
      if (data.column.index === 3 && data.row.index >= 0 && data.section === 'body') {
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
        
        // Calculate positions for 5 fingerprint images in a row (smaller to fit cell)
        const imageWidth = 14;  // Reduced from 16
        const imageHeight = 18; // Reduced from 20
        const gap = 1.5;        // Reduced gap between images
        const totalImagesWidth = 5 * imageWidth + 4 * gap;
        const startX = cellX + (cellWidth - totalImagesWidth) / 2;
        const imageY = cellY + 2; // Small padding from top of cell
        
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
  
  // Save the PDF
  doc.save(filename);
};