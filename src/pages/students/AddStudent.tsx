
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
import { UserPlus, RefreshCw, Users, GraduationCap, Phone, MapPin, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';
import { GlobalConnectionTestButton } from '@/components/rd/GlobalConnectionTestButton';
import { GlobalRDServiceCapture } from '@/components/rd/GlobalRDServiceCapture';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800">Add New Student</h1>
                    <div className="flex items-center text-sm text-slate-500 mt-2">
                      <span className="text-blue-600 hover:underline cursor-pointer">Dashboard</span>
                      <span className="mx-2">/</span>
                      <span className="text-blue-600 hover:underline cursor-pointer">Students</span>
                      <span className="mx-2">/</span>
                      <span className="text-slate-700 font-medium">Add Student</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Student Registration
                </Badge>
              </div>
            </div>

            {/* RD Service Connection */}
            <GlobalConnectionTestButton />

            {/* Main Form Card */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60">
                <CardTitle className="flex items-center space-x-3 text-xl text-slate-800">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Student Information</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-slate-700">Personal Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Student Name */}
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <span>Student Name *</span>
                        </Label>
                        <Input
                          id="name"
                          {...register("name")}
                          placeholder="Enter full name"
                          className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                        {errors.name && (
                          <p className="text-red-500 text-xs flex items-center space-x-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            <span>{errors.name.message}</span>
                          </p>
                        )}
                      </div>

                      {/* Mobile */}
                      <div className="space-y-3">
                        <Label htmlFor="contactNumber" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-slate-500" />
                          <span>Mobile Number</span>
                        </Label>
                        <Input
                          id="contactNumber"
                          {...register("contactNumber")}
                          placeholder="+91 98765 43210"
                          className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>

                      {/* Batch */}
                      <div className="space-y-3">
                        <Label htmlFor="class" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-slate-500" />
                          <span>Batch *</span>
                        </Label>
                        <Select value={watch("class")} onValueChange={(value) => setValue("class", value)}>
                          <SelectTrigger className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select batch" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="batch1" className="hover:bg-blue-50">Ambedkar Nagar Batch 1</SelectItem>
                            <SelectItem value="batch2" className="hover:bg-blue-50">Ambedkar Nagar Batch 2</SelectItem>
                            <SelectItem value="batch3" className="hover:bg-blue-50">Ambedkar Nagar Batch 3</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.class && (
                          <p className="text-red-500 text-xs flex items-center space-x-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            <span>{errors.class.message}</span>
                          </p>
                        )}
                      </div>

                      {/* Address */}
                      <div className="space-y-3">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span>Address</span>
                        </Label>
                        <Input
                          id="address"
                          {...register("address")}
                          placeholder="Enter address"
                          className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-8" />

                  {/* Biometric Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-slate-700">Biometric Registration</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={capturedFingerprints.length === 5 ? "default" : "secondary"} className="bg-green-50 text-green-700 border-green-200">
                          <Fingerprint className="h-3 w-3 mr-1" />
                          {capturedFingerprints.length}/5 Captured
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200/60">
                      <div className="grid grid-cols-5 gap-6">
                        {fingerNames.map((fingerName, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-200">
                            {/* Fingerprint Display Area */}
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 mb-4 h-32 flex flex-col items-center justify-center bg-slate-50/50 relative overflow-hidden">
                              {fingerprintData.find(f => f.index === index) ? (
                                <div className="w-full h-full flex items-center justify-center relative">
                                  <img 
                                    src={fingerprintData.find(f => f.index === index)?.image || '/placeholder.svg'} 
                                    alt={`${fingerName} fingerprint`}
                                    className="max-w-full max-h-full object-contain filter contrast-125"
                                  />
                                  <div className="absolute top-1 right-1">
                                    <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                                      ✓ {fingerprintData.find(f => f.index === index)?.quality}%
                                    </Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                                  <Fingerprint className="h-8 w-8" />
                                  <span className="text-xs">Not captured</span>
                                </div>
                              )}
                            </div>

                            {/* Finger Label */}
                            <p className="text-sm font-medium text-slate-700 text-center mb-3">
                              {fingerName}
                            </p>

                            {/* Hidden Capture Component */}
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

                            {/* Capture Button */}
                            <Button
                              type="button"
                              size="sm"
                              className={`w-full transition-all duration-200 ${
                                fingerprintData.find(f => f.index === index)
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                              }`}
                              onClick={async () => {
                                // Simulate fingerprint capture
                                const mockImageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
                                handleFingerprintCapture(index, "mock-template", mockImageData, Math.floor(Math.random() * 30) + 70);
                              }}
                            >
                              {fingerprintData.find(f => f.index === index) ? (
                                <>
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Recapture
                                </>
                              ) : (
                                <>
                                  <Fingerprint className="mr-1 h-3 w-3" />
                                  Capture
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hidden required fields for form validation */}
                  <div className="hidden">
                    <Input {...register("rollNumber")} value="AUTO" />
                    <Input {...register("section")} value="A" />
                    <Input {...register("dateOfBirth")} type="date" value="2000-01-01" />
                  </div>

                  <Separator className="my-8" />

                  {/* Submit Section */}
                  <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200/60">
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                      <div className="text-sm text-slate-600">
                        <p className="font-medium">Ready to submit?</p>
                        <p className="text-slate-500">
                          {capturedFingerprints.length > 0 
                            ? `${capturedFingerprints.length} fingerprint(s) captured successfully`
                            : "At least one fingerprint is required to proceed"
                          }
                        </p>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={isSubmitting || capturedFingerprints.length === 0}
                        size="lg"
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                            Processing Registration...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-5 w-5" />
                            Register Student
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </GlobalRDServiceProvider>
  );
}
