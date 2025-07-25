
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  onImportComplete: () => void;
}

interface ImportRow {
  student_name: string;
  batch_id: string;
  address?: string;
  email?: string;
  mobile?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BulkImportDialog({ onImportComplete }: BulkImportDialogProps) {
  const { user } = useEnhancedAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        student_name: 'John Doe',
        batch_id: 'Select from Batches page',
        address: '123 Main St',
        email: 'john@example.com',
        mobile: '1234567890'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'students_import_template.xlsx');
    toast.success('Template downloaded successfully!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];
        
        setImportData(jsonData);
        toast.success(`Loaded ${jsonData.length} rows for import`);
      } catch (error) {
        toast.error('Failed to read file. Please ensure it\'s a valid Excel file.');
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const validateImportData = (data: ImportRow[]): string[] => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (accounting for header)
      
      if (!row.student_name?.trim()) {
        errors.push(`Row ${rowNum}: Student name is required`);
      }
      
      if (!row.batch_id?.trim()) {
        errors.push(`Row ${rowNum}: Batch ID is required`);
      }
      
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
      }
      
      if (row.mobile && !/^\d{10,15}$/.test(row.mobile.replace(/\D/g, ''))) {
        errors.push(`Row ${rowNum}: Invalid mobile number format`);
      }
    });
    
    return errors;
  };

  const processImport = async () => {
    if (!importData.length || !user) return;

    setIsProcessing(true);
    setProgress(0);
    
    const validationErrors = validateImportData(importData);
    if (validationErrors.length > 0) {
      setResult({
        success: 0,
        failed: importData.length,
        errors: validationErrors
      });
      setIsProcessing(false);
      return;
    }

    const results: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      setProgress(Math.round(((i + 1) / importData.length) * 100));

      try {
        // Verify batch exists
        const { data: batch, error: batchError } = await supabase
          .from('batches')
          .select('id')
          .eq('id', row.batch_id)
          .single();

        if (batchError || !batch) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid batch ID ${row.batch_id}`);
          continue;
        }

        // Insert student
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            student_name: row.student_name.trim(),
            batch_id: row.batch_id,
            address: row.address?.trim() || null,
            email: row.email?.trim() || null,
            mobile: row.mobile?.trim() || null,
            user_id: user.id,
            // Note: Fingerprints would need to be captured separately
          });

        if (insertError) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${insertError.message}`);
        } else {
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setResult(results);
    setIsProcessing(false);
    
    if (results.success > 0) {
      toast.success(`Successfully imported ${results.success} students!`);
      onImportComplete();
    }
    
    if (results.failed > 0) {
      toast.warning(`${results.failed} rows failed to import. Check the results for details.`);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setImportData([]);
    setResult(null);
    setProgress(0);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Student Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Download Import Template</h4>
                <p className="text-sm text-gray-600">
                  Use this template to format your student data correctly
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {file.name} - {importData.length} rows loaded
              </div>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing import...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {result.success} Success
                </Badge>
                {result.failed > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {result.failed} Failed
                  </Badge>
                )}
              </div>
              
              {result.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Import Errors:</p>
                      <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                        {result.errors.slice(0, 10).map((error, index) => (
                          <li key={index} className="text-red-600">• {error}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-gray-600">... and {result.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={processImport} 
              disabled={!importData.length || isProcessing}
              className="gap-2"
            >
              {isProcessing ? 'Processing...' : 'Import Students'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
