import { useState, useCallback } from 'react';
import { useOfflineSupabase } from './useOfflineSupabase';
import { useOnlineStatus } from './useOnlineStatus';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeImages: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  customFields?: string[];
}

interface ExportProgress {
  stage: 'preparing' | 'fetching' | 'processing' | 'generating' | 'complete';
  progress: number;
  message: string;
}

export function useOfflineExport() {
  const { isOnline } = useOnlineStatus();
  const offlineSupabase = useOfflineSupabase();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: 'preparing',
    progress: 0,
    message: 'Initializing export...'
  });

  const updateProgress = useCallback((stage: ExportProgress['stage'], progress: number, message: string) => {
    setExportProgress({ stage, progress, message });
  }, []);

  const exportStudents = useCallback(async (batchId?: string, options: ExportOptions = { format: 'pdf', includeImages: false }) => {
    setIsExporting(true);
    updateProgress('preparing', 0, 'Preparing student data export...');

    try {
      // Fetch students data from offline database
      updateProgress('fetching', 10, 'Fetching student records...');
      
      const filters = [];
      if (batchId) {
        filters.push({ column: 'batch_id', operator: 'eq', value: batchId });
      }
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          filters.push({ column: key, operator: 'eq', value });
        });
      }

      const { data: students, error } = await offlineSupabase.select('students', {
        filters,
        orderBy: { column: 'created_at', ascending: false }
      });

      if (error) throw error;
      if (!students || students.length === 0) {
        toast.error('No student data found to export');
        return;
      }

      updateProgress('fetching', 30, 'Fetching batch information...');

      // Get batch information
      const batchIds = [...new Set(students.map(s => s.batch_id))];
      const { data: batches } = await offlineSupabase.select('batches', {
        filters: [{ column: 'id', operator: 'in', value: batchIds }]
      });

      const batchMap = new Map<string, any>(batches?.map(b => [b.id, b]) || []);

      updateProgress('processing', 50, 'Processing student data...');

      // Get fingerprint data if needed
      let fingerprintData: any[] = [];
      if (options.includeImages) {
        const studentIds = students.map(s => s.id);
        const { data: fingerprints } = await offlineSupabase.select('student_fingerprints', {
          filters: [{ column: 'student_id', operator: 'in', value: studentIds }]
        });
        fingerprintData = fingerprints || [];
      }

      updateProgress('generating', 70, `Generating ${options.format.toUpperCase()} file...`);

      // Generate the requested format
      switch (options.format) {
        case 'pdf':
          await generatePDF(students, batchMap, fingerprintData, options);
          break;
        case 'excel':
          await generateExcel(students, batchMap, fingerprintData, options);
          break;
        case 'csv':
          await generateCSV(students, batchMap, options);
          break;
        case 'json':
          await generateJSON(students, batchMap, fingerprintData, options);
          break;
      }

      updateProgress('complete', 100, 'Export completed successfully!');
      toast.success(`${students.length} students exported as ${options.format.toUpperCase()}`);

    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [offlineSupabase, updateProgress]);

  const exportBatches = useCallback(async (options: ExportOptions = { format: 'pdf', includeImages: false }) => {
    setIsExporting(true);
    updateProgress('preparing', 0, 'Preparing batch data export...');

    try {
      updateProgress('fetching', 20, 'Fetching batch records...');

      const { data: batches, error } = await offlineSupabase.select('batches', {
        orderBy: { column: 'created_at', ascending: false }
      });

      if (error) throw error;
      if (!batches || batches.length === 0) {
        toast.error('No batch data found to export');
        return;
      }

      updateProgress('processing', 50, 'Processing batch statistics...');

      // Get student counts for each batch
      const batchStats = await Promise.all(
        batches.map(async (batch) => {
          const { data: students } = await offlineSupabase.select('students', {
            filters: [
              { column: 'batch_id', operator: 'eq', value: batch.id },
              { column: 'is_enabled', operator: 'eq', value: true }
            ]
          });

          const studentCount = students?.length || 0;
          const completeBiometrics = students?.filter(s => 
            s.finger_1 && s.finger_2 && s.finger_3 && s.finger_4 && s.finger_5
          ).length || 0;

          return {
            ...batch,
            student_count: studentCount,
            complete_biometrics: completeBiometrics,
            utilization_rate: batch.max_students > 0 ? Math.round((studentCount / batch.max_students) * 100) : 0
          };
        })
      );

      updateProgress('generating', 80, `Generating ${options.format.toUpperCase()} file...`);

      switch (options.format) {
        case 'pdf':
          await generateBatchPDF(batchStats, options);
          break;
        case 'excel':
          await generateBatchExcel(batchStats, options);
          break;
        case 'csv':
          await generateBatchCSV(batchStats, options);
          break;
        case 'json':
          await generateBatchJSON(batchStats, options);
          break;
      }

      updateProgress('complete', 100, 'Batch export completed!');
      toast.success(`${batches.length} batches exported as ${options.format.toUpperCase()}`);

    } catch (error) {
      console.error('Batch export error:', error);
      toast.error(`Batch export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [offlineSupabase, updateProgress]);

  return {
    isExporting,
    exportProgress,
    exportStudents,
    exportBatches,
    isOnline
  };
}

// Helper functions for different export formats
async function generatePDF(students: any[], batchMap: Map<string, any>, fingerprints: any[], options: ExportOptions) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Student Records Export', 20, 20);
  
  // Export info
  doc.setFontSize(10);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 20, 30);
  doc.text(`Total Records: ${students.length}`, 20, 35);
  doc.text(`Source: ${navigator.onLine ? 'Online' : 'Offline'} Database`, 20, 40);
  
  // Table data
  const tableData = students.map(student => {
    const batch = batchMap.get(student.batch_id);
    const fingerprintCount = fingerprints.filter(f => f.student_id === student.id).length;
    
    return [
      student.student_name || '',
      student.mobile_number || '',
      batch?.batch_name || 'Unknown',
      student.address || '',
      fingerprintCount,
      student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
    ];
  });

  autoTable(doc, {
    head: [['Name', 'Mobile', 'Batch', 'Address', 'Fingerprints', 'Created']],
    body: tableData,
    startY: 50,
    theme: 'striped',
    styles: { fontSize: 8 }
  });

  doc.save(`students_export_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function generateExcel(students: any[], batchMap: Map<string, any>, fingerprints: any[], options: ExportOptions) {
  const workbook = XLSX.utils.book_new();
  
  // Student data worksheet
  const studentData = students.map(student => {
    const batch = batchMap.get(student.batch_id);
    const studentFingerprints = fingerprints.filter(f => f.student_id === student.id);
    
    return {
      Name: student.student_name || '',
      Mobile: student.mobile_number || '',
      Batch: batch?.batch_name || 'Unknown',
      Address: student.address || '',
      'Fingerprint Count': studentFingerprints.length,
      'Has Finger 1': student.finger_1 ? 'Yes' : 'No',
      'Has Finger 2': student.finger_2 ? 'Yes' : 'No',
      'Has Finger 3': student.finger_3 ? 'Yes' : 'No',
      'Has Finger 4': student.finger_4 ? 'Yes' : 'No',
      'Has Finger 5': student.finger_5 ? 'Yes' : 'No',
      'Created Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : '',
      'Last Updated': student.updated_at ? new Date(student.updated_at).toLocaleDateString() : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(studentData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Add summary worksheet
  const summary = {
    'Total Students': students.length,
    'Unique Batches': new Set(students.map(s => s.batch_id)).size,
    'Students with Complete Biometrics': students.filter(s => 
      s.finger_1 && s.finger_2 && s.finger_3 && s.finger_4 && s.finger_5
    ).length,
    'Export Date': new Date().toLocaleString(),
    'Data Source': navigator.onLine ? 'Online Database' : 'Offline Cache'
  };

  const summarySheet = XLSX.utils.json_to_sheet([summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  XLSX.writeFile(workbook, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function generateCSV(students: any[], batchMap: Map<string, any>, options: ExportOptions) {
  const headers = ['Name', 'Mobile', 'Batch', 'Address', 'Created Date'];
  const csvData = [
    headers.join(','),
    ...students.map(student => {
      const batch = batchMap.get(student.batch_id);
      return [
        `"${student.student_name || ''}"`,
        `"${student.mobile_number || ''}"`,
        `"${batch?.batch_name || 'Unknown'}"`,
        `"${student.address || ''}"`,
        `"${student.created_at ? new Date(student.created_at).toLocaleDateString() : ''}"`
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateJSON(students: any[], batchMap: Map<string, any>, fingerprints: any[], options: ExportOptions) {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalRecords: students.length,
      source: navigator.onLine ? 'online' : 'offline',
      includeImages: options.includeImages
    },
    students: students.map(student => ({
      ...student,
      batch_info: batchMap.get(student.batch_id),
      fingerprints: options.includeImages ? fingerprints.filter(f => f.student_id === student.id) : []
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Batch export helpers
async function generateBatchPDF(batches: any[], options: ExportOptions) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Batch Summary Report', 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  doc.text(`Total Batches: ${batches.length}`, 20, 35);

  const tableData = batches.map(batch => [
    batch.batch_name,
    batch.admin_name,
    batch.student_count.toString(),
    batch.max_students.toString(),
    `${batch.utilization_rate}%`,
    batch.complete_biometrics.toString(),
    batch.is_enabled ? 'Active' : 'Inactive'
  ]);

  autoTable(doc, {
    head: [['Batch Name', 'Admin', 'Students', 'Capacity', 'Utilization', 'Complete Bio', 'Status']],
    body: tableData,
    startY: 45,
    theme: 'striped'
  });

  doc.save(`batch_summary_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function generateBatchExcel(batches: any[], options: ExportOptions) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(batches.map(batch => ({
    'Batch Name': batch.batch_name,
    'Admin Name': batch.admin_name,
    'Username': batch.username,
    'Serial Number': batch.serial_number,
    'Student Count': batch.student_count,
    'Max Students': batch.max_students,
    'Utilization Rate': `${batch.utilization_rate}%`,
    'Complete Biometrics': batch.complete_biometrics,
    'Status': batch.is_enabled ? 'Active' : 'Inactive',
    'Created Date': new Date(batch.created_at).toLocaleDateString()
  })));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Batches');
  XLSX.writeFile(workbook, `batch_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function generateBatchCSV(batches: any[], options: ExportOptions) {
  const headers = ['Batch Name', 'Admin', 'Students', 'Capacity', 'Utilization', 'Status'];
  const csvData = [
    headers.join(','),
    ...batches.map(batch => [
      `"${batch.batch_name}"`,
      `"${batch.admin_name}"`,
      batch.student_count,
      batch.max_students,
      `"${batch.utilization_rate}%"`,
      `"${batch.is_enabled ? 'Active' : 'Inactive'}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch_summary_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateBatchJSON(batches: any[], options: ExportOptions) {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalBatches: batches.length,
      source: navigator.onLine ? 'online' : 'offline'
    },
    batches
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `batch_summary_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}