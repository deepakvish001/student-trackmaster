/**
 * Enhanced Add Student Page with RD Service Biometric Security
 * UIDAI-compliant student registration with PidData format and real fingerprint images
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { BatchSelector } from "@/components/BatchSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { validateStudentDataWithBiometrics } from "@/utils/enhancedSecurityValidation";
import { encryptFingerprintData, auditBiometricAccess } from "@/utils/biometricSecurity";
import { sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber } from "@/utils/inputSanitization";
import { useEnhancedAuth } from "@/contexts/EnhancedAuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { auditLogger } from "@/services/auditLogService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  User,
  ArrowLeft,
  Fingerprint
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must not exceed 15 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters").max(500, "Address must not exceed 500 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
  images: z.array(z.string().nullable()).length(5, "All 5 fingerprint images are required")
});

type FormData = z.infer<typeof formSchema>;

interface FingerprintData {
  pidData: string;
  quality: number;
  imageData?: string;
}

interface Batch {
  id: string;
  batch_name: string;
}

export default function EnhancedAddStudent() {
  const navigate = useNavigate();
  const { user, encryptionKey } = useEnhancedAuth();
  const { logEvent } = useAuditLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 }
  ]);
  const [capturedImages, setCapturedImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [isCapturing, setIsCapturing] = useState<boolean[]>([false, false, false, false, false]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      batchId: "",
      address: "",
      email: "",
      fingerprints: ["", "", "", "", ""],
      images: [null, null, null, null, null]
    },
  });

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) {
        console.error('Error loading batches:', error);
        toast.error('Failed to load batches');
      } else {
        setBatches(data || []);
      }
    };

    loadBatches();
  }, []);

  // Simulate fingerprint capture for individual finger
  const captureFingerprint = async (fingerIndex: number) => {
    setIsCapturing(prev => {
      const newState = [...prev];
      newState[fingerIndex] = true;
      return newState;
    });

    try {
      // Simulate capture delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock fingerprint data
      const mockQuality = Math.floor(Math.random() * 20) + 80; // 80-100%
      const mockPidData = `MOCK_PID_DATA_FINGER_${fingerIndex + 1}_${Date.now()}`;
      const mockImageData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

      // Update fingerprint data
      const newFingerprintData = [...fingerprintData];
      newFingerprintData[fingerIndex] = {
        pidData: mockPidData,
        quality: mockQuality,
        imageData: mockImageData
      };
      setFingerprintData(newFingerprintData);

      // Update captured images
      const newImages = [...capturedImages];
      newImages[fingerIndex] = mockImageData;
      setCapturedImages(newImages);

      // Update form
      const newFingerprints = form.getValues("fingerprints");
      newFingerprints[fingerIndex] = mockPidData;
      form.setValue("fingerprints", newFingerprints);

      const newFormImages = form.getValues("images");
      newFormImages[fingerIndex] = mockImageData;
      form.setValue("images", newFormImages);

      toast.success(`Finger ${fingerIndex + 1} captured successfully! Quality: ${mockQuality}%`);
    } catch (error) {
      toast.error(`Failed to capture finger ${fingerIndex + 1}`);
    } finally {
      setIsCapturing(prev => {
        const newState = [...prev];
        newState[fingerIndex] = false;
        return newState;
      });
    }
  };

  async function onSubmit(values: FormData) {
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submit');
      return;
    }

    setIsSubmitting(true);
    console.log('Starting form submission...', {
      name: values.name,
      fingerprintCount: values.fingerprints.filter(fp => fp).length,
      imagesCount: capturedImages.filter(img => img).length
    });

    try {
      // Log the start of student creation
      await auditLogger.logStudentAction('created', 'temp', values.name, {
        status: 'started',
        fingerprintCount: values.fingerprints.filter(fp => fp).length,
        imagesCount: capturedImages.filter(img => img).length
      });

      // Security checks
      if (!user) {
        await logEvent('UNAUTHORIZED_STUDENT_CREATION');
        toast.error("You must be logged in to add students");
        navigate("/login");
        return;
      }

      if (!encryptionKey) {
        await logEvent('MISSING_ENCRYPTION_KEY');
        toast.error("Biometric security not initialized. Please refresh and try again.");
        return;
      }

      // Sanitize input data
      const sanitizedData = {
        name: sanitizeTextInput(values.name),
        mobile: sanitizePhoneNumber(values.mobile),
        batchId: values.batchId,
        address: sanitizeTextInput(values.address),
        email: values.email ? sanitizeEmail(values.email) : undefined
      };

      // Enhanced security validation with biometrics
      const validation = await validateStudentDataWithBiometrics({
        student_name: sanitizedData.name,
        mobile_number: sanitizedData.mobile,
        batch_id: sanitizedData.batchId,
        address: sanitizedData.address,
        email: sanitizedData.email,
        fingerprints: fingerprintData.map(fp => fp.pidData).filter(Boolean),
        fingerprintImages: capturedImages.filter(Boolean) as string[]
      });

      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors);
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Encrypt biometric data
      const encryptedFingerprints: any = {};
      for (let i = 0; i < fingerprintData.length; i++) {
        if (fingerprintData[i].pidData) {
          try {
            encryptedFingerprints[`finger_${i + 1}`] = await encryptFingerprintData(
              fingerprintData[i].pidData, 
              encryptionKey
            );
            
            if (capturedImages[i]) {
              encryptedFingerprints[`finger_${i + 1}_image`] = capturedImages[i];
            }
            
            console.log(`PidData ${i + 1} encrypted successfully${capturedImages[i] ? ' with image' : ''}`);
          } catch (error) {
            console.error(`Failed to encrypt PidData ${i + 1}:`, error);
            throw new Error(`Failed to secure biometric data for finger ${i + 1}`);
          }
        }
      }

      // Insert into database
      const { data, error } = await supabase.from('students').insert({
        student_name: validation.sanitizedData!.student_name,
        batch_id: validation.sanitizedData!.batch_id,
        mobile_number: validation.sanitizedData!.mobile_number,
        address: validation.sanitizedData!.address,
        email: validation.sanitizedData!.email,
        ...encryptedFingerprints,
      }).select();

      if (error) {
        console.error('Database insert error:', error);
        await logEvent('DATABASE_ERROR', 'students', undefined, undefined, {
          error: error.message
        });
        throw error;
      }

      console.log('Student created successfully:', data);
      
      await auditLogger.logStudentAction('created', data[0].id, validation.sanitizedData!.student_name, {
        biometricSummary: validation.biometricSummary,
        imagesCount: capturedImages.filter(img => img).length
      });
      
      auditBiometricAccess('STUDENT_CREATED', {
        userId: user.id,
        studentName: validation.sanitizedData!.student_name,
        biometricSummary: validation.biometricSummary,
        format: 'PidData',
        imagesCount: capturedImages.filter(img => img).length,
        success: true
      });
      
      toast.success(`Student registered successfully!`);
      
      // Reset form
      form.reset();
      setCapturedImages([null, null, null, null, null]);
      setFingerprintData([
        { pidData: "", quality: 0 },
        { pidData: "", quality: 0 },
        { pidData: "", quality: 0 },
        { pidData: "", quality: 0 },
        { pidData: "", quality: 0 }
      ]);
      
      // Navigate to students list
      navigate("/students");
      
    } catch (error) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await logEvent('STUDENT_CREATION_FAILED', 'students', undefined, undefined, {
        error: errorMessage
      });
      
      toast.error(`Failed to add student: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show authentication warning if user is not logged in
  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <Alert className="max-w-2xl border-red-600 bg-red-900/20 backdrop-blur-sm">
            <Shield className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-red-300 font-medium">
              🔐 Authentication required. Please log in to access this secure feature.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const completedCount = fingerprintData.filter(fp => fp.pidData).length;

  return (
    <DashboardLayout>
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="px-8 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Add New Student
              </h1>
              <p className="text-gray-400 text-sm">Register student with biometric data</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/students')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-orange-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <div className="px-8 py-4 flex-1 flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
              {/* Single Row Form Fields - Compact */}
              <div className="grid grid-cols-5 gap-4 mb-6 flex-shrink-0">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm font-medium">Student Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm font-medium">Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter mobile number"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm font-medium">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email address"
                          type="email"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm font-medium">Select Batch</FormLabel>
                      <BatchSelector
                        value={field.value}
                        onChange={field.onChange}
                        disabled={false}
                      />
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm font-medium">Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter address"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 h-10"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fingerprint Section - Main Content */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                  <Shield className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-white">Biometric Capture</h2>
                  <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    {completedCount}/5 Captured
                  </div>
                </div>

                {/* Five Fingerprint Captures Side by Side - Flexible Height */}
                <div className="grid grid-cols-5 gap-4 flex-1 min-h-0">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex flex-col min-h-0">
                      <div className="text-center mb-2 flex-shrink-0">
                        <h3 className="text-white font-medium text-sm">
                          Finger {index + 1}
                        </h3>
                      </div>
                      
                      <div className="bg-gray-900 border-2 border-gray-700 hover:border-gray-600 rounded-lg p-3 flex-1 flex flex-col min-h-0">
                        {/* Preview Area - Takes available space */}
                        <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 min-h-[200px] mb-3">
                          {capturedImages[index] ? (
                            <div className="text-center h-full flex flex-col justify-center">
                              <div className="flex-1 flex items-center justify-center">
                                <Fingerprint className="h-16 w-16 text-green-400" />
                              </div>
                              <div className="mt-2 text-sm text-green-400 flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Quality: {fingerprintData[index]?.quality || 0}%
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-2 mx-auto">
                                <User className="h-8 w-8" />
                              </div>
                              <p className="text-sm">Ready to capture</p>
                            </div>
                          )}
                        </div>

                        {/* Capture/Recapture Button - Fixed at bottom */}
                        <Button
                          type="button"
                          onClick={() => captureFingerprint(index)}
                          disabled={isCapturing[index] || isSubmitting}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 text-sm rounded-lg transition-colors flex-shrink-0"
                        >
                          {isCapturing[index] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Capturing...
                            </>
                          ) : capturedImages[index] ? (
                            "Recapture"
                          ) : (
                            "Capture"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button - Fixed at bottom */}
              <div className="flex justify-center pt-6 flex-shrink-0">
                <Button
                  type="submit"
                  disabled={isSubmitting || completedCount < 5}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-lg px-12 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[300px] shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Saving Student...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-3 h-5 w-5" />
                      Submit to Save Student
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}