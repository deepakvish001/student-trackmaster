
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, UserPlus, Fingerprint, CheckCircle, RefreshCw } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("finger-0");
  const [capturedFingerprints, setCapturedFingerprints] = useState<number[]>([]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fingerNames = [
    "Right Thumb",
    "Right Index",
    "Right Middle", 
    "Right Ring",
    "Right Little",
    "Left Thumb",
    "Left Index",
    "Left Middle",
    "Left Ring", 
    "Left Little"
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
  
  const completedRequiredFields = [
    watchedFields.name,
    watchedFields.rollNumber,
    watchedFields.class,
    watchedFields.section,
    watchedFields.dateOfBirth,
  ].filter(Boolean).length;

  const completionPercentage = Math.round(
    ((completedRequiredFields / 5) * 50) + ((capturedFingerprints.length / 10) * 50)
  );

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
        const newCaptured = [...prev, index].sort((a, b) => a - b);
        
        // Auto-advance to next uncaptured finger
        const nextUncaptured = fingerNames.findIndex((_, i) => !newCaptured.includes(i));
        if (nextUncaptured !== -1) {
          setActiveTab(`finger-${nextUncaptured}`);
        }
        
        return newCaptured;
      }
      return prev;
    });

    toast.success(`${fingerNames[index]} captured successfully!`, {
      description: `Quality: ${quality}% - ${capturedFingerprints.length + 1}/10 fingerprints captured`
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
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Add New Student
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Complete student registration with biometric enrollment
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Progress</div>
                    <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 relative">
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-primary border-r-transparent animate-spin"
                      style={{ 
                        transform: `rotate(${(completionPercentage / 100) * 360}deg)`,
                        animation: 'none'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{completionPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Global RD Service Connection Test */}
            <GlobalConnectionTestButton />

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column - Form */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-6 w-6 text-primary" />
                      <span>Student Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium flex items-center space-x-1">
                            <span>Full Name</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="name"
                            {...register("name")}
                            placeholder="Enter student's full name"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                          {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="rollNumber" className="text-sm font-medium flex items-center space-x-1">
                            <span>Roll Number</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="rollNumber"
                            {...register("rollNumber")}
                            placeholder="Enter roll number"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                          {errors.rollNumber && (
                            <p className="text-red-500 text-xs mt-1">{errors.rollNumber.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="class" className="text-sm font-medium flex items-center space-x-1">
                            <span>Class</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select value={watch("class")} onValueChange={(value) => setValue("class", value)}>
                            <SelectTrigger className="h-12 border-2 focus:border-primary">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"].map((cls) => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.class && (
                            <p className="text-red-500 text-xs mt-1">{errors.class.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="section" className="text-sm font-medium flex items-center space-x-1">
                            <span>Section</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="section"
                            {...register("section")}
                            placeholder="Enter section (e.g., A, B, C)"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                          {errors.section && (
                            <p className="text-red-500 text-xs mt-1">{errors.section.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth" className="text-sm font-medium flex items-center space-x-1">
                            <span>Date of Birth</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            {...register("dateOfBirth")}
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                          {errors.dateOfBirth && (
                            <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fatherName" className="text-sm font-medium">
                            Father's Name
                          </Label>
                          <Input
                            id="fatherName"
                            {...register("fatherName")}
                            placeholder="Enter father's name"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="motherName" className="text-sm font-medium">
                            Mother's Name
                          </Label>
                          <Input
                            id="motherName"
                            {...register("motherName")}
                            placeholder="Enter mother's name"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactNumber" className="text-sm font-medium">
                            Contact Number
                          </Label>
                          <Input
                            id="contactNumber"
                            {...register("contactNumber")}
                            placeholder="Enter contact number"
                            className="h-12 border-2 focus:border-primary transition-colors"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="address" className="text-sm font-medium">
                            Address
                          </Label>
                          <Textarea
                            id="address"
                            {...register("address")}
                            placeholder="Enter complete address"
                            className="min-h-[100px] border-2 focus:border-primary transition-colors resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-6 border-t">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Required fields completed: {completedRequiredFields}/5</span>
                          </div>
                        </div>
                        
                        <Button
                          type="submit"
                          disabled={isSubmitting || capturedFingerprints.length === 0}
                          className="min-w-[200px] h-12 text-lg font-semibold gradient-primary"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                              Saving Student...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-5 w-5" />
                              Register Student
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Fingerprint Capture */}
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{capturedFingerprints.length}</div>
                      <div className="text-sm text-green-700">Captured</div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{10 - capturedFingerprints.length}</div>
                      <div className="text-sm text-blue-700">Remaining</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Fingerprint Capture Tabs */}
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Fingerprint className="h-6 w-6 text-primary" />
                      <span>Biometric Enrollment</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid grid-cols-5 mb-6">
                        {fingerNames.map((name, index) => (
                          <TabsTrigger
                            key={index}
                            value={`finger-${index}`}
                            className={`text-xs relative ${
                              capturedFingerprints.includes(index) 
                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                : ''
                            }`}
                          >
                            {name.split(' ')[0]}
                            {capturedFingerprints.includes(index) && (
                              <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {fingerNames.map((name, index) => (
                        <TabsContent key={index} value={`finger-${index}`} className="space-y-4">
                          <GlobalRDServiceCapture
                            index={index}
                            fingerName={name}
                            onCaptureSuccess={(pidData, quality, imageData) => {
                              handleFingerprintCapture(index, pidData, imageData || '', quality);
                            }}
                            onCaptureError={(error) => {
                              toast.error(`Failed to capture ${name}`, {
                                description: error
                              });
                            }}
                            targetQuality={60}
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </GlobalRDServiceProvider>
  );
}
