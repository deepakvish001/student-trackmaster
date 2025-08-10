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
  
  // Add generation date and count
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

  // Helper function to get fingerprint image data
  const getFingerprintImageData = (fingerprintData: string | null) => {
    if (!fingerprintData) return null;
    
    if (fingerprintData.startsWith('data:image/')) {
      return fingerprintData;
    }
    
    if (fingerprintData.length > 50000) {
      return `data:image/png;base64,${fingerprintData}`;
    }
    
    return null;
  };

  // Create table data with embedded fingerprint images
  const tableData = await Promise.all(
    students.map(async (student, index) => {
      // Get fingerprint images
      const imageFields = [
        student.finger_1_image,
        student.finger_2_image, 
        student.finger_3_image,
        student.finger_4_image,
        student.finger_5_image
      ];

      // Create fingerprint cell content
      let fingerprintContent = '';
      let fingerprintCount = 0;
      
      imageFields.forEach((imageData, i) => {
        if (getFingerprintImageData(imageData)) {
          fingerprintCount++;
          fingerprintContent += `[${i + 1}:✓] `;
        } else {
          fingerprintContent += `[${i + 1}:✗] `;
        }
      });
      
      fingerprintContent += `\n${fingerprintCount}/5 captured`;

      return [
        index + 1,
        `${student.student_name}\n${student.mobile_number || 'N/A'}`,
        student.batches?.batch_name || 'N/A',
        fingerprintContent,
        getBiometricStatus(student),
        student.is_enabled ? 'Active' : 'Inactive',
        new Date(student.created_at).toLocaleDateString()
      ];
    })
  );

  // Create the table with exact same structure as website
  autoTable(doc, {
    head: [['#', 'Name & Mobile', 'Batch', 'Fingerprint Images', 'Bio Status', 'Status', 'Created Date']],
    body: tableData,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      valign: 'middle',
      halign: 'center',
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color like website
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray like website hover
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 }, // #
      1: { halign: 'left', cellWidth: 50 },   // Name & Mobile
      2: { halign: 'center', cellWidth: 35 }, // Batch
      3: { halign: 'center', cellWidth: 80 }, // Fingerprint Images
      4: { halign: 'center', cellWidth: 25 }, // Bio Status
      5: { halign: 'center', cellWidth: 20 }, // Status
      6: { halign: 'center', cellWidth: 30 }, // Created Date
    },
    didDrawPage: function (data) {
      // Add page numbers
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    },
    margin: { top: 10, left: 14, right: 14 },
  });

  // Now add a detailed fingerprint images section after the table
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text('Detailed Fingerprint Images', 14, finalY);
  
  let currentY = finalY + 15;
  let currentPage = 1;
  
  // Add detailed fingerprint images for each student
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Check if we need a new page (need space for student info + images)
    if (currentY > 160) {
      doc.addPage();
      currentY = 20;
      currentPage++;
    }
    
    // Student header
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text(`${i + 1}. ${student.student_name} (${student.batches?.batch_name || 'No Batch'})`, 14, currentY);
    
    currentY += 10;
    
    // Fingerprint images in a row (same as website)
    const imageFields = [
      student.finger_1_image,
      student.finger_2_image, 
      student.finger_3_image,
      student.finger_4_image,
      student.finger_5_image
    ];
    
    const fingerNames = ['R.Thumb', 'R.Index', 'R.Middle', 'L.Index', 'L.Thumb'];
    let startX = 14;
    let fingerprintCount = 0;
    
    // Draw fingerprint images in a horizontal row
    for (let j = 0; j < imageFields.length; j++) {
      const imageData = getFingerprintImageData(imageFields[j]);
      const fingerX = startX + (j * 45);
      
      if (imageData) {
        try {
          // Add actual fingerprint image
          doc.addImage(imageData, 'PNG', fingerX, currentY, 35, 40);
          fingerprintCount++;
          
          // Add green checkmark
          doc.setFontSize(10);
          doc.setTextColor('#00AA00');
          doc.text('✓', fingerX + 32, currentY + 45);
        } catch (error) {
          console.warn(`Failed to add fingerprint image ${j + 1}:`, error);
          // Fallback placeholder
          doc.setDrawColor('#CCCCCC');
          doc.setFillColor('#F5F5F5');
          doc.rect(fingerX, currentY, 35, 40, 'FD');
          
          doc.setFontSize(8);
          doc.setTextColor('#999999');
          doc.text('No Image', fingerX + 8, currentY + 22);
        }
      } else {
        // Empty slot (same as website)
        doc.setDrawColor('#DDDDDD');
        doc.setFillColor('#FAFAFA');
        doc.rect(fingerX, currentY, 35, 40, 'FD');
        
        doc.setFontSize(8);
        doc.setTextColor('#CCCCCC');
        doc.text('Empty', fingerX + 12, currentY + 22);
        
        // Red X for missing
        doc.setFontSize(10);
        doc.setTextColor('#CC0000');
        doc.text('✗', fingerX + 32, currentY + 45);
      }
      
      // Add finger label below
      doc.setFontSize(7);
      doc.setTextColor('#666666');
      doc.text(fingerNames[j], fingerX + 8, currentY + 50);
    }
    
    // Add completion status
    doc.setFontSize(9);
    doc.setTextColor('#0066CC');
    doc.text(`${fingerprintCount}/5 fingerprints captured`, startX, currentY + 58);
    
    currentY += 70;
  }
  
  // Add summary at the end
  if (currentY > 200) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 10;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Summary:', 14, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Students: ${students.length}`, 20, currentY + 12);
  
  const completeCount = students.filter(s => getBiometricStatus(s) === 'Complete').length;
  const partialCount = students.filter(s => getBiometricStatus(s) === 'Partial').length;
  const noneCount = students.filter(s => getBiometricStatus(s) === 'None').length;
  
  doc.text(`Complete Biometrics (5/5): ${completeCount}`, 20, currentY + 20);
  doc.text(`Partial Biometrics (1-4/5): ${partialCount}`, 20, currentY + 28);
  doc.text(`No Biometrics (0/5): ${noneCount}`, 20, currentY + 36);
  
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