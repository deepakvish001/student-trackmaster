/**
 * Phase 2: Enhanced Add Student Page with Biometric Security
 * Advanced student registration with encryption and enhanced validation
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
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Loader2, 
  AlertTriangle, 
  Lock, 
  CheckCircle, 
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  Activity,
  Zap,
  Eye,
  TrendingUp
} from "lucide-react";

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
  const [realTimeProgress, setRealTimeProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formValidationScore, setFormValidationScore] = useState(0);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time form validation scoring
  useEffect(() => {
    const watchForm = form.watch((value) => {
      let score = 0;
      if (value.name && value.name.length >= 2) score += 15;
      if (value.mobile && value.mobile.length >= 10) score += 15;
      if (value.email && value.email.includes('@')) score += 10;
      if (value.address && value.address.length >= 5) score += 15;
      if (value.batchId) score += 15;
      
      const validFingerprints = value.fingerprints?.filter(fp => fp && fp.length > 100).length || 0;
      score += validFingerprints * 6; // 30 points total for all 5 fingerprints
      
      setFormValidationScore(Math.min(score, 100));
      setRealTimeProgress(score);
    });
    
    return watchForm.unsubscribe;
  }, [form.watch]);

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

  // Get dynamic security color based on level
  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-electric-blue bg-electric-blue/10 border-electric-blue/20';
      case 'medium': return 'text-sunset-orange bg-sunset-orange/10 border-sunset-orange/20';
      case 'low': return 'text-pink-rose bg-pink-rose/10 border-pink-rose/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  // Get dynamic progress color
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-electric-blue';
    if (score >= 60) return 'bg-emerald-green';
    if (score >= 40) return 'bg-sunset-orange';
    return 'bg-pink-rose';
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
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Enhanced Header with Real-time Data */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                🚀 Enhanced Biometric Registration
              </h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-electric-blue" />
                  <span className="font-mono text-electric-blue">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity className="h-4 w-4 text-emerald-green" />
                  <span className="text-emerald-green">
                    Session: {sessionMetrics.activityCount} actions
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={`${getSecurityColor(securityLevel)} border font-semibold px-4 py-2`}>
                <Shield className="h-4 w-4 mr-2" />
                Security: {securityLevel.toUpperCase()}
              </Badge>
              {encryptionKey && (
                <Badge variant="outline" className="text-electric-blue bg-electric-blue/10 border-electric-blue/20 font-semibold px-4 py-2">
                  <Lock className="h-4 w-4 mr-2" />
                  AES-256 Active
                </Badge>
              )}
            </div>
          </div>

          {/* Real-time Progress Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-electric-blue font-semibold uppercase tracking-wide">Form Progress</p>
                    <p className="text-2xl font-bold text-electric-blue">{realTimeProgress}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-electric-blue" />
                </div>
                <Progress value={realTimeProgress} className={`mt-2 h-2 ${getProgressColor(realTimeProgress)}`} />
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-green font-semibold uppercase tracking-wide">Encryption Status</p>
                    <p className="text-lg font-bold text-emerald-green">
                      {encryptionKey ? "🔒 Active" : "❌ Inactive"}
                    </p>
                  </div>
                  <Lock className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-sunset-orange font-semibold uppercase tracking-wide">Biometric Quality</p>
                    <p className="text-lg font-bold text-sunset-orange">
                      {biometricSummary ? `${biometricSummary.captured}/5` : "0/5"}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-sunset-orange" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-pink-rose font-semibold uppercase tracking-wide">Real-time Score</p>
                    <p className="text-2xl font-bold text-pink-rose">{formValidationScore}/100</p>
                  </div>
                  <Zap className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Security Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert className="glass border-electric-blue/30 bg-electric-blue/5">
              <Lock className="h-5 w-5 text-electric-blue" />
              <AlertDescription className="text-electric-blue font-medium">
                🔐 <strong>Military-grade encryption:</strong> All biometric data secured with AES-256-GCM
              </AlertDescription>
            </Alert>
            
            {biometricSummary && (
              <Alert className={`glass border-2 ${
                biometricSummary.securityLevel === 'high' ? 'border-emerald-green/30 bg-emerald-green/5' :
                biometricSummary.securityLevel === 'medium' ? 'border-sunset-orange/30 bg-sunset-orange/5' :
                'border-pink-rose/30 bg-pink-rose/5'
              }`}>
                <CheckCircle className={`h-5 w-5 ${
                  biometricSummary.securityLevel === 'high' ? 'text-emerald-green' :
                  biometricSummary.securityLevel === 'medium' ? 'text-sunset-orange' :
                  'text-pink-rose'
                }`} />
                <AlertDescription className={`font-medium ${
                  biometricSummary.securityLevel === 'high' ? 'text-emerald-green' :
                  biometricSummary.securityLevel === 'medium' ? 'text-sunset-orange' :
                  'text-pink-rose'
                }`}>
                  🔍 <strong>Biometric Status:</strong> {biometricSummary.captured}/5 captured ({biometricSummary.completionPercent}%) - {biometricSummary.securityLevel.toUpperCase()} security
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Enhanced Registration Form */}
          <Card className="glass-card border-foreground/10 hover-lift">
            <CardHeader className="bg-gradient-to-r from-electric-blue/10 via-emerald-green/10 to-pink-rose/10 rounded-t-xl">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-electric-blue/20">
                  <User className="h-6 w-6 text-electric-blue" />
                </div>
                <span>Student Registration Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {/* Enhanced Personal Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-foreground/10">
                      <div className="p-2 rounded-lg bg-electric-blue/20">
                        <User className="h-5 w-5 text-electric-blue" />
                      </div>
                      <h3 className="text-xl font-bold text-electric-blue">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-base flex items-center space-x-2">
                              <User className="h-4 w-4 text-electric-blue" />
                              <span>Student Name</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Student Name" 
                                {...field}
                                value={sanitizeTextInput(field.value)}
                                onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                                className="glass bg-surface-darker border-foreground/20 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 transition-all duration-200 h-12 text-base"
                                maxLength={100}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage className="text-destructive font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-base flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-emerald-green" />
                              <span>Mobile Number</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter Mobile Number" 
                                {...field}
                                value={sanitizePhoneNumber(field.value)}
                                onChange={(e) => field.onChange(sanitizePhoneNumber(e.target.value))}
                                className="glass bg-surface-darker border-foreground/20 text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-green focus:ring-emerald-green/20 transition-all duration-200 h-12 text-base"
                                maxLength={15}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage className="text-destructive font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-base flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-sunset-orange" />
                              <span>Email Address (Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="student@example.com" 
                                {...field}
                                value={field.value ? sanitizeEmail(field.value) : ""}
                                onChange={(e) => field.onChange(sanitizeEmail(e.target.value))}
                                className="glass bg-surface-darker border-foreground/20 text-foreground placeholder:text-muted-foreground/70 focus:border-sunset-orange focus:ring-sunset-orange/20 transition-all duration-200 h-12 text-base"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage className="text-destructive font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="batchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-base flex items-center space-x-2">
                              <GraduationCap className="h-4 w-4 text-pink-rose" />
                              <span>Select Batch</span>
                            </FormLabel>
                            <FormControl>
                              <div className="glass bg-surface-darker rounded-lg">
                                <BatchSelector 
                                  value={field.value} 
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-destructive font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-semibold text-base flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-vibrant-purple" />
                            <span>Complete Address</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter Complete Address" 
                              {...field}
                              value={sanitizeTextInput(field.value)}
                              onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                              className="glass bg-surface-darker border-foreground/20 text-foreground placeholder:text-muted-foreground/70 focus:border-vibrant-purple focus:ring-vibrant-purple/20 transition-all duration-200 h-12 text-base"
                              maxLength={500}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Enhanced Biometric Capture Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-foreground/10">
                      <div className="p-2 rounded-lg bg-emerald-green/20">
                        <Lock className="h-5 w-5 text-emerald-green" />
                      </div>
                      <h3 className="text-xl font-bold text-emerald-green">Encrypted Biometric Capture</h3>
                      <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">
                        Real-time Encryption
                      </Badge>
                    </div>
                    
                    <Alert className="glass border-emerald-green/20 bg-emerald-green/5">
                      <Lock className="h-4 w-4 text-emerald-green" />
                      <AlertDescription className="text-emerald-green font-medium">
                        All fingerprint data is encrypted using military-grade AES-256-GCM before storage. Connect your Mantra MFS100 device for optimal capture quality.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <FormField
                          key={index}
                          control={form.control}
                          name={`fingerprints.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="glass-card border-foreground/10 p-2 rounded-xl hover-lift">
                                  <ModernFingerprintCapture
                                    index={index}
                                    value={field.value}
                                    onChange={(value) => handleFingerprintChange(index, value)}
                                    onImageChange={(imageData) => handleFingerprintImageChange(index, imageData)}
                                    targetQuality={70}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-destructive font-medium" />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Submit Button */}
                  <div className="flex justify-center pt-8">
                    <Button 
                      type="submit" 
                      className="relative overflow-hidden bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-electric-blue/25 disabled:opacity-50 disabled:hover:scale-100"
                      size="lg"
                      disabled={isSubmitting || !encryptionKey || formValidationScore < 70}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/20 via-emerald-green/20 to-pink-rose/20 animate-shimmer"></div>
                      <div className="relative flex items-center space-x-3">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>🔐 Securing & Registering...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-6 w-6" />
                            <span>🚀 Register Student (Encrypted)</span>
                          </>
                        )}
                      </div>
                    </Button>
                  </div>

                  {/* Form Completion Indicator */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Form Completion: <span className={`font-bold ${
                        formValidationScore >= 70 ? 'text-emerald-green' : 'text-sunset-orange'
                      }`}>
                        {formValidationScore}%
                      </span>
                    </p>
                    <Progress value={formValidationScore} className="w-full max-w-md mx-auto h-2" />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
