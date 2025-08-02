
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
import { BatchSelector } from "@/components/BatchSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { EnhancedMFS100Capture } from "@/components/EnhancedMFS100Capture";
import { useEnhancedAuth } from "@/contexts/EnhancedAuthContext";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
});

export default function EnhancedAddStudent() {
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      batchId: "",
      address: "",
      fingerprints: ["", "", "", "", ""],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedImages, setCapturedImages] = useState<(string | null)[]>([null, null, null, null, null]);

  const handleFingerprintCapture = (index: number, value: string) => {
    const currentFingerprints = form.getValues("fingerprints");
    currentFingerprints[index] = value;
    form.setValue("fingerprints", currentFingerprints);
    form.trigger("fingerprints");
  };

  const handleImageChange = (index: number, imageData: string) => {
    const newImages = [...capturedImages];
    newImages[index] = imageData;
    setCapturedImages(newImages);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (!user) {
        toast.error("You must be logged in to add students");
        navigate("/login");
        return;
      }

      // Prepare fingerprint data
      const fingerprintData: any = {};
      for (let i = 0; i < 5; i++) {
        if (values.fingerprints[i]) {
          fingerprintData[`finger_${i + 1}`] = values.fingerprints[i];
        }
        if (capturedImages[i]) {
          fingerprintData[`finger_${i + 1}_image`] = capturedImages[i];
        }
      }

      // Insert into database
      const { data, error } = await supabase.from('students').insert({
        student_name: values.name,
        batch_id: values.batchId,
        ...fingerprintData,
      }).select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Student created successfully:', data);
      toast.success("Student registered successfully!");
      
      // Reset form
      form.reset();
      setCapturedImages([null, null, null, null, null]);
      
      // Navigate to students list
      navigate("/students");
      
    } catch (error) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add student: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fingerNames = [
    "Finger 1",
    "Finger 2", 
    "Finger 3",
    "Finger 4",
    "Finger 5"
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Student</h1>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="text-blue-600">Home</span>
            <span>/</span>
            <span>Add Student</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Student Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter Student Name" 
                          {...field}
                          className="h-10"
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
                      <FormLabel className="text-sm font-medium">Mobile</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter Mobile" 
                          {...field}
                          className="h-10"
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
                      <FormLabel className="text-sm font-medium">Batch</FormLabel>
                      <FormControl>
                        <div className="bg-white">
                          <BatchSelector 
                            value={field.value} 
                            onChange={field.onChange}
                          />
                        </div>
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
                      <FormLabel className="text-sm font-medium">Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter Address" 
                          {...field}
                          className="h-10"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fingerprint Capture Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[0, 1, 2, 3, 4].map((index) => (
                  <FormField
                    key={index}
                    control={form.control}
                    name={`fingerprints.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <EnhancedMFS100Capture
                            index={index}
                            value={field.value}
                            onChange={(value) => handleFingerprintCapture(index, value)}
                            onImageChange={(imageData) => handleImageChange(index, imageData)}
                            fingerName={fingerNames[index]}
                            targetQuality={60}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex justify-start">
                <Button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}
