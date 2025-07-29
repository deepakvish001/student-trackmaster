
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useRealTimeFingerprintCapture } from '@/hooks/useRealTimeFingerprintCapture';
import { RDServiceStatusIndicator } from '@/components/rd/RDServiceStatusIndicator';
import { EnhancedRDServiceCapture } from '@/components/rd/EnhancedRDServiceCapture';
import { supabase } from '@/integrations/supabase/client';
import { User, Save, AlertCircle, CheckCircle, Fingerprint } from 'lucide-react';

interface BatchData {
  id: string;
  batch_name: string;
  max_students: number;
}

interface StudentFormData {
  student_name: string;
  student_id: string;
  email: string;
  phone: string;
  batch_id: string;
  address: string;
}

const fingerNames = [
  'Finger 1',
  'Finger 2',
  'Finger 3',
  'Finger 4',
  'Finger 5'
];

export default function EnhancedAddStudent() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<StudentFormData>({
    student_name: '',
    student_id: '',
    email: '',
    phone: '',
    batch_id: '',
    address: ''
  });

  const {
    capturedFingerprints,
    isCapturing,
    startCapture,
    completeCapture,
    clearFingerprint,
    getTotalCaptured,
    getAllCapturedData
  } = useRealTimeFingerprintCapture();

  // Load batches
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .eq('is_enabled', true)
          .order('batch_name');
        
        if (error) throw error;
        setBatches(data || []);
      } catch (error) {
        console.error('Error loading batches:', error);
        toast.error('Failed to load batches');
      }
    };
    
    loadBatches();
  }, []);

  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { student_name, student_id, email, phone, batch_id } = formData;
    
    if (!student_name || !student_id || !email || !phone || !batch_id) {
      toast.error('Please fill in all required fields');
      return false;
    }
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSaveStudent = async (forceSave: boolean = false) => {
    if (!validateForm()) return;

    const capturedCount = getTotalCaptured();
    
    // Check if we have any fingerprints or if user wants to force save
    if (capturedCount === 0 && !forceSave) {
      toast.error('Please capture at least one fingerprint before saving');
      return;
    }

    // Warn if not all fingerprints are captured
    if (capturedCount < 5 && !forceSave) {
      toast.warning(`Only ${capturedCount} out of 5 fingerprints captured. Click "Save Anyway" to proceed.`);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get all captured data
      const { templates, images } = getAllCapturedData();
      
      // Create student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{
          student_name: formData.student_name,
          student_id: formData.student_id,
          email: formData.email,
          phone: formData.phone,
          batch_id: formData.batch_id,
          address: formData.address,
          fingerprint_templates: templates,
          fingerprint_images: images,
          total_fingerprints_captured: capturedCount,
          enrollment_status: capturedCount >= 3 ? 'complete' : 'partial'
        }])
        .select()
        .single();

      if (studentError) {
        throw studentError;
      }

      toast.success(`Student saved successfully with ${capturedCount} fingerprints!`);
      
      // Reset form
      setFormData({
        student_name: '',
        student_id: '',
        email: '',
        phone: '',
        batch_id: '',
        address: ''
      });
      
      // Navigate back to student list
      navigate('/students');
      
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const capturedCount = getTotalCaptured();
  const completionPercentage = (capturedCount / 5) * 100;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Add New Student</h1>
        <p className="text-gray-600">Enter student information and capture biometric data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Information Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Information
            </CardTitle>
            <CardDescription>
              Enter basic student details and select batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student_name">Student Name *</Label>
                <Input
                  id="student_name"
                  value={formData.student_name}
                  onChange={(e) => handleInputChange('student_name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="student_id">Student ID *</Label>
                <Input
                  id="student_id"
                  value={formData.student_id}
                  onChange={(e) => handleInputChange('student_id', e.target.value)}
                  placeholder="Enter student ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="batch_id">Batch *</Label>
              <Select value={formData.batch_id} onValueChange={(value) => handleInputChange('batch_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_name} (Max: {batch.max_students})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address (optional)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fingerprint Capture Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Fingerprint Capture Status
            </CardTitle>
            <CardDescription>
              {capturedCount}/5 fingerprints captured ({completionPercentage.toFixed(0)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {fingerNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant={capturedFingerprints[index] ? "default" : "secondary"}>
                      {capturedFingerprints[index] ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    </Badge>
                    <span className="text-sm">{name}</span>
                  </div>
                ))}
              </div>

              {capturedCount >= 3 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Minimum fingerprints captured! You can save the student now.
                  </AlertDescription>
                </Alert>
              )}

              {capturedCount < 3 && capturedCount > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {3 - capturedCount} more fingerprints needed for complete enrollment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Device Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Device Status</CardTitle>
        </CardHeader>
        <CardContent>
          <RDServiceStatusIndicator />
        </CardContent>
      </Card>

      {/* Fingerprint Capture Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Fingerprint Capture</CardTitle>
          <CardDescription>
            Capture all 5 fingerprints. If device disconnects, you can save with partial data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {fingerNames.map((fingerName, index) => (
              <EnhancedRDServiceCapture
                key={index}
                index={index}
                fingerName={fingerName}
                onCaptureSuccess={(template, quality, imageData) => {
                  startCapture(index);
                  completeCapture(index, template, imageData || '', quality);
                }}
                onCaptureError={(error) => {
                  toast.error(`${fingerName} capture failed: ${error}`);
                }}
                targetQuality={60}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-gray-600">
              {capturedCount > 0 ? (
                <span>
                  {capturedCount} fingerprints captured. 
                  {capturedCount < 5 ? ' You can save with partial data if needed.' : ' All fingerprints captured!'}
                </span>
              ) : (
                <span>No fingerprints captured yet.</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {capturedCount > 0 && capturedCount < 5 && (
                <Button
                  variant="outline"
                  onClick={() => handleSaveStudent(true)}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Anyway ({capturedCount}/5)
                </Button>
              )}
              
              <Button
                onClick={() => handleSaveStudent(false)}
                disabled={isLoading || (capturedCount === 0)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Student'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
