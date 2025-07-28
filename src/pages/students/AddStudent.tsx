
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { RDServiceStatusIndicator } from "@/components/rd/RDServiceStatusIndicator";
import { EnhancedRDServiceCapture } from "@/components/rd/EnhancedRDServiceCapture";
import { shouldSkipFingerprintValidation } from '@/utils/rdServiceValidator';
import { validateStudentData } from '@/utils/securityValidation';

const formSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  mobile: yup.string().matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
  email: yup.string().email('Invalid email'),
  address: yup.string(),
  batchId: yup.string().required('Batch is required'),
});

interface FormData {
  name: string;
  mobile: string;
  email: string;
  address: string;
  batchId: string;
}

interface CapturedFingerprint {
  pidData: string;
  quality: number;
  imageData?: string;
  timestamp: Date;
}

export default function AddStudent() {
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    mobile: '',
    email: '',
    address: '',
    batchId: '',
  });

  const [batches, setBatches] = useState<any[]>([]);
  const [capturedFingerprints, setCapturedFingerprints] = useState<Record<number, CapturedFingerprint>>({});
  const [activeTab, setActiveTab] = useState("details");

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(formSchema),
    defaultValues: formData,
  });

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .eq('status', 'active')
          .order('name');

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

    // Auto-advance to next finger if this one meets quality threshold
    if (quality >= 60 && fingerIndex < 4) {
      setTimeout(() => {
        console.log(`Manually switching to finger ${fingerIndex + 2}`);
        setActiveTab(`finger-${fingerIndex + 1}`);
      }, 1500);
    }
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
      
      // Prepare fingerprint data for validation and storage
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

      // Insert student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          id: studentId,
          name: data.name,
          mobile: data.mobile || null,
          email: data.email || null,
          address: data.address || null,
          batch_id: data.batchId,
          status: 'active'
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Insert fingerprint records
      const fingerprintInserts = Object.entries(capturedFingerprints).map(([index, fingerprint]) => ({
        id: uuidv4(),
        student_id: studentId,
        finger_index: parseInt(index),
        pid_data: fingerprint.pidData,
        quality_score: fingerprint.quality,
        image_data: fingerprint.imageData || null,
        capture_timestamp: fingerprint.timestamp.toISOString()
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
      setActiveTab("details");

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

  const getTotalCaptured = () => Object.keys(capturedFingerprints).length;
  const getAverageQuality = () => {
    const qualities = Object.values(capturedFingerprints).map(f => f.quality);
    return qualities.length > 0 ? Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length) : 0;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Student</h1>
        <p className="text-gray-600 mt-2">Enter student details and capture biometric data</p>
      </div>

      {/* RD Service Status */}
      <div className="mb-4">
        <RDServiceStatusIndicator />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="finger-0" className="relative">
              Finger 1
              {capturedFingerprints[0] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
            <TabsTrigger value="finger-1" className="relative">
              Finger 2
              {capturedFingerprints[1] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
            <TabsTrigger value="finger-2" className="relative">
              Finger 3
              {capturedFingerprints[2] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
            <TabsTrigger value="finger-3" className="relative">
              Finger 4
              {capturedFingerprints[3] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
            <TabsTrigger value="finger-4" className="relative">
              Finger 5
              {capturedFingerprints[4] && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Student Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Enter full name"
                          className={errors.name ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Controller
                      name="mobile"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="10-digit mobile number"
                          className={errors.mobile ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.mobile && <p className="text-red-500 text-sm">{errors.mobile.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email address"
                          className={errors.email ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchId">Batch *</Label>
                    <Controller
                      name="batchId"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={`w-full p-2 border rounded-md ${errors.batchId ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Select a batch</option>
                          {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {batch.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.batchId && <p className="text-red-500 text-sm">{errors.batchId.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Enter address"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fingerprint Capture Tabs */}
          {[0, 1, 2, 3, 4].map((fingerIndex) => (
            <TabsContent key={fingerIndex} value={`finger-${fingerIndex}`}>
              <div className="flex justify-center">
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
            </TabsContent>
          ))}

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Capture Summary</span>
                  <div className="flex space-x-2">
                    <Badge variant="outline">
                      {getTotalCaptured()}/5 Captured
                    </Badge>
                    {getTotalCaptured() > 0 && (
                      <Badge variant="secondary">
                        Avg Quality: {getAverageQuality()}%
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-6">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div className="text-sm font-medium">Finger {index + 1}</div>
                      <FingerprintDisplay
                        value={capturedFingerprints[index]?.pidData || ''}
                        index={index}
                        imageData={capturedFingerprints[index]?.imageData}
                        quality={capturedFingerprints[index]?.quality}
                        isCapturing={false}
                        showQuality={true}
                      />
                      {capturedFingerprints[index] && (
                        <Badge variant={capturedFingerprints[index].quality >= 60 ? "default" : "secondary"}>
                          {capturedFingerprints[index].quality}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setCapturedFingerprints({});
                      setActiveTab("details");
                    }}
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-32"
                  >
                    {isSubmitting ? 'Adding Student...' : 'Add Student'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
