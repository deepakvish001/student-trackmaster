import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { RDServiceStatusIndicator } from "@/components/rd/RDServiceStatusIndicator";
import { EnhancedRDServiceCapture } from "@/components/rd/EnhancedRDServiceCapture";
import { shouldSkipFingerprintValidation } from '@/utils/rdServiceValidator';
import { validateStudentData } from '@/utils/securityValidation';
import DashboardLayout from '@/components/DashboardLayout';

const formSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  mobile: yup.string().required('Mobile number is required').matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  email: yup.string().email('Invalid email').optional(),
  address: yup.string().required('Address is required'),
  batchId: yup.string().required('Batch is required'),
});

// Use yup's InferType to automatically generate the correct FormData type
type FormData = yup.InferType<typeof formSchema>;

interface CapturedFingerprint {
  pidData: string;
  quality: number;
  imageData?: string;
  timestamp: Date;
}

export default function AddStudent() {
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);

  const [batches, setBatches] = useState<any[]>([]);
  const [capturedFingerprints, setCapturedFingerprints] = useState<Record<number, CapturedFingerprint>>({});

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      address: '',
      batchId: '',
    },
  });

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .eq('is_enabled', true)
          .order('batch_name');

        if (error) throw error;
        setBatches(data || []);
      } catch (error) {
        console.error('Error loading batches:', error);
        toast.error('Failed to load batches');
      }
    };

    loadBatches();
  }, []);

  const handleFingerprintCapture = useCallback((fingerIndex: number, pidData: string, quality: number, imageData?: string) => {
    console.log(`✅ Fingerprint ${fingerIndex + 1} captured:`, {
      pidDataLength: pidData.length,
      quality,
      hasImage: !!imageData,
      imageDataLength: imageData?.length || 0
    });

    setCapturedFingerprints(prev => ({
      ...prev,
      [fingerIndex]: {
        pidData,
        quality,
        imageData,
        timestamp: new Date()
      }
    }));
    
    toast.success(`Finger ${fingerIndex + 1} captured successfully! Quality: ${quality}%`);
  }, []);

  const handleFingerprintError = useCallback((fingerIndex: number, error: string) => {
    console.error(`❌ Fingerprint ${fingerIndex + 1} capture error:`, error);
    toast.error(`Failed to capture Finger ${fingerIndex + 1}: ${error}`);
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);
      
      console.log('Starting form submission...', {
        name: data.name,
        fingerprintCount: Object.keys(capturedFingerprints).length
      });

      const studentId = uuidv4();
      
      // Prepare fingerprint data for validation and storage in students table
      const fingerprintData: Record<string, string> = {};
      const fingerprintImages: Record<string, string> = {};
      
      Object.entries(capturedFingerprints).forEach(([index, fingerprint]) => {
        const fingerNum = parseInt(index) + 1;
        fingerprintData[`finger_${fingerNum}`] = fingerprint.pidData;
        if (fingerprint.imageData) {
          fingerprintImages[`finger_${fingerNum}_image`] = fingerprint.imageData;
        }
      });

      const sanitizedData = {
        ...data,
        studentId,
        ...fingerprintData,
        ...fingerprintImages
      };

      console.log('Sanitized data:', sanitizedData);

      // Check if we should skip fingerprint validation
      const skipValidation = await shouldSkipFingerprintValidation();
      
      // Validate student data
      const validationResult = validateStudentData(sanitizedData, skipValidation);
      
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert student record with correct field names
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          id: studentId,
          student_name: data.name,
          mobile: data.mobile || null,
          email: data.email || null,
          address: data.address || null,
          batch_id: data.batchId,
          is_enabled: true,
          user_id: user.id,
          // Store fingerprint data in students table
          ...fingerprintData,
          ...fingerprintImages
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Insert individual fingerprint records in student_fingerprints table
      const fingerprintInserts = Object.entries(capturedFingerprints).map(([index, fingerprint]) => ({
        id: uuidv4(),
        student_id: studentId,
        finger_index: parseInt(index),
        pid_data: fingerprint.pidData,
        quality_score: fingerprint.quality,
        image_data: fingerprint.imageData || null,
        capture_timestamp: fingerprint.timestamp.toISOString(),
        user_id: user.id
      }));

      if (fingerprintInserts.length > 0) {
        const { error: fingerprintError } = await supabase
          .from('student_fingerprints')
          .insert(fingerprintInserts);

        if (fingerprintError) throw fingerprintError;
      }
      
      // Reset form and captured fingerprints
      reset();
      setCapturedFingerprints({});

      // Success feedback
      toast.success(`Student added successfully with ${fingerprintInserts.length} fingerprint(s)!`);
      navigate('/students');

    } catch (error) {
      console.error('Error submitting student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  
  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Student Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Student Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter Student Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Mobile</Label>
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter Mobile"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              />
              {errors.mobile && <p className="text-red-500 text-xs">{errors.mobile.message}</p>}
            </div>

            {/* Batch */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Batch</Label>
              <Controller
                name="batchId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.batchId && <p className="text-red-500 text-xs">{errors.batchId.message}</p>}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Address</Label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter Address"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              />
              {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
            </div>
          </div>

          {/* Fingerprint Capture Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {[0, 1, 2, 3, 4].map((fingerIndex) => (
              <div key={fingerIndex} className="flex flex-col items-center space-y-3">
                <div className="w-32 h-40 border-2 border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center relative">
                  {capturedFingerprints[fingerIndex]?.imageData ? (
                    <img 
                      src={`data:image/jpeg;base64,${capturedFingerprints[fingerIndex].imageData}`}
                      alt={`Finger ${fingerIndex + 1}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-20 mx-auto mb-2 text-red-400">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                          <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-2.04-1.34-3.27 0-1.23.47-2.4 1.34-3.27.87-.87 2.04-1.34 3.27-1.34 1.23 0 2.4.47 3.27 1.34.87.87 1.34 2.04 1.34 3.27 0 1.23-.47 2.4-1.34 3.27-.09.1-.22.15-.35.15s-.26-.05-.35-.15c-.87-.87-1.34-2.04-1.34-3.27 0-1.23.47-2.4 1.34-3.27.09-.1.22-.15.35-.15s.26.05.35.15c.87.87 1.34 2.04 1.34 3.27 0 1.23-.47 2.4-1.34 3.27-.09.1-.22.15-.35.15z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-2">Finger {fingerIndex + 1}</p>
                  <div className="hidden">
                    <EnhancedRDServiceCapture
                      index={fingerIndex}
                      fingerName={`Finger ${fingerIndex + 1}`}
                      onCaptureSuccess={(pidData, quality, imageData) => 
                        handleFingerprintCapture(fingerIndex, pidData, quality, imageData)
                      }
                      onCaptureError={(error) => handleFingerprintError(fingerIndex, error)}
                      targetQuality={60}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      // Simulate fingerprint capture for demo
                      const demoImageData = "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVHic7d";
                      handleFingerprintCapture(fingerIndex, `demo_pid_data_${fingerIndex}`, 85, demoImageData);
                    }}
                    className="w-24 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
                  >
                    Capture
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-start">
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded text-sm font-medium"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
