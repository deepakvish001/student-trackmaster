import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle, Fingerprint, Info } from 'lucide-react';

import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { CleanFingerprintCapture } from '@/components/rd/CleanFingerprintCapture';

interface FingerprintData {
  template: string;
  quality: number;
  image: string;
}

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "First Name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Invalid email address.",
  }),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: "You need to select a gender.",
  }),
  address: z.string().min(10, {
    message: "Address must be at least 10 characters.",
  }),
  phoneNumber: z.string().regex(/^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,}\)?[-.\s]?)?(\d{1,}[-.\s]?)?(\d{1,})?$/, {
    message: "Invalid phone number",
  }),
  dateOfBirth: z.string(),
  guardianName: z.string().min(2, {
    message: "Guardian Name must be at least 2 characters.",
  }),
  guardianPhoneNumber:  z.string().regex(/^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,}\)?[-.\s]?)?(\d{1,}[-.\s]?)?(\d{1,})?$/, {
    message: "Invalid phone number",
  }),
  batch: z.string().min(1, {
    message: "Please select a batch",
  }),
  notes: z.string().optional(),
  fingerprint_1: z.string().optional(),
  fingerprint_2: z.string().optional(),
  fingerprint_3: z.string().optional(),
  fingerprint_4: z.string().optional(),
  fingerprint_5: z.string().optional(),
});

export default function EnhancedAddStudent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    guardianName: '',
    guardianPhoneNumber: '',
    batch: '',
    notes: '',
    fingerprint_1: '',
    fingerprint_2: '',
    fingerprint_3: '',
    fingerprint_4: '',
    fingerprint_5: '',
  });
  const [fingerprintData, setFingerprintData] = useState<{ [key: number]: FingerprintData }>({});
  const [fingerprintQualities, setFingerprintQualities] = useState<{ [key: number]: number }>({});
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      gender: "male",
      address: "",
      phoneNumber: "",
      dateOfBirth: "",
      guardianName: "",
      guardianPhoneNumber: "",
      batch: "",
      notes: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log(values)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Student added successfully!");
      navigate('/students');
    }, 2000);
  }

  const handleFingerprintCapture = (index: number, template: string, quality: number, imageData?: string) => {
    console.log(`Fingerprint ${index + 1} captured:`, {
      templateLength: template.length,
      quality,
      hasImage: !!imageData
    });

    // Store the captured fingerprint data
    setFingerprintData(prev => ({
      ...prev,
      [index]: {
        template,
        quality,
        image: imageData || ''
      }
    }));

    // Update form data
    setFormData(prev => ({
      ...prev,
      [`fingerprint_${index + 1}`]: template || imageData || 'captured'
    }));

    setFingerprintQualities(prev => ({
      ...prev,
      [index]: quality
    }));

    toast.success(`Finger ${index + 1} captured successfully!`, {
      description: `Quality: ${quality}%`
    });
  };

  const handleFingerprintError = (index: number, error: string) => {
    console.error(`Fingerprint ${index + 1} capture failed:`, error);
    
    // Clear any existing data for this finger
    setFingerprintData(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    setFingerprintQualities(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    toast.error(`Failed to capture Finger ${index + 1}`, {
      description: error
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add New Student</h1>
          <div>
            <Label htmlFor="batch" className="mr-2">Select Batch:</Label>
            <Select onValueChange={(value) => setFormData({ ...formData, batch: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2021">Batch 2021</SelectItem>
                <SelectItem value="2022">Batch 2022</SelectItem>
                <SelectItem value="2023">Batch 2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First Name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is your public display name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="shadcn@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        You can use a valid email address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4 space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel>Gender</FormLabel>
                        <FormDescription>
                          What is your Gender.
                        </FormDescription>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Textarea
                          placeholder="Address"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tell us a little bit about yourself.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone Number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter valid Phone Number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Of Birth</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your Date of Birth.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Guardian Name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter Guardian Name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardianPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Guardian Phone Number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter Guardian Phone Number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any notes about student.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Enhanced Fingerprint Collection Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Fingerprint className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Fingerprint Collection</h3>
                    <Badge variant="outline">
                      {Object.keys(fingerprintData).length}/5 captured
                    </Badge>
                  </div>

                  {/* Device Connection Status - Global for all fingers */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">
                        Clean MFS100 System - Single Connection Architecture
                      </span>
                    </div>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-6">
                      <li>• Connect device once, capture all fingers sequentially</li>
                      <li>• Only one finger can be captured at a time</li>
                      <li>• Device stays connected throughout the session</li>
                      <li>• Manual reconnect available if disconnected</li>
                    </ul>
                  </div>

                  {/* Fingerprint Capture Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <CleanFingerprintCapture
                        key={index}
                        index={index}
                        fingerName={`Finger ${index + 1}`}
                        targetQuality={60}
                        onCaptureSuccess={(template, quality, imageData) => 
                          handleFingerprintCapture(index, template, quality, imageData)
                        }
                        onCaptureError={(error) => 
                          handleFingerprintError(index, error)
                        }
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>

                  {/* Fingerprint Collection Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Collection Summary</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((fingerNum) => {
                        const index = fingerNum - 1;
                        const captured = fingerprintData[index];
                        const quality = fingerprintQualities[index];
                        
                        return (
                          <div key={fingerNum} className="text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                              captured ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                            }`}>
                              {captured ? <CheckCircle className="h-6 w-6" /> : fingerNum}
                            </div>
                            <div className="text-xs">
                              <div className="font-medium">Finger {fingerNum}</div>
                              {quality && (
                                <div className={`${quality >= 70 ? 'text-green-600' : quality >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {quality}%
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
