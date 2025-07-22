
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { USBFingerprintCapture } from "@/components/USBFingerprintCapture";
import { BatchSelector } from "@/components/BatchSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FingerprintCapture } from "@/components/FingerprintCapture";
import { MFS100FingerprintCapture } from "@/components/MFS100FingerprintCapture";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits").max(15, "Mobile number must not exceed 15 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
  fingerprintImages: z.array(z.string()).optional(), // New field for fingerprint images
});

export default function AddStudent() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      batchId: "",
      address: "",
      email: "",
      fingerprints: ["", "", "", "", ""],
      fingerprintImages: ["", "", "", "", ""], // Initialize image array
    },
  });

  // Handle fingerprint image changes
  const handleFingerprintImageChange = (index: number, imageData: string) => {
    const currentImages = form.getValues("fingerprintImages") || ["", "", "", "", ""];
    currentImages[index] = imageData;
    form.setValue("fingerprintImages", currentImages);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { error } = await supabase.from('students').insert({
        student_name: values.name,
        batch_id: values.batchId,
        finger_1: values.fingerprints[0],
        finger_2: values.fingerprints[1],
        finger_3: values.fingerprints[2],
        finger_4: values.fingerprints[3],
        finger_5: values.fingerprints[4],
        finger_1_image: values.fingerprintImages?.[0] || null,
        finger_2_image: values.fingerprintImages?.[1] || null,
        finger_3_image: values.fingerprintImages?.[2] || null,
        finger_4_image: values.fingerprintImages?.[3] || null,
        finger_5_image: values.fingerprintImages?.[4] || null,
      });

      if (error) throw error;

      toast.success("Student added successfully!");
      navigate("/students");
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error("Failed to add student. Please try again.");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Add Student</h2>
        </div>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Student Registration with Fingerprint</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                            className="hover:border-primary focus:border-primary transition-colors"
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
                            className="hover:border-primary focus:border-primary transition-colors"
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
                            className="hover:border-primary focus:border-primary transition-colors"
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
                            className="hover:border-primary focus:border-primary transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Tabs defaultValue="mfs100" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="mfs100">MFS100 Native SDK</TabsTrigger>
                    <TabsTrigger value="usb">USB Fingerprint Scanner</TabsTrigger>
                    <TabsTrigger value="rd">Mantra RD Service</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mfs100" className="mt-4">
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
                  
                  <TabsContent value="usb" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <FormField
                          key={index}
                          control={form.control}
                          name={`fingerprints.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <USBFingerprintCapture
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

                <Button 
                  type="submit" 
                  className="w-full md:w-32 bg-primary hover:bg-primary/90 transition-colors animate-fade-in"
                >
                  Register Student
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
