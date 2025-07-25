/**
 * Phase 2: Enhanced Add Student Page with Biometric Security
 * Advanced student registration with encryption and enhanced validation
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { BatchSelector } from "@/components/BatchSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModernFingerprintCapture } from "@/components/modern/ModernFingerprintCapture";
import { validateStudentDataWithBiometrics } from "@/utils/enhancedSecurityValidation";
import { encryptFingerprintData, auditBiometricAccess } from "@/utils/biometricSecurity";
import { sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber } from "@/utils/inputSanitization";
import { useEnhancedAuth } from "@/contexts/EnhancedAuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle, Lock, CheckCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must not exceed 15 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters").max(500, "Address must not exceed 500 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
  fingerprintImages: z.array(z.string()).optional(),
});

export default function EnhancedAddStudent() {
  const navigate = useNavigate();
  const { user, encryptionKey, securityLevel, sessionMetrics } = useEnhancedAuth();
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
      fingerprintImages: ["", "", "", "", ""],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricSummary, setBiometricSummary] = useState<any>(null);

  // Handle fingerprint changes with real-time validation
  const handleFingerprintChange = (index: number, value: string) => {
    console.log(`Enhanced fingerprint ${index + 1} changed:`, value ? `${value.substring(0, 50)}...` : 'empty');
    const currentFingerprints = form.getValues("fingerprints");
    currentFingerprints[index] = value;
    form.setValue("fingerprints", currentFingerprints);
    
    // Trigger validation
    form.trigger("fingerprints");
    
    // Update biometric summary in real-time
    updateBiometricSummary(currentFingerprints);
  };

  const handleFingerprintImageChange = (index: number, imageData: string) => {
    console.log(`Enhanced fingerprint image ${index + 1} changed:`, imageData ? `${imageData.length} characters` : 'empty');
    const currentImages = form.getValues("fingerprintImages") || ["", "", "", "", ""];
    currentImages[index] = imageData;
    form.setValue("fingerprintImages", currentImages);
  };

  const updateBiometricSummary = (fingerprints: string[]) => {
    const validCount = fingerprints.filter(fp => fp && fp.length > 100).length;
    setBiometricSummary({
      captured: validCount,
      total: 5,
      completionPercent: Math.round((validCount / 5) * 100),
      securityLevel: validCount === 5 ? 'high' : validCount >= 3 ? 'medium' : 'low'
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submit');
      return;
    }

    setIsSubmitting(true);
    console.log('Starting enhanced form submission...', {
      name: values.name,
      fingerprintCount: values.fingerprints.filter(fp => fp).length,
      securityLevel,
      hasEncryptionKey: !!encryptionKey
    });

    try {
      // Log the start of student creation
      await logEvent('STUDENT_CREATION_STARTED', 'students', undefined, undefined, {
        studentName: values.name,
        fingerprintCount: values.fingerprints.filter(fp => fp).length
      });

      // Security check: Ensure user is authenticated
      if (!user) {
        await logEvent('UNAUTHORIZED_STUDENT_CREATION');
        auditBiometricAccess('UNAUTHORIZED_STUDENT_CREATION', { success: false });
        toast.error("You must be logged in to add students");
        navigate("/login");
        return;
      }

      // Security check: Ensure encryption is available
      if (!encryptionKey) {
        await logEvent('MISSING_ENCRYPTION_KEY');
        auditBiometricAccess('MISSING_ENCRYPTION_KEY', { 
          userId: user.id,
          success: false 
        });
        toast.error("Biometric security not initialized. Please refresh and try again.");
        return;
      }

      // Enhanced validation with biometric security
      const sanitizedData = {
        name: sanitizeTextInput(values.name),
        mobile: sanitizePhoneNumber(values.mobile),
        batchId: values.batchId,
        address: sanitizeTextInput(values.address),
        email: values.email ? sanitizeEmail(values.email) : "",
        fingerprints: values.fingerprints,
        fingerprintImages: values.fingerprintImages
      };

      console.log('Enhanced sanitized data:', {
        ...sanitizedData,
        fingerprints: sanitizedData.fingerprints.map((fp, i) => `Finger ${i + 1}: ${fp ? 'captured' : 'empty'}`),
        fingerprintImages: sanitizedData.fingerprintImages?.map((img, i) => `Image ${i + 1}: ${img ? 'captured' : 'empty'}`)
      });

      // Advanced biometric validation
      const validation = await validateStudentDataWithBiometrics(sanitizedData);
      if (!validation.isValid) {
        await logEvent('STUDENT_VALIDATION_FAILED', undefined, undefined, undefined, {
          errors: validation.errors
        });
        auditBiometricAccess('STUDENT_VALIDATION_FAILED', {
          userId: user.id,
          errors: validation.errors,
          success: false
        });
        toast.error(`Enhanced validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      console.log('Enhanced validation successful:', validation.biometricSummary);

      // Encrypt biometric data before storage
      const encryptedFingerprints: any = {};
      for (let i = 0; i < 5; i++) {
        if (validation.sanitizedData![`finger_${i + 1}`]) {
          try {
            const encrypted = await encryptFingerprintData(
              validation.sanitizedData![`finger_${i + 1}`],
              encryptionKey,
              { fingerId: i + 1, userId: user.id }
            );
            
            // Store encrypted data as JSON string
            encryptedFingerprints[`finger_${i + 1}`] = JSON.stringify({
              encrypted: encrypted.encryptedData,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              timestamp: encrypted.timestamp,
              version: '1.0'
            });
            
            console.log(`Fingerprint ${i + 1} encrypted successfully`);
          } catch (error) {
            console.error(`Failed to encrypt fingerprint ${i + 1}:`, error);
            throw new Error(`Failed to secure biometric data for finger ${i + 1}`);
          }
        }
      }

      console.log('All biometric data encrypted, proceeding with database insert...');

      // Insert with enhanced security
      const { data, error } = await supabase.from('students').insert({
        student_name: validation.sanitizedData!.student_name,
        batch_id: validation.sanitizedData!.batch_id,
        ...encryptedFingerprints,
        finger_1_image: validation.sanitizedData!.finger_1_image || null,
        finger_2_image: validation.sanitizedData!.finger_2_image || null,
        finger_3_image: validation.sanitizedData!.finger_3_image || null,
        finger_4_image: validation.sanitizedData!.finger_4_image || null,
        finger_5_image: validation.sanitizedData!.finger_5_image || null,
      }).select();

      if (error) {
        console.error('Enhanced database insert error:', error);
        await logEvent('DATABASE_ERROR', 'students', undefined, undefined, {
          error: error.message
        });
        auditBiometricAccess('DATABASE_ERROR', {
          userId: user.id,
          error: error.message,
          success: false
        });
        throw error;
      }

      console.log('Enhanced student created successfully:', data);
      
      await logEvent('STUDENT_CREATED_SUCCESS', 'students', data[0].id, undefined, {
        studentName: validation.sanitizedData!.student_name,
        biometricSummary: validation.biometricSummary
      });
      
      auditBiometricAccess('STUDENT_CREATED', {
        userId: user.id,
        studentName: validation.sanitizedData!.student_name,
        biometricSummary: validation.biometricSummary,
        securityLevel: validation.biometricSummary!.securityLevel,
        success: true
      });
      
      toast.success(`Student registered with ${validation.biometricSummary!.securityLevel} security level!`);
      
      // Reset form
      form.reset();
      setBiometricSummary(null);
      
      // Navigate to students list
      navigate("/students");
      
    } catch (error) {
      console.error('Enhanced error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await logEvent('STUDENT_CREATION_FAILED', 'students', undefined, undefined, {
        error: errorMessage
      });
      
      auditBiometricAccess('STUDENT_CREATION_FAILED', {
        userId: user?.id,
        error: errorMessage,
        success: false
      });
      
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        toast.error("A student with this information already exists.");
      } else if (errorMessage.includes('foreign key')) {
        toast.error("Selected batch is invalid. Please select a valid batch.");
      } else {
        toast.error(`Failed to add student: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show authentication warning if user is not logged in
  if (!user) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in p-6">
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              You must be logged in to access this feature. Please log in to continue.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Enhanced Biometric Student Registration</h2>
          <div className="flex items-center space-x-2">
            <Badge variant={securityLevel === 'high' ? 'default' : securityLevel === 'medium' ? 'secondary' : 'destructive'}>
              Security: {securityLevel.toUpperCase()}
            </Badge>
            {encryptionKey && (
              <Badge variant="outline" className="text-green-600">
                <Lock className="h-3 w-3 mr-1" />
                Encrypted
              </Badge>
            )}
          </div>
        </div>

        {/* Enhanced Security Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              🔒 AES-256-GCM encryption active for all biometric data
            </AlertDescription>
          </Alert>
          
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              📊 Session Activity: {sessionMetrics.activityCount} actions
            </AlertDescription>
          </Alert>
          
          {biometricSummary && (
            <Alert className={`${
              biometricSummary.securityLevel === 'high' ? 'border-green-200 bg-green-50' :
              biometricSummary.securityLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                biometricSummary.securityLevel === 'high' ? 'text-green-500' :
                biometricSummary.securityLevel === 'medium' ? 'text-yellow-500' :
                'text-red-500'
              }`} />
              <AlertDescription className={`${
                biometricSummary.securityLevel === 'high' ? 'text-green-700' :
                biometricSummary.securityLevel === 'medium' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                🔍 Biometrics: {biometricSummary.captured}/5 ({biometricSummary.completionPercent}%)
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Enhanced Student Registration with Modern MFS100</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Student Information Fields - keeping existing implementation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter Student Name" 
                            {...field}
                            value={sanitizeTextInput(field.value)}
                            onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                            className="hover:border-primary focus:border-primary transition-colors"
                            maxLength={100}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter Mobile" 
                            {...field}
                            value={sanitizePhoneNumber(field.value)}
                            onChange={(e) => field.onChange(sanitizePhoneNumber(e.target.value))}
                            className="hover:border-primary focus:border-primary transition-colors"
                            maxLength={15}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch</FormLabel>
                        <FormControl>
                          <BatchSelector 
                            value={field.value} 
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter Address" 
                            {...field}
                            value={sanitizeTextInput(field.value)}
                            onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                            className="hover:border-primary focus:border-primary transition-colors"
                            maxLength={500}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Enter Email" 
                            {...field}
                            value={field.value ? sanitizeEmail(field.value) : ""}
                            onChange={(e) => field.onChange(sanitizeEmail(e.target.value))}
                            className="hover:border-primary focus:border-primary transition-colors"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Enhanced Modern Fingerprint Capture */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Lock className="h-5 w-5 text-green-500" />
                    <span>Encrypted Biometric Capture</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    All fingerprint data is encrypted using AES-256-GCM before storage. Connect your Mantra MFS100 device for enhanced capture.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <FormField
                        key={index}
                        control={form.control}
                        name={`fingerprints.${index}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <ModernFingerprintCapture
                                index={index}
                                value={field.value}
                                onChange={(value) => handleFingerprintChange(index, value)}
                                onImageChange={(imageData) => handleFingerprintImageChange(index, imageData)}
                                targetQuality={70}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="lg"
                  disabled={isSubmitting || !encryptionKey}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Securing & Registering Student...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Register Student (Encrypted)
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
