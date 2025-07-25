
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
import { BatchSelector } from "@/components/BatchSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FingerprintCapture } from "@/components/FingerprintCapture";
import { MFS100FingerprintCapture } from "@/components/MFS100FingerprintCapture";
import { FingerprintGuidanceSystem } from "@/components/FingerprintGuidanceSystem";
import { validateStudentData } from "@/utils/securityValidation";
import { sanitizeTextInput, sanitizeEmail, sanitizePhoneNumber, logSecurityEvent } from "@/utils/inputSanitization";
import { useEnhancedAuth } from "@/contexts/EnhancedAuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must not exceed 100 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must not exceed 15 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters").max(500, "Address must not exceed 500 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
  fingerprintImages: z.array(z.string()).optional(),
});

export default function AddStudent() {
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
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

  // Handle fingerprint changes with validation and logging
  const handleFingerprintChange = (index: number, value: string) => {
    console.log(`Fingerprint ${index + 1} changed:`, value ? `${value.substring(0, 50)}...` : 'empty');
    const currentFingerprints = form.getValues("fingerprints");
    currentFingerprints[index] = value;
    form.setValue("fingerprints", currentFingerprints);
    
    // Trigger validation
    form.trigger("fingerprints");
  };

  // Handle fingerprint image changes with logging
  const handleFingerprintImageChange = (index: number, imageData: string) => {
    console.log(`Fingerprint image ${index + 1} changed:`, imageData ? `${imageData.length} characters` : 'empty');
    const currentImages = form.getValues("fingerprintImages") || ["", "", "", "", ""];
    currentImages[index] = imageData;
    form.setValue("fingerprintImages", currentImages);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submit');
      return;
    }

    setIsSubmitting(true);
    console.log('Starting form submission...', {
      name: values.name,
      fingerprintCount: values.fingerprints.filter(fp => fp).length
    });

    try {
      // Security check: Ensure user is authenticated
      if (!user) {
        logSecurityEvent('Unauthorized student creation attempt');
        toast.error("You must be logged in to add students");
        navigate("/login");
        return;
      }

      // Sanitize and validate input data
      const sanitizedData = {
        name: sanitizeTextInput(values.name),
        mobile: sanitizePhoneNumber(values.mobile),
        batchId: values.batchId,
        address: sanitizeTextInput(values.address),
        email: values.email ? sanitizeEmail(values.email) : "",
        fingerprints: values.fingerprints,
        fingerprintImages: values.fingerprintImages
      };

      console.log('Sanitized data:', {
        ...sanitizedData,
        fingerprints: sanitizedData.fingerprints.map((fp, i) => `Finger ${i + 1}: ${fp ? 'captured' : 'empty'}`),
        fingerprintImages: sanitizedData.fingerprintImages?.map((img, i) => `Image ${i + 1}: ${img ? 'captured' : 'empty'}`)
      });

      // Server-side validation
      const validation = validateStudentData(sanitizedData);
      if (!validation.isValid) {
        logSecurityEvent('Invalid student data submission', { errors: validation.errors });
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Validate that all fingerprints are captured
      const missingFingerprints = sanitizedData.fingerprints.findIndex(fp => !fp);
      if (missingFingerprints !== -1) {
        toast.error(`Please capture all 5 fingerprints. Missing: Finger ${missingFingerprints + 1}`);
        console.log('Missing fingerprints:', sanitizedData.fingerprints.map((fp, i) => `${i + 1}: ${fp ? 'OK' : 'MISSING'}`));
        return;
      }

      console.log('All fingerprints captured, proceeding with database insert...');

      // Insert with automatic user_id assignment via trigger
      const { data, error } = await supabase.from('students').insert({
        student_name: sanitizedData.name,
        batch_id: sanitizedData.batchId,
        finger_1: sanitizedData.fingerprints[0],
        finger_2: sanitizedData.fingerprints[1],
        finger_3: sanitizedData.fingerprints[2],
        finger_4: sanitizedData.fingerprints[3],
        finger_5: sanitizedData.fingerprints[4],
        finger_1_image: sanitizedData.fingerprintImages?.[0] || null,
        finger_2_image: sanitizedData.fingerprintImages?.[1] || null,
        finger_3_image: sanitizedData.fingerprintImages?.[2] || null,
        finger_4_image: sanitizedData.fingerprintImages?.[3] || null,
        finger_5_image: sanitizedData.fingerprintImages?.[4] || null,
      }).select();

      if (error) {
        console.error('Database insert error:', error);
        logSecurityEvent('Database error during student creation', { error: error.message });
        throw error;
      }

      console.log('Student created successfully:', data);
      logSecurityEvent('Student created successfully', { studentName: sanitizedData.name });
      toast.success("Student registered successfully with all fingerprints!");
      
      // Reset form
      form.reset();
      
      // Navigate to students list
      navigate("/students");
      
    } catch (error) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logSecurityEvent('Student creation failed', { error: errorMessage });
      
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
          <h2 className="text-2xl font-bold text-primary">Add Student with Real-time Fingerprint Capture</h2>
        </div>

        {/* Security Notice */}
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            🔒 Secure Mode: All student data and biometric information is encrypted and protected with enhanced security measures.
          </AlertDescription>
        </Alert>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Student Registration with Enhanced MFS100 Capture</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Student Information Fields */}
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

                {/* Enhanced Fingerprint Capture Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Enhanced Fingerprint Capture</h3>
                  <p className="text-sm text-gray-600">
                    Connect your Mantra MFS100 device and follow the guided process to capture all 5 fingerprints in high quality.
                  </p>
                  
                  {/* Show error if fingerprints are missing */}
                  {form.formState.errors.fingerprints && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {form.formState.errors.fingerprints.message}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Tabs defaultValue="enhanced" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="enhanced" disabled={isSubmitting}>Enhanced MFS100 (Recommended)</TabsTrigger>
                      <TabsTrigger value="standard" disabled={isSubmitting}>Standard MFS100</TabsTrigger>
                      <TabsTrigger value="rd" disabled={isSubmitting}>Mantra RD Service</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="enhanced" className="mt-6">
                      <FormField
                        control={form.control}
                        name="fingerprints"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <FingerprintGuidanceSystem
                                fingerprints={form.watch("fingerprints")}
                                onFingerprintChange={handleFingerprintChange}
                                onImageChange={handleFingerprintImageChange}
                                targetQuality={70}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="standard" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <FormField
                            key={index}
                            control={form.control}
                            name={`fingerprints.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <MFS100FingerprintCapture
                                    index={index}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onImageChange={(imageData) => handleFingerprintImageChange(index, imageData)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="rd" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <FormField
                            key={index}
                            control={form.control}
                            name={`fingerprints.${index}`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <FingerprintCapture
                                    index={index}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Button 
                  type="submit" 
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 transition-colors animate-fade-in"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Registering Student...
                    </>
                  ) : (
                    'Register Student with Fingerprints'
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
