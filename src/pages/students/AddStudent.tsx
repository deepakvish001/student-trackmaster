import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { supabase } from '@/integrations/supabase/client';
import { useRealTimeFingerprintCapture } from '@/hooks/useRealTimeFingerprintCapture';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fingerprint } from "lucide-react";
import { FingerprintDisplay } from "@/components/FingerprintDisplay";
import { RDServiceStatusIndicator } from "@/components/rd/RDServiceStatusIndicator";
import { shouldSkipFingerprintValidation } from '@/utils/rdServiceValidator';
import { validateStudentData } from '@/utils/securityValidation';

const formSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  mobile: yup.string().required('Mobile is required').matches(/^[0-9]+$/, 'Must be only digits').min(10, 'Must be at least 10 digits'),
  address: yup.string().required('Address is required'),
  email: yup.string().email('Invalid email format').notRequired(),
});

interface FormData {
  name: string;
  mobile: string;
  address: string;
  email?: string;
}

export default function AddStudent() {
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    mobile: '',
    address: '',
    email: '',
  });
  const [selectedBatch, setSelectedBatch] = useState<{ id: string; name: string } | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Array<{ id: string; name: string; }>>([]);
  const { 
    capturedFingerprints,
    startCapture,
    completeCapture,
    clearFingerprint,
    isFingerCapturing
  } = useRealTimeFingerprintCapture();

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('id, batch_name');

        if (error) {
          console.error('Error fetching batches:', error);
          toast.error('Failed to load batches. Please refresh the page.');
          return;
        }

        if (data && Array.isArray(data)) {
          const batches = data.map(batch => ({
            id: batch.id,
            name: batch.batch_name || 'Unnamed Batch'
          }));
          setAvailableBatches(batches);
        } else {
          console.warn('No batches found or invalid data format.');
          setAvailableBatches([]);
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        toast.error('Failed to load batches. Please check your connection.');
      }
    };

    fetchBatches();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBatch) {
      toast.error('Please select a batch');
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('Starting form submission...', {
        name: formData.name,
        fingerprintCount: Object.values(capturedFingerprints).filter(Boolean).length
      });

      // Check if RD Service is available before validating fingerprints
      const skipFingerprints = await shouldSkipFingerprintValidation();
      
      if (skipFingerprints) {
        console.log('RD Service not available, skipping fingerprint validation');
        toast.warning('RD Service not available. Student will be saved without fingerprints.');
      }

      const submissionData = {
        ...formData,
        batchId: selectedBatch.id,
        fingerprints: Object.values(capturedFingerprints),
        fingerprintImages: Object.values(capturedFingerprints).map(() => null) // No images for now
      };

      console.log('Sanitized data:', submissionData);

      // Validate with conditional fingerprint validation
      const validation = validateStudentData(submissionData, skipFingerprints);
      
      if (!validation.isValid) {
        console.log('Validation failed:', validation.errors);
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([
          {
            ...validation.sanitizedData,
            batch_id: selectedBatch.id,
          },
        ])
        .select()

      if (studentError) {
        console.error('Error inserting student:', studentError);
        toast.error('Failed to add student. Please try again.');
        return;
      }

      // After successful submission
      toast.success('Student added successfully!');
      navigate('/students');

    } catch (error) {
      console.error('Error submitting student:', error);
      toast.error('Failed to add student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFingerprintCapture = useCallback((fingerIndex: number) => {
    startCapture(fingerIndex);
    // Simulate fingerprint capture completion after a delay
    setTimeout(() => {
      const template = uuidv4();
      const rawImageData = btoa(uuidv4());
      const quality = Math.floor(Math.random() * 100);
      completeCapture(fingerIndex, template, rawImageData, quality);
    }, 2000);
  }, [completeCapture, startCapture]);

  const handleClearFingerprint = (fingerIndex: number) => {
    clearFingerprint(fingerIndex);
  };

  const switchFinger = (index: number) => {
    console.log(`Manually switching to finger ${index + 1}`);
    handleFingerprintCapture(index);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add New Student</CardTitle>
          <CardDescription>Fill in the details to register a new student.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RD Service Status */}
            <RDServiceStatusIndicator />

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="batch">Batch</Label>
                <select
                  id="batch"
                  className="w-full p-2 border rounded"
                  onChange={(e) => {
                    const selected = availableBatches.find(batch => batch.id === e.target.value);
                    setSelectedBatch(selected || null);
                  }}
                  value={selectedBatch?.id || ''}
                  required
                >
                  <option value="">Select Batch</option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Fingerprint Capture */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="flex flex-col items-center">
                  <FingerprintDisplay
                    value={capturedFingerprints[index]?.template || ''}
                    index={index}
                    imageData={capturedFingerprints[index]?.imageData}
                    quality={capturedFingerprints[index]?.quality}
                    isCapturing={isFingerCapturing(index)}
                  />
                  <div className="space-x-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleFingerprintCapture(index)}
                      disabled={isFingerCapturing(index)}
                    >
                      {isFingerCapturing(index) ? 'Capturing...' : 'Capture'}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleClearFingerprint(index)}
                      disabled={isFingerCapturing(index)}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => switchFinger(index)}
                      disabled={isFingerCapturing(index)}
                    >
                      Switch
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Add Student'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
