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
import { MultiFingerCaptureInterface } from "@/components/fingerprint/MultiFingerCaptureInterface";
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
  ArrowLeft
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

  const handleCaptureComplete = (captures: any[]) => {
    console.log('All captures completed:', captures);
    
    const fingerprints: string[] = ["", "", "", "", ""];
    const images: (string | null)[] = [null, null, null, null, null];
    const newFingerprintData: FingerprintData[] = [
      { pidData: "", quality: 0 },
      { pidData: "", quality: 0 },
      { pidData: "", quality: 0 },
      { pidData: "", quality: 0 },
      { pidData: "", quality: 0 }
    ];
    
    captures.forEach((fp) => {
      if (fp.index >= 0 && fp.index < 5) {
        fingerprints[fp.index] = fp.template || 'enhanced_capture';
        images[fp.index] = fp.imageData;
        newFingerprintData[fp.index] = {
          pidData: fp.template || 'enhanced_capture',
          imageData: fp.imageData,
          quality: fp.quality
        };
      }
    });
    
    // Update form state
    form.setValue("fingerprints", fingerprints);
    form.setValue("images", images);
    setCapturedImages(images);
    setFingerprintData(newFingerprintData);
    
    // Trigger form validation
    form.trigger("fingerprints");
    
    toast.success(`All 5 fingerprints captured successfully!`);
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Add New Student
              </h1>
              <p className="text-gray-400 mt-1">Register student with secure biometric data</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/students')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-orange-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </div>
        </div>

        <div className="px-8 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Single Row Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">Student Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 transition-colors h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter mobile number"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 transition-colors h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email address"
                          type="email"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 transition-colors h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">Select Batch</FormLabel>
                      <div className="h-12">
                        <BatchSelector
                          value={field.value}
                          onChange={field.onChange}
                          disabled={false}
                        />
                      </div>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter address"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 transition-colors h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fingerprint Capture Section */}
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-8">
                  <Shield className="h-6 w-6 text-orange-500" />
                  <h2 className="text-2xl font-bold text-white">Biometric Capture</h2>
                  <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    Captured: {fingerprintData.filter(fp => fp.pidData).length}/5
                  </div>
                </div>

                {/* Five Fingerprint Captures Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="space-y-3">
                      <div className="text-center">
                        <h3 className="text-white font-semibold text-lg mb-3">
                          Finger {index + 1}
                        </h3>
                      </div>
                      
                      <div className="bg-gray-900 border-2 border-gray-700 hover:border-gray-600 rounded-xl p-6 min-h-[320px] flex flex-col transition-all duration-200">
                        {/* Preview Area */}
                        <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 min-h-[220px] mb-4">
                          {capturedImages[index] ? (
                            <div className="text-center">
                              <img
                                src={capturedImages[index] || ''}
                                alt={`Finger ${index + 1}`}
                                className="max-w-full max-h-[200px] rounded-lg border border-gray-600 shadow-lg"
                              />
                              <div className="mt-3 text-sm text-green-400 flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Quality: {fingerprintData[index]?.quality || 0}%
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-3 mx-auto">
                                <User className="h-10 w-10" />
                              </div>
                              <p className="text-sm">No capture</p>
                            </div>
                          )}
                        </div>

                        {/* Capture Button */}
                        <div className="mt-auto">
                          <MultiFingerCaptureInterface
                            onAllCaptured={handleCaptureComplete}
                            disabled={isSubmitting}
                            targetQuality={70}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-12">
                <Button
                  type="submit"
                  disabled={isSubmitting || fingerprintData.filter(fp => fp.pidData).length < 5}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-xl px-16 py-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[400px] shadow-2xl shadow-orange-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Saving Student...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-3 h-6 w-6" />
                      Submit to Save Student
                    </>
                  )}
                </Button>
              </div>

              {/* Security Alert */}
              {fingerprintData.filter(fp => fp.pidData).length > 0 && (
                <Alert className="bg-gray-900 border-gray-700 mt-8">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-gray-300">
                    <strong className="text-orange-400">Security Notice:</strong> Biometric data is encrypted with AES-256 and securely stored. All captures are logged for audit purposes.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}