
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';
import { GlobalConnectionTestButton } from '@/components/rd/GlobalConnectionTestButton';
import { GlobalRDServiceCapture } from '@/components/rd/GlobalRDServiceCapture';
import DashboardLayout from '@/components/DashboardLayout';

const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  rollNumber: z.string().min(1, "Roll number is required"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface FingerprintData {
  index: number;
  name: string;
  template: string;
  image: string;
  quality: number;
}

export function AddStudent() {
  const navigate = useNavigate();
  const [capturedFingerprints, setCapturedFingerprints] = useState<number[]>([]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updated to only 5 fingerprints
  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const watchedFields = watch();

  const handleFingerprintCapture = (
    index: number,
    template: string,
    image: string,
    quality: number
  ) => {
    const fingerData: FingerprintData = {
      index,
      name: fingerNames[index],
      template,
      image,
      quality,
    };

    setFingerprintData(prev => {
      const filtered = prev.filter(f => f.index !== index);
      return [...filtered, fingerData];
    });

    setCapturedFingerprints(prev => {
      if (!prev.includes(index)) {
        return [...prev, index].sort((a, b) => a - b);
      }
      return prev;
    });

    toast.success(`${fingerNames[index]} captured successfully!`, {
      description: `Quality: ${quality}% - ${capturedFingerprints.length + 1}/5 fingerprints captured`
    });
  };

  const onSubmit = async (data: StudentFormData) => {
    if (capturedFingerprints.length === 0) {
      toast.error("At least one fingerprint is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const studentData = {
        ...data,
        fingerprints: fingerprintData,
        enrollmentDate: new Date().toISOString(),
        status: 'active'
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("Student data to be saved:", studentData);

      toast.success("Student registered successfully!", {
        description: `${data.name} has been enrolled with ${capturedFingerprints.length} fingerprints`
      });

      // Navigate back to students list
      navigate("/students");

    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to register student", {
        description: "Please try again or contact support"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlobalRDServiceProvider>
      <DashboardLayout>
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Add Student</h1>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <span className="text-blue-600 hover:underline cursor-pointer">Home</span>
                <span className="mx-2">/</span>
                <span>Add Student</span>
              </div>
            </div>
          </div>

          {/* Global RD Service Connection Test */}
          <GlobalConnectionTestButton />

          {/* Form Card */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Form Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {/* Student Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Student Name
                    </Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter Student Name"
                      className="w-full"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700">
                      Mobile
                    </Label>
                    <Input
                      id="contactNumber"
                      {...register("contactNumber")}
                      placeholder="Enter Mobile"
                      className="w-full"
                    />
                  </div>

                  {/* Batch */}
                  <div className="space-y-2">
                    <Label htmlFor="class" className="text-sm font-medium text-gray-700">
                      Batch
                    </Label>
                    <Select value={watch("class")} onValueChange={(value) => setValue("class", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ambedakar Nagar Batch 1" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batch1">Ambedakar Nagar Batch 1</SelectItem>
                        <SelectItem value="batch2">Ambedakar Nagar Batch 2</SelectItem>
                        <SelectItem value="batch3">Ambedakar Nagar Batch 3</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.class && (
                      <p className="text-red-500 text-xs">{errors.class.message}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Address
                    </Label>
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="Enter Address"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Hidden required fields for form validation */}
                <div className="hidden">
                  <Input {...register("rollNumber")} value="AUTO" />
                  <Input {...register("section")} value="A" />
                  <Input {...register("dateOfBirth")} type="date" value="2000-01-01" />
                </div>

                {/* Fingerprint Section */}
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {fingerNames.map((fingerName, index) => (
                      <div key={index} className="text-center">
                        {/* Fingerprint Display Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-3 h-48 flex flex-col items-center justify-center bg-gray-50">
                          {fingerprintData.find(f => f.index === index) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <img 
                                src={fingerprintData.find(f => f.index === index)?.image || '/placeholder.svg'} 
                                alt={`${fingerName} fingerprint`}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-20 bg-red-300 rounded-lg flex items-center justify-center">
                              <div className="w-12 h-16 bg-red-500 rounded-full opacity-70"></div>
                            </div>
                          )}
                        </div>

                        {/* Finger Label */}
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Finger {index + 1}
                        </p>

                        {/* Capture Button */}
                        <div className="hidden">
                          <GlobalRDServiceCapture
                            index={index}
                            fingerName={fingerName}
                            onCaptureSuccess={(pidData, quality, imageData) => {
                              handleFingerprintCapture(index, pidData, imageData || '', quality);
                            }}
                            onCaptureError={(error) => {
                              toast.error(`Failed to capture ${fingerName}`, {
                                description: error
                              });
                            }}
                            targetQuality={60}
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                          onClick={async () => {
                            // Simulate fingerprint capture
                            const mockImageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
                            handleFingerprintCapture(index, "mock-template", mockImageData, 85);
                          }}
                        >
                          Capture
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-start">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </GlobalRDServiceProvider>
  );
}
