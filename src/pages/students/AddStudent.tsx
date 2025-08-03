
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { RDServiceStatusIndicator } from "@/components/rd/RDServiceStatusIndicator";
import { EnhancedRDServiceCapture } from "@/components/rd/EnhancedRDServiceCapture";
import { shouldSkipFingerprintValidation } from '@/utils/rdServiceValidator';
import { validateStudentData } from '@/utils/securityValidation';
import { BatchSelector } from "@/components/BatchSelector";
import { sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber } from "@/utils/inputSanitization";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  Activity,
  Eye,
  TrendingUp,
  Image as ImageIcon
} from "lucide-react";

const formSchema = yup.object().shape({
  name: yup.string().required('Name is required').min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  mobile: yup.string().required('Mobile number is required').matches(/^[0-9]{10,15}$/, 'Mobile number must be 10-15 digits'),
  email: yup.string().email('Invalid email').optional(),
  address: yup.string().required('Address is required').min(5, "Address must be at least 5 characters").max(500, "Address must not exceed 500 characters"),
  batchId: yup.string().required('Batch is required'),
});

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
  const [capturedFingerprints, setCapturedFingerprints] = useState<Record<number, CapturedFingerprint>>({});
  const [activeTab, setActiveTab] = useState("details");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formValidationScore, setFormValidationScore] = useState(0);

  const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: yupResolver(formSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      address: '',
      batchId: '',
    },
  });

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time form validation scoring
  useEffect(() => {
    const subscription = watch((value) => {
      let score = 0;
      if (value.name && value.name.length >= 2) score += 20;
      if (value.mobile && value.mobile.length >= 10) score += 20;
      if (value.email && value.email.includes('@')) score += 10;
      if (value.address && value.address.length >= 5) score += 20;
      if (value.batchId) score += 20;
      
      const validFingerprints = Object.keys(capturedFingerprints).length;
      score += Math.min(validFingerprints * 2, 10); // 10 points total for fingerprints
      
      setFormValidationScore(Math.min(score, 100));
    });
    
    return () => subscription.unsubscribe();
  }, [watch, capturedFingerprints]);

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
        setActiveTab(`finger-${fingerIndex + 1}`);
      }, 1500);
    } else if (fingerIndex >= 4) {
      // Move to summary after last finger
      setTimeout(() => {
        setActiveTab("summary");
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
      
      console.log('Starting unified form submission...', {
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
        name: sanitizeTextInput(data.name),
        mobile: sanitizePhoneNumber(data.mobile),
        email: data.email ? sanitizeEmail(data.email) : "",
        address: sanitizeTextInput(data.address),
        batchId: data.batchId,
        studentId,
        ...fingerprintData,
        ...fingerprintImages
      };

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

      // Insert student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          id: studentId,
          student_name: sanitizedData.name,
          mobile: sanitizedData.mobile || null,
          email: sanitizedData.email || null,
          address: sanitizedData.address || null,
          batch_id: sanitizedData.batchId,
          is_enabled: true,
          user_id: user.id,
          ...fingerprintData,
          ...fingerprintImages
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Insert individual fingerprint records
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

      // Reset form and state
      reset();
      setCapturedFingerprints({});
      setActiveTab("details");

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

  const getImagesCount = () => Object.values(capturedFingerprints).filter(f => f.imageData).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
          {/* Enhanced Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                🏛️ Student Registration
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
                    Form Progress: {formValidationScore}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 font-semibold px-4 py-2">
                <Shield className="h-4 w-4 mr-2" />
                UIDAI Compliant
              </Badge>
              <Badge variant="outline" className="text-emerald-green bg-emerald-green/10 border-emerald-green/20 font-semibold px-4 py-2">
                <ImageIcon className="h-4 w-4 mr-2" />
                {getImagesCount()}/5 Images
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
                    <p className="text-2xl font-bold text-electric-blue">{formValidationScore}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-electric-blue" />
                </div>
                <Progress value={formValidationScore} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-emerald-green font-semibold uppercase tracking-wide">RD Service</p>
                    <p className="text-lg font-bold text-emerald-green">Active</p>
                  </div>
                  <Shield className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-sunset-orange font-semibold uppercase tracking-wide">Fingerprints</p>
                    <p className="text-lg font-bold text-sunset-orange">{getTotalCaptured()}/5</p>
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
                    <p className="text-2xl font-bold text-pink-rose">{getAverageQuality()}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RD Service Status */}
          <RDServiceStatusIndicator />

          {/* Main Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="details">Details</TabsTrigger>
                {[0, 1, 2, 3, 4].map((index) => (
                  <TabsTrigger key={index} value={`finger-${index}`} className="relative">
                    Finger {index + 1}
                    {capturedFingerprints[index] && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              {/* Student Details Tab */}
              <TabsContent value="details">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <User className="h-6 w-6 text-electric-blue" />
                      <span>Student Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-electric-blue" />
                          <span>Full Name *</span>
                        </Label>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Enter full name"
                              className={errors.name ? 'border-red-500' : ''}
                              value={sanitizeTextInput(field.value)}
                              onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                              maxLength={100}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-emerald-green" />
                          <span>Mobile Number *</span>
                        </Label>
                        <Controller
                          name="mobile"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="10-15 digit mobile number"
                              className={errors.mobile ? 'border-red-500' : ''}
                              value={sanitizePhoneNumber(field.value)}
                              onChange={(e) => field.onChange(sanitizePhoneNumber(e.target.value))}
                              maxLength={15}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        {errors.mobile && <p className="text-red-500 text-sm">{errors.mobile.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-sunset-orange" />
                          <span>Email (Optional)</span>
                        </Label>
                        <Controller
                          name="email"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="email"
                              placeholder="student@example.com"
                              className={errors.email ? 'border-red-500' : ''}
                              value={field.value ? sanitizeEmail(field.value) : ""}
                              onChange={(e) => field.onChange(sanitizeEmail(e.target.value))}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-pink-rose" />
                          <span>Batch *</span>
                        </Label>
                        <Controller
                          name="batchId"
                          control={control}
                          render={({ field }) => (
                            <div className="glass bg-surface-darker rounded-lg">
                              <BatchSelector 
                                value={field.value} 
                                onChange={field.onChange}
                              />
                            </div>
                          )}
                        />
                        {errors.batchId && <p className="text-red-500 text-sm">{errors.batchId.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-vibrant-purple" />
                        <span>Address *</span>
                      </Label>
                      <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Enter complete address"
                            className={errors.address ? 'border-red-500' : ''}
                            value={sanitizeTextInput(field.value)}
                            onChange={(e) => field.onChange(sanitizeTextInput(e.target.value))}
                            maxLength={500}
                            disabled={isSubmitting}
                          />
                        )}
                      />
                      {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fingerprint Capture Tabs */}
              {[0, 1, 2, 3, 4].map((fingerIndex) => (
                <TabsContent key={fingerIndex} value={`finger-${fingerIndex}`}>
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center space-x-3">
                          <Shield className="h-6 w-6 text-blue-500" />
                          <span>Capture Finger {fingerIndex + 1}</span>
                        </span>
                        {capturedFingerprints[fingerIndex] && (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            Quality: {capturedFingerprints[fingerIndex].quality}%
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}

              {/* Summary Tab */}
              <TabsContent value="summary">
                <Card className="glass-card">
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
                        {getImagesCount() > 0 && (
                          <Badge variant="outline" className="text-blue-600 bg-blue-50">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {getImagesCount()} Images
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

                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Form Completion: <span className={`font-bold ${
                            formValidationScore >= 70 ? 'text-emerald-green' : 'text-sunset-orange'
                          }`}>
                            {formValidationScore}%
                          </span>
                        </p>
                        <Progress value={formValidationScore} className="w-full max-w-md mx-auto h-2" />
                      </div>

                      <div className="flex justify-center space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            reset();
                            setCapturedFingerprints({});
                            setActiveTab("details");
                          }}
                          disabled={isSubmitting}
                        >
                          Reset Form
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || formValidationScore < 70}
                          className="min-w-32 bg-gradient-to-r from-blue-500 via-emerald-green to-pink-rose"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding Student...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Add Student
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
