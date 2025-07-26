/**
 * Phase 2: Enhanced Add Student Page with RD Service Biometric Security
 * UIDAI-compliant student registration with PidData format
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
import { RDServiceFingerprintCapture } from "@/components/rd/RDServiceFingerprintCapture";
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
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricSummary, setBiometricSummary] = useState<any>(null);
  const [realTimeProgress, setRealTimeProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formValidationScore, setFormValidationScore] = useState(0);
  const [capturedQualities, setCapturedQualities] = useState<(number | null)[]>([null, null, null, null, null]);

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
      
      const validFingerprints = value.fingerprints?.filter(fp => fp && fp.length > 50).length || 0;
      score += validFingerprints * 6; // 30 points total for all 5 fingerprints
      
      setFormValidationScore(Math.min(score, 100));
      setRealTimeProgress(score);
    });
    
    return watchForm.unsubscribe;
  }, [form.watch]);

  // Handle RD Service fingerprint capture
  const handleRDServiceCapture = (index: number, pidData: string, quality: number) => {
    console.log(`RD Service fingerprint ${index + 1} captured:`, {
      quality,
      pidDataLength: pidData.length,
      pidDataPreview: pidData.substring(0, 200) + '...'
    });
    
    const currentFingerprints = form.getValues("fingerprints");
    currentFingerprints[index] = pidData;
    form.setValue("fingerprints", currentFingerprints);
    
    // Update quality tracking
    const newQualities = [...capturedQualities];
    newQualities[index] = quality;
    setCapturedQualities(newQualities);
    
    // Trigger validation
    form.trigger("fingerprints");
    
    // Update biometric summary
    updateBiometricSummary(currentFingerprints, newQualities);
    
    toast.success(`Finger ${index + 1} captured successfully! Quality: ${quality}%`);
  };

  const handleRDServiceError = (index: number, error: string) => {
    console.error(`RD Service capture error for finger ${index + 1}:`, error);
    toast.error(`Finger ${index + 1} capture failed: ${error}`);
  };

  const updateBiometricSummary = (fingerprints: string[], qualities: (number | null)[]) => {
    const validCount = fingerprints.filter(fp => fp && fp.length > 50).length;
    const avgQuality = qualities.filter(q => q !== null).reduce((sum, q) => sum + (q || 0), 0) / Math.max(validCount, 1);
    
    setBiometricSummary({
      captured: validCount,
      total: 5,
      completionPercent: Math.round((validCount / 5) * 100),
      avgQuality: Math.round(avgQuality),
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
    console.log('Starting RD Service form submission...', {
      name: values.name,
      fingerprintCount: values.fingerprints.filter(fp => fp).length,
      securityLevel,
      hasEncryptionKey: !!encryptionKey
    });

    try {
      // Log the start of student creation
      await logEvent('RD_SERVICE_STUDENT_CREATION_STARTED', 'students', undefined, undefined, {
        studentName: values.name,
        fingerprintCount: values.fingerprints.filter(fp => fp).length,
        avgQuality: biometricSummary?.avgQuality || 0
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

      console.log('RD Service sanitized data:', {
        ...sanitizedData,
        fingerprints: sanitizedData.fingerprints.map((fp, i) => `PidData ${i + 1}: ${fp ? 'captured' : 'empty'}`)
      });

      // Validate with biometric data
      const validation = await validateStudentDataWithBiometrics(sanitizedData);
      if (!validation.isValid) {
        await logEvent('RD_SERVICE_VALIDATION_FAILED', undefined, undefined, undefined, {
          errors: validation.errors
        });
        toast.error(`RD Service validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Encrypt PidData before storage
      const encryptedFingerprints: any = {};
      for (let i = 0; i < 5; i++) {
        if (validation.sanitizedData![`finger_${i + 1}`]) {
          try {
            const encrypted = await encryptFingerprintData(
              validation.sanitizedData![`finger_${i + 1}`],
              encryptionKey,
              { fingerId: i + 1, userId: user.id, format: 'PidData' }
            );
            
            encryptedFingerprints[`finger_${i + 1}`] = JSON.stringify({
              encrypted: encrypted.encryptedData,
              iv: encrypted.iv,
              authTag: encrypted.authTag,
              timestamp: encrypted.timestamp,
              format: 'PidData',
              version: '2.0'
            });
            
            console.log(`PidData ${i + 1} encrypted successfully`);
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
        console.error('RD Service database insert error:', error);
        await logEvent('DATABASE_ERROR', 'students', undefined, undefined, {
          error: error.message
        });
        throw error;
      }

      console.log('RD Service student created successfully:', data);
      
      await logEvent('RD_SERVICE_STUDENT_CREATED', 'students', data[0].id, undefined, {
        studentName: validation.sanitizedData!.student_name,
        biometricSummary: validation.biometricSummary
      });
      
      auditBiometricAccess('RD_SERVICE_STUDENT_CREATED', {
        userId: user.id,
        studentName: validation.sanitizedData!.student_name,
        biometricSummary: validation.biometricSummary,
        format: 'PidData',
        success: true
      });
      
      toast.success(`Student registered with RD Service! Security level: ${validation.biometricSummary!.securityLevel}`);
      
      // Reset form
      form.reset();
      setBiometricSummary(null);
      setCapturedQualities([null, null, null, null, null]);
      
      // Navigate to students list
      navigate("/students");
      
    } catch (error) {
      console.error('RD Service error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await logEvent('RD_SERVICE_STUDENT_CREATION_FAILED', 'students', undefined, undefined, {
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
                🏛️ RD Service Registration
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
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 font-semibold px-4 py-2">
                <Shield className="h-4 w-4 mr-2" />
                UIDAI Compliant
              </Badge>
              <Badge variant="outline" className={`${getSecurityColor(securityLevel)} border font-semibold px-4 py-2`}>
                <Shield className="h-4 w-4 mr-2" />
                Security: {securityLevel.toUpperCase()}
              </Badge>
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
                    <p className="text-xs text-emerald-green font-semibold uppercase tracking-wide">RD Service</p>
                    <p className="text-lg font-bold text-emerald-green">
                      localhost:11100
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
                    <p className="text-xs text-sunset-orange font-semibold uppercase tracking-wide">PidData Quality</p>
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
                    <p className="text-xs text-pink-rose font-semibold uppercase tracking-wide">Avg Quality</p>
                    <p className="text-2xl font-bold text-pink-rose">
                      {biometricSummary?.avgQuality || 0}%
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Security Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert className="glass border-blue-500/30 bg-blue-500/5">
              <Shield className="h-5 w-5 text-blue-500" />
              <AlertDescription className="text-blue-500 font-medium">
                🏛️ <strong>UIDAI Compliance:</strong> Using official RD Service for PidData capture
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
                  📊 <strong>PidData Status:</strong> {biometricSummary.captured}/5 captured ({biometricSummary.completionPercent}%) - {biometricSummary.securityLevel.toUpperCase()} security
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
                <span>RD Service Registration Portal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {/* Personal Information Section */}
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

                  {/* RD Service Biometric Capture Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-foreground/10">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Shield className="h-5 w-5 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-500">UIDAI-Compliant PidData Capture</h3>
                      <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                        RD Service
                      </Badge>
                    </div>
                    
                    <Alert className="glass border-blue-500/20 bg-blue-500/5">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-blue-500 font-medium">
                        🏛️ Using official RD Service at localhost:11100 for UIDAI-compliant PidData capture. Ensure MFS100 RD Service is running.
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
                                  <RDServiceFingerprintCapture
                                    index={index}
                                    onCaptureSuccess={(pidData, quality) => handleRDServiceCapture(index, pidData, quality)}
                                    onCaptureError={(error) => handleRDServiceError(index, error)}
                                    disabled={isSubmitting}
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

                  {/* Submit Button */}
                  <div className="flex justify-center pt-8">
                    <Button 
                      type="submit" 
                      className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-emerald-green to-pink-rose text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25 disabled:opacity-50 disabled:hover:scale-100"
                      size="lg"
                      disabled={isSubmitting || !encryptionKey || formValidationScore < 70}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-emerald-green/20 to-pink-rose/20 animate-shimmer"></div>
                      <div className="relative flex items-center space-x-3">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>🏛️ Processing PidData...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-6 w-6" />
                            <span>🚀 Register with RD Service</span>
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
