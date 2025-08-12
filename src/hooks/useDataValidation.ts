import { useState, useCallback, useMemo } from 'react';
import { offlineDb } from '@/lib/offlineDatabase';
import { toast } from 'sonner';

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  message: string;
  validator?: (value: any, record: any) => boolean;
  params?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  cleanedData?: any;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  recordId?: string;
  suggestion?: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  recordId?: string;
}

interface IntegrityCheck {
  name: string;
  description: string;
  check: () => Promise<ValidationResult>;
  frequency: 'realtime' | 'periodic' | 'manual';
  lastRun?: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
}

export function useDataValidation() {
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);

  // Define validation rules for different data types
  const studentValidationRules: ValidationRule[] = [
    {
      field: 'student_name',
      type: 'required',
      message: 'Student name is required'
    },
    {
      field: 'student_name',
      type: 'format',
      message: 'Student name should only contain letters and spaces',
      validator: (value) => /^[a-zA-Z\s]+$/.test(value)
    },
    {
      field: 'mobile_number',
      type: 'format',
      message: 'Mobile number should be 10 digits',
      validator: (value) => !value || /^\d{10}$/.test(value.replace(/\D/g, ''))
    },
    {
      field: 'batch_id',
      type: 'required',
      message: 'Batch assignment is required'
    },
    {
      field: 'batch_id',
      type: 'custom',
      message: 'Batch does not exist',
      validator: (value) => {
        // Note: This would need to be implemented with async validation separately
        return !!value; // Basic check for now
      }
    }
  ];

  const batchValidationRules: ValidationRule[] = [
    {
      field: 'batch_name',
      type: 'required',
      message: 'Batch name is required'
    },
    {
      field: 'admin_name',
      type: 'required',
      message: 'Admin name is required'
    },
    {
      field: 'max_students',
      type: 'range',
      message: 'Max students should be between 1 and 500',
      params: { min: 1, max: 500 }
    },
    {
      field: 'serial_number',
      type: 'format',
      message: 'Serial number should be alphanumeric',
      validator: (value) => /^[A-Za-z0-9]+$/.test(value)
    }
  ];

  const fingerprintValidationRules: ValidationRule[] = [
    {
      field: 'student_id',
      type: 'required',
      message: 'Student ID is required'
    },
    {
      field: 'finger_index',
      type: 'range',
      message: 'Finger index should be between 1 and 10',
      params: { min: 1, max: 10 }
    },
    {
      field: 'pid_data',
      type: 'required',
      message: 'Fingerprint PID data is required'
    },
    {
      field: 'quality_score',
      type: 'range',
      message: 'Quality score should be between 0 and 100',
      params: { min: 0, max: 100 }
    }
  ];

  const validateRecord = useCallback(async (data: any, rules: ValidationRule[]): Promise<ValidationResult> => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let cleanedData = { ...data };

    for (const rule of rules) {
      const value = data[rule.field];

      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push({
              field: rule.field,
              message: rule.message,
              severity: 'error'
            });
          }
          break;

        case 'format':
          if (value && rule.validator && !rule.validator(value, data)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              severity: 'error',
              suggestion: getSuggestion(rule.field, value)
            });
          }
          break;

        case 'range':
          if (value !== null && value !== undefined && rule.params) {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < rule.params.min || numValue > rule.params.max) {
              errors.push({
                field: rule.field,
                message: rule.message,
                severity: 'error'
              });
            }
          }
          break;

        case 'custom':
          if (rule.validator) {
            try {
              const isValid = await rule.validator(value, data);
              if (!isValid) {
                errors.push({
                  field: rule.field,
                  message: rule.message,
                  severity: 'error'
                });
              }
            } catch (error) {
              warnings.push({
                field: rule.field,
                message: `Validation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              });
            }
          }
          break;
      }

      // Clean data
      if (rule.field === 'mobile_number' && value) {
        cleanedData[rule.field] = value.replace(/\D/g, '');
      }
      if (rule.field === 'student_name' && value) {
        cleanedData[rule.field] = value.trim().replace(/\s+/g, ' ');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedData: errors.length === 0 ? cleanedData : undefined
    };
  }, []);

  const getSuggestion = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'mobile_number':
        if (value && value.length !== 10) {
          return 'Try entering exactly 10 digits';
        }
        return 'Use format: 9876543210';
      case 'student_name':
        return 'Remove numbers and special characters';
      default:
        return 'Check the format and try again';
    }
  }, []);

  const validateStudent = useCallback(async (studentData: any): Promise<ValidationResult> => {
    return await validateRecord(studentData, studentValidationRules);
  }, [validateRecord, studentValidationRules]);

  const validateBatch = useCallback(async (batchData: any): Promise<ValidationResult> => {
    return await validateRecord(batchData, batchValidationRules);
  }, [validateRecord, batchValidationRules]);

  const validateFingerprint = useCallback(async (fingerprintData: any): Promise<ValidationResult> => {
    return await validateRecord(fingerprintData, fingerprintValidationRules);
  }, [validateRecord, fingerprintValidationRules]);

  const detectDuplicates = useCallback(async (table: string, record: any, excludeId?: string): Promise<ValidationResult> => {
    const errors: ValidationError[] = [];
    
    try {
      let duplicates: any[] = [];
      
      switch (table) {
        case 'students':
          // Check for duplicate mobile numbers
          if (record.mobile_number) {
            duplicates = await offlineDb.students
              .where('mobile_number')
              .equals(record.mobile_number)
              .and(student => student.id !== excludeId)
              .toArray();
          }
          break;
          
        case 'batches':
          // Check for duplicate batch names
          duplicates = await offlineDb.batches
            .where('batch_name')
            .equals(record.batch_name)
            .and(batch => batch.id !== excludeId)
            .toArray();
          break;
          
        case 'student_fingerprints':
          // Check for duplicate fingerprint for same student and finger
          duplicates = await offlineDb.student_fingerprints
            .where(['student_id', 'finger_index'])
            .equals([record.student_id, record.finger_index])
            .and(fp => fp.id !== excludeId)
            .toArray();
          break;
      }
      
      if (duplicates.length > 0) {
        errors.push({
          field: getDuplicateField(table),
          message: `Duplicate ${table.slice(0, -1)} found`,
          severity: 'error',
          suggestion: 'Check existing records or modify the value'
        });
      }
    } catch (error) {
      console.error('Duplicate detection error:', error);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }, []);

  const getDuplicateField = (table: string): string => {
    switch (table) {
      case 'students': return 'mobile_number';
      case 'batches': return 'batch_name';
      case 'student_fingerprints': return 'finger_index';
      default: return 'id';
    }
  };

  const runIntegrityChecks = useCallback(async (): Promise<void> => {
    setIsValidating(true);
    
    const checks: IntegrityCheck[] = [
      {
        name: 'Orphaned Students',
        description: 'Students without valid batch assignments',
        frequency: 'periodic',
        status: 'pending',
        check: async () => {
          const students = await offlineDb.students.toArray();
          const batchIds = new Set((await offlineDb.batches.toArray()).map(b => b.id));
          
          const orphaned = students.filter(s => !batchIds.has(s.batch_id));
          
          return {
            isValid: orphaned.length === 0,
            errors: orphaned.map(s => ({
              field: 'batch_id',
              message: `Student "${s.student_name}" has invalid batch assignment`,
              severity: 'error' as const,
              recordId: s.id
            })),
            warnings: []
          };
        }
      },
      {
        name: 'Fingerprint Consistency',
        description: 'Fingerprint records with missing student references',
        frequency: 'periodic',
        status: 'pending',
        check: async () => {
          const fingerprints = await offlineDb.student_fingerprints.toArray();
          const studentIds = new Set((await offlineDb.students.toArray()).map(s => s.id));
          
          const orphaned = fingerprints.filter(fp => !studentIds.has(fp.student_id));
          
          return {
            isValid: orphaned.length === 0,
            errors: orphaned.map(fp => ({
              field: 'student_id',
              message: `Fingerprint record has invalid student reference`,
              severity: 'error' as const,
              recordId: fp.id
            })),
            warnings: []
          };
        }
      },
      {
        name: 'Data Completeness',
        description: 'Records with missing required fields',
        frequency: 'manual',
        status: 'pending',
        check: async () => {
          const students = await offlineDb.students.toArray();
          const incomplete = students.filter(s => !s.student_name || !s.batch_id);
          
          return {
            isValid: incomplete.length === 0,
            errors: incomplete.map(s => ({
              field: 'completeness',
              message: `Student record incomplete: ${s.student_name || 'Unnamed'}`,
              severity: 'warning' as const,
              recordId: s.id
            })),
            warnings: []
          };
        }
      }
    ];

    const updatedChecks = await Promise.all(
      checks.map(async (check) => {
        try {
          const result = await check.check();
          return {
            ...check,
            status: result.isValid ? 'passed' as const : (result.errors.some(e => e.severity === 'error') ? 'failed' as const : 'warning' as const),
            lastRun: new Date().toISOString()
          };
        } catch (error) {
          return {
            ...check,
            status: 'failed' as const,
            lastRun: new Date().toISOString()
          };
        }
      })
    );

    setIntegrityChecks(updatedChecks);
    
    const failedChecks = updatedChecks.filter(c => c.status === 'failed').length;
    const warningChecks = updatedChecks.filter(c => c.status === 'warning').length;
    
    if (failedChecks > 0) {
      toast.error(`${failedChecks} integrity check(s) failed`);
    } else if (warningChecks > 0) {
      toast.warning(`${warningChecks} integrity check(s) have warnings`);
    } else {
      toast.success('All integrity checks passed');
    }
    
    setIsValidating(false);
  }, []);

  const cleanupInvalidData = useCallback(async (): Promise<{ cleaned: number; errors: number }> => {
    let cleaned = 0;
    let errors = 0;
    
    try {
      // Remove orphaned fingerprints
      const fingerprints = await offlineDb.student_fingerprints.toArray();
      const studentIds = new Set((await offlineDb.students.toArray()).map(s => s.id));
      
      const orphanedFingerprints = fingerprints.filter(fp => !studentIds.has(fp.student_id));
      
      for (const fp of orphanedFingerprints) {
        try {
          await offlineDb.student_fingerprints.delete(fp.id);
          cleaned++;
        } catch (error) {
          errors++;
        }
      }
      
      // Could add more cleanup operations here
      
      toast.success(`Cleaned up ${cleaned} invalid records`);
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to clean up some invalid data');
    }
    
    return { cleaned, errors };
  }, []);

  const validationStats = useMemo(() => {
    const totalChecks = integrityChecks.length;
    const passed = integrityChecks.filter(c => c.status === 'passed').length;
    const failed = integrityChecks.filter(c => c.status === 'failed').length;
    const warnings = integrityChecks.filter(c => c.status === 'warning').length;
    const pending = integrityChecks.filter(c => c.status === 'pending').length;
    
    return {
      totalChecks,
      passed,
      failed,
      warnings,
      pending,
      healthScore: totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100
    };
  }, [integrityChecks]);

  return {
    validationResults,
    integrityChecks,
    validationStats,
    isValidating,
    validateStudent,
    validateBatch,
    validateFingerprint,
    detectDuplicates,
    runIntegrityChecks,
    cleanupInvalidData
  };
}