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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Mail,
  Phone,
  MapPin,
  GraduationCap
} from "lucide-react";
import { MFS100Debug } from "@/components/debug/MFS100Debug";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must not exceed 15 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters").max(500, "Address must not exceed 500 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
});

interface FingerprintData {
  pidData: string;
  imageData?: string;
  quality: number;
}

export default function EnhancedAddStudent() {
  const navigate = useNavigate();
  const { user, encryptionKey } = useEnhancedAuth();
  const { logEvent } = useAuditLog();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      batchId: "",
      address: "",
      email: "",
      fingerprints: ["", "", "", "", ""],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImages, setCapturedImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 },
    { pidData: "", quality: 0 }
  ]);

  // Handle multi-fingerprint capture completion
  const handleAllFingerprintsCaptured = async (fingerprintData: any[]) => {
    console.log('All fingerprints captured:', fingerprintData);
    
    // Convert to form format
    const fingerprints = ["", "", "", "", ""];
    const images: (string | null)[] = [null, null, null, null, null];
    const newFingerprintData: FingerprintData[] = [];
    
    fingerprintData.forEach((fp) => {
      if (fp.index >= 0 && fp.index < 5) {
        fingerprints[fp.index] = fp.template || fp.imageData || 'captured';
        images[fp.index] = fp.imageData || null;
        
        newFingerprintData[fp.index] = {
          pidData: fp.template || 'enhanced_capture',
          imageData: fp.imageData,
          quality: fp.quality
        };
      }
    });
    
    // Update form state
    form.setValue("fingerprints", fingerprints);
    setCapturedImages(images);
    setFingerprintData(newFingerprintData);
    
    // Trigger form validation
    form.trigger("fingerprints");
    
    toast.success(`All 5 fingerprints captured successfully!`);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        email: values.email ? sanitizeEmail(values.email) : "",
        fingerprints: values.fingerprints,
      };

      // Validate with biometric data
      const validation = await validateStudentDataWithBiometrics(sanitizedData);
      if (!validation.isValid) {
        await logEvent('VALIDATION_FAILED', undefined, undefined, undefined, {
          errors: validation.errors
        });
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Encrypt PidData and store image data
      const encryptedFingerprints: any = {};
      for (let i = 0; i < 5; i++) {
        if (validation.sanitizedData![`finger_${i + 1}`]) {
          try {
            const encrypted = await encryptFingerprintData(
              validation.sanitizedData![`finger_${i + 1}`],
              encryptionKey,
              { fingerId: i + 1, userId: user.id }
            );
            
            encryptedFingerprints[`finger_${i + 1}`] = JSON.stringify({
              encrypted: encrypted.encryptedData,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              timestamp: encrypted.timestamp,
              format: 'PidData',
              version: '2.0'
            });
            
            // Store image data if available
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
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-emerald-green/5 p-6">
          <Alert className="max-w-2xl mx-auto border-destructive/30 bg-destructive/5 backdrop-blur-sm">
            <Shield className="h-5 w-5 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              🔐 Authentication required. Please log in to access this secure feature.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-muted/10 to-emerald-green/5">
        <div className="h-full p-6 flex flex-col">
          {/* Compact Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-12 h-12 branded-gradient rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-branded-gradient">Add New Student</h1>
                <p className="text-sm text-muted-foreground">Complete form and capture fingerprints</p>
              </div>
            </div>
          </div>

          {/* Single Row Form */}
          <Form {...form}>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* Student Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-electric-blue uppercase">
                      <User className="h-3 w-3 inline mr-1" />
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full name"
                        {...field}
                        className="h-10 bg-muted/20 border border-border/50 focus:border-electric-blue rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mobile */}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-vibrant-purple uppercase">
                      <Phone className="h-3 w-3 inline mr-1" />
                      Mobile
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mobile number"
                        {...field}
                        className="h-10 bg-muted/20 border border-border/50 focus:border-vibrant-purple rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-emerald-green uppercase">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email (optional)"
                        {...field}
                        className="h-10 bg-muted/20 border border-border/50 focus:border-emerald-green rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Batch */}
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-sunset-orange uppercase">
                      <GraduationCap className="h-3 w-3 inline mr-1" />
                      Batch
                    </FormLabel>
                    <FormControl>
                      <div className="h-10 bg-muted/20 border border-border/50 focus-within:border-sunset-orange rounded-lg">
                        <BatchSelector 
                          value={field.value} 
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-pink-rose uppercase">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full address"
                        {...field}
                        className="h-10 bg-muted/20 border border-border/50 focus:border-pink-rose rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fingerprint Capture Section */}
            <div className="flex-1 flex flex-col">
              <h2 className="text-lg font-bold text-center mb-4 text-branded-gradient">Biometric Fingerprint Capture</h2>
              
              {/* Debug Panel */}
              <div className="mb-6">
                <MFS100Debug />
              </div>
              
              <div className="flex-1">
                <MultiFingerCaptureInterface
                  onAllCaptured={handleAllFingerprintsCaptured}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <div className="mt-6 text-center">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={form.handleSubmit(onSubmit)}
                  className="h-14 px-12 text-lg font-bold bg-gradient-to-r from-emerald-green to-electric-blue hover:shadow-glow-lg transition-all duration-300 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Student...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Submit to Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}