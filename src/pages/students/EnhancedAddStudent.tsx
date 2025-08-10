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
      await logEvent('STUDENT_CREATION_STARTED', 'students', undefined, undefined, {
        studentName: values.name,
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
      
      await logEvent('STUDENT_CREATED', 'students', data[0].id, undefined, {
        studentName: validation.sanitizedData!.student_name,
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-emerald-green/5">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Simple Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-16 branded-gradient rounded-3xl flex items-center justify-center shadow-glow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-branded-gradient">
                  Add New Student
                </h1>
                <p className="text-lg text-muted-foreground">Complete the form and capture biometric data</p>
              </div>
            </div>
          </div>

          {/* Student Information Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <Card className="premium-card">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-electric-blue/10 border border-electric-blue/20 rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-electric-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Student Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Enter basic student details</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Student Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-electric-blue uppercase tracking-wider">
                            <User className="h-4 w-4 inline mr-2" />
                            Student Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter full name"
                              {...field}
                              className="h-12 bg-muted/20 border-2 border-border/50 focus:border-electric-blue focus:bg-background rounded-xl transition-all duration-300"
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
                          <FormLabel className="text-sm font-bold text-vibrant-purple uppercase tracking-wider">
                            <Phone className="h-4 w-4 inline mr-2" />
                            Mobile Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter mobile number"
                              {...field}
                              className="h-12 bg-muted/20 border-2 border-border/50 focus:border-vibrant-purple focus:bg-background rounded-xl transition-all duration-300"
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
                          <FormLabel className="text-sm font-bold text-emerald-green uppercase tracking-wider">
                            <Mail className="h-4 w-4 inline mr-2" />
                            Email Address (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter email address"
                              {...field}
                              className="h-12 bg-muted/20 border-2 border-border/50 focus:border-emerald-green focus:bg-background rounded-xl transition-all duration-300"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Batch Selection */}
                    <FormField
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-sunset-orange uppercase tracking-wider">
                            <GraduationCap className="h-4 w-4 inline mr-2" />
                            Select Batch
                          </FormLabel>
                          <FormControl>
                            <BatchSelector 
                              value={field.value} 
                              onChange={field.onChange}
                              disabled={isSubmitting}
                            />
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
                          <FormLabel className="text-sm font-bold text-pink-rose uppercase tracking-wider">
                            <MapPin className="h-4 w-4 inline mr-2" />
                            Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter full address"
                              {...field}
                              className="h-12 bg-muted/20 border-2 border-border/50 focus:border-pink-rose focus:bg-background rounded-xl transition-all duration-300"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Right Column - Fingerprint Capture */}
            <Card className="premium-card">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-xl flex items-center justify-center">
                    <Shield className="h-5 w-5 text-vibrant-purple" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Biometric Capture</CardTitle>
                    <p className="text-sm text-muted-foreground">Secure fingerprint enrollment</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MultiFingerCaptureInterface
                  onAllCaptured={handleAllFingerprintsCaptured}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || !form.watch("fingerprints")?.every(fp => fp)}
              className="h-16 px-12 text-lg font-bold bg-gradient-to-r from-vibrant-purple via-electric-blue to-emerald-green hover:scale-105 text-white rounded-2xl shadow-glow-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Creating Student...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6" />
                  <span>Register Student</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}