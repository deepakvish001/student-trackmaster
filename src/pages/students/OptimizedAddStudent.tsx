
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { OptimizedFingerprintCapture } from '@/components/rd/OptimizedFingerprintCapture';
import { useOptimizedMFS100 } from '@/hooks/useOptimizedMFS100';

const BATCHES = [
  'Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E'
];

interface StudentFormData {
  name: string;
  mobile: string;
  email: string;
  batch: string;
  address: string;
  fingerprints: string[];
}

export default function OptimizedAddStudent() {
  const navigate = useNavigate();
  const { isCapturing } = useOptimizedMFS100();
  
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    mobile: '',
    email: '',
    batch: '',
    address: '',
    fingerprints: ['', '', '', '', '']
  });

  const [isSaving, setIsSaving] = useState(false);

  const updateFingerprint = (index: number, value: string) => {
    const newFingerprints = [...formData.fingerprints];
    newFingerprints[index] = value;
    setFormData(prev => ({
      ...prev,
      fingerprints: newFingerprints
    }));
  };

  const isFormValid = () => {
    return formData.name.trim() !== '' && 
           formData.mobile.trim() !== '' && 
           formData.batch !== '' &&
           formData.fingerprints.some(fp => fp !== ''); // At least one fingerprint
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Please fill in required fields and capture at least one fingerprint');
      return;
    }

    try {
      setIsSaving(true);
      
      console.log('Saving student with data:', {
        ...formData,
        fingerprintsCount: formData.fingerprints.filter(fp => fp !== '').length
      });

      const { data, error } = await supabase
        .from('students')
        .insert([{
          student_name: formData.name.trim(),
          batch_id: formData.batch, // This should be the batch ID, not the batch name
          finger_1: formData.fingerprints[0] || null,
          finger_2: formData.fingerprints[1] || null,
          finger_3: formData.fingerprints[2] || null,
          finger_4: formData.fingerprints[3] || null,
          finger_5: formData.fingerprints[4] || null,
        }])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('✅ Student saved successfully:', data);
      
      const capturedCount = formData.fingerprints.filter(fp => fp !== '').length;
      toast.success(`Student enrolled successfully with ${capturedCount} fingerprint(s)!`);
      
      // Reset form for next student
      setFormData({
        name: '',
        mobile: '',
        email: '',
        batch: '',
        address: '',
        fingerprints: ['', '', '', '', '']
      });

    } catch (error) {
      console.error('Failed to save student:', error);
      toast.error('Failed to enroll student. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Add New Student</h1>
          <Button variant="outline" onClick={() => navigate('/students')}>
            Back to Students
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter student name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isSaving}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                  disabled={isSaving}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="batch">Select Batch *</Label>
                <Select 
                  value={formData.batch} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, batch: value }))}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BATCHES.map((batch) => (
                      <SelectItem key={batch} value={batch}>
                        {batch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Complete Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  disabled={isSaving}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fingerprint Capture */}
          <Card>
            <CardHeader>
              <CardTitle>Fingerprint Collection</CardTitle>
              <p className="text-sm text-gray-600">
                Capture all 5 fingerprints. At least one fingerprint is required to enroll the student.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex justify-center">
                    <OptimizedFingerprintCapture
                      index={index}
                      value={formData.fingerprints[index]}
                      onChange={(value) => updateFingerprint(index, value)}
                      disabled={isSaving || (isCapturing && formData.fingerprints[index] === '')}
                      fingerName={`Finger ${index + 1}`}
                      targetQuality={60}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center space-x-4">
            <Button
              type="submit"
              disabled={!isFormValid() || isSaving || isCapturing}
              className="px-8 py-2"
              size="lg"
            >
              {isSaving ? 'Enrolling Student...' : 'Enroll Student'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  mobile: '',
                  email: '',
                  batch: '',
                  address: '',
                  fingerprints: ['', '', '', '', '']
                });
              }}
              disabled={isSaving || isCapturing}
              size="lg"
            >
              Clear Form
            </Button>
          </div>
        </form>

        {/* Status Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Captured fingerprints: {formData.fingerprints.filter(fp => fp !== '').length}/5
          </p>
          {isCapturing && (
            <p className="text-blue-600 font-medium">
              Please wait - capture in progress. Other buttons are disabled.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
