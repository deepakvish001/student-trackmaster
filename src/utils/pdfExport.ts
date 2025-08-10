import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student } from '@/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export const exportStudentsToPDF = (students: Student[], filters?: {
  searchTerm?: string;
  selectedBatch?: string;
  batchName?: string;
}) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('Student List Report', 14, 22);
  
  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
  
  // Add filter information if applied
  let yPosition = 42;
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
  
  // Prepare table data
  const tableData = students.map((student, index) => [
    index + 1,
    student.student_name || 'N/A',
    student.mobile_number || 'N/A',
    student.batches?.batch_name || 'N/A',
    getFingerprintCount(student),
    getBiometricStatus(student),
    new Date(student.created_at).toLocaleDateString()
  ]);
  
  // Create table
  autoTable(doc, {
    head: [['#', 'Student Name', 'Mobile', 'Batch', 'Fingerprints', 'Status', 'Created Date']],
    body: tableData,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 25 },
      6: { cellWidth: 25 },
    },
  });
  
  // Add summary at the end
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Summary:', 14, finalY);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Students: ${students.length}`, 20, finalY + 8);
  
  const completeCount = students.filter(s => getBiometricStatus(s) === 'Complete').length;
  const partialCount = students.filter(s => getBiometricStatus(s) === 'Partial').length;
  const noneCount = students.filter(s => getBiometricStatus(s) === 'None').length;
  
  doc.text(`Complete Biometrics: ${completeCount}`, 20, finalY + 16);
  doc.text(`Partial Biometrics: ${partialCount}`, 20, finalY + 24);
  doc.text(`No Biometrics: ${noneCount}`, 20, finalY + 32);
  
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