
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, User, Fingerprint, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UnifiedFingerprintCapture, MFS100StatusIndicator } from "@/components/rd";
import { useUnifiedMFS100Service } from "@/hooks/useUnifiedMFS100Service";

interface FingerprintData {
  template: string;
  quality: number;
  imageData?: string;
}

export default function EnhancedAddStudent() {
  const [formData, setFormData] = useState({
    student_id: "",
    full_name: "",
    batch_id: "",
    mobile: "",
    email: ""
  });

  const [fingerprints, setFingerprints] = useState<(FingerprintData | null)[]>(
    Array(10).fill(null)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the unified MFS100 service
  const mfs100Service = useUnifiedMFS100Service();

  // Fetch batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('is_enabled', true)
        .order('batch_name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFingerprintCapture = (index: number, template: string, quality: number, imageData?: string) => {
    console.log(`Fingerprint ${index + 1} captured:`, { template: template.length, quality, imageData: imageData?.length });
    
    setFingerprints(prev => {
      const updated = [...prev];
      updated[index] = { template, quality, imageData };
      return updated;
    });

    toast.success(`Finger ${index + 1} captured successfully!`, {
      description: `Quality: ${quality}%`
    });
  };

  const handleFingerprintError = (index: number, error: string) => {
    console.error(`Fingerprint ${index + 1} error:`, error);
    toast.error(`Failed to capture Finger ${index + 1}`, {
      description: error
    });
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.student_id || !formData.full_name || !formData.batch_id) {
      toast.error("Please fill all required fields");
      return;
    }

    // Check if at least one fingerprint is captured
    const capturedFingerprints = fingerprints.filter(fp => fp !== null);
    if (capturedFingerprints.length === 0) {
      toast.error("Please capture at least one fingerprint");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare fingerprint data - map to the correct database columns
      const fingerprintData: Record<string, any> = {};
      fingerprints.forEach((fp, index) => {
        if (fp) {
          // Map to database columns: finger_1, finger_2, etc. (templates)
          fingerprintData[`finger_${index + 1}`] = fp.template;
          // Map to database columns: finger_1_image, finger_2_image, etc.
          if (fp.imageData) {
            fingerprintData[`finger_${index + 1}_image`] = fp.imageData;
          }
        }
      });

      // Insert student data - map form fields to database columns
      const studentData = {
        student_name: formData.full_name, // Map full_name to student_name
        batch_id: formData.batch_id,
        ...fingerprintData
      };

      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Student enrolled successfully!", {
        description: `${capturedFingerprints.length} fingerprints saved`
      });

      // Reset form
      setFormData({
        student_id: "",
        full_name: "",
        batch_id: "",
        mobile: "",
        email: ""
      });
      setFingerprints(Array(10).fill(null));

    } catch (error) {
      console.error('Submission error:', error);
      toast.error("Failed to enroll student", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const capturedCount = fingerprints.filter(fp => fp !== null).length;
  const averageQuality = capturedCount > 0 
    ? Math.round(fingerprints.filter(fp => fp !== null).reduce((sum, fp) => sum + fp!.quality, 0) / capturedCount)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* MFS100 Status Indicator */}
      <MFS100StatusIndicator />

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-6 w-6" />
            <span>Enhanced Student Enrollment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="student_id">Student ID *</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => handleInputChange('student_id', e.target.value)}
                placeholder="Enter student ID"
              />
            </div>
            
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <Label htmlFor="batch_id">Batch *</Label>
              <Select value={formData.batch_id} onValueChange={(value) => handleInputChange('batch_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batchesLoading ? (
                    <SelectItem value="" disabled>Loading...</SelectItem>
                  ) : (
                    batches?.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_name} ({batch.admin_name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                placeholder="Enter mobile number"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fingerprint Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Fingerprint className="h-6 w-6" />
              <span>Biometric Enrollment Status</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={capturedCount > 0 ? "default" : "secondary"}>
                {capturedCount}/10 Captured
              </Badge>
              {capturedCount > 0 && (
                <Badge variant={averageQuality >= 70 ? "default" : averageQuality >= 60 ? "secondary" : "destructive"}>
                  Avg Quality: {averageQuality}%
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capturedCount === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please capture at least one fingerprint to proceed with enrollment.
              </AlertDescription>
            </Alert>
          )}
          
          {capturedCount > 0 && capturedCount < 5 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                For better security, consider capturing more fingerprints. You have {capturedCount} out of 10 captured.
              </AlertDescription>
            </Alert>
          )}
          
          {capturedCount >= 5 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Excellent! You have captured {capturedCount} fingerprints. This provides good security coverage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Fingerprint Capture Grid - Using UnifiedFingerprintCapture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, index) => (
          <UnifiedFingerprintCapture
            key={index}
            index={index}
            fingerName={`Finger ${index + 1}`}
            onCaptureSuccess={(template, quality, imageData) => 
              handleFingerprintCapture(index, template, quality, imageData)
            }
            onCaptureError={(error) => handleFingerprintError(index, error)}
            targetQuality={60}
          />
        ))}
      </div>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.student_id || !formData.full_name || !formData.batch_id || capturedCount === 0}
            className="w-full"
            size="lg"
          >
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Enrolling Student..." : "Enroll Student"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
