
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Users, GraduationCap, Fingerprint, Save, CheckCircle2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';
import { GlobalConnectionTestButton } from '@/components/rd/GlobalConnectionTestButton';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StudentRegistrationForm } from '@/components/forms/StudentRegistrationForm';
import { FingerprintGuidanceSystem } from '@/components/FingerprintGuidanceSystem';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';

interface FingerprintData {
  index: number;
  name: string;
  template: string;
  image: string;
  quality: number;
}

interface StudentFormData {
  student_name: string;
  mobile_number: string;
  batch_id: string;
  address: string;
}

export function AddStudent() {
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  const [studentFormData, setStudentFormData] = useState<StudentFormData>({
    student_name: '',
    mobile_number: '',
    batch_id: '',
    address: ''
  });
  const [fingerprintTemplates, setFingerprintTemplates] = useState<string[]>(['', '', '', '', '']);
  const [fingerprintImages, setFingerprintImages] = useState<string[]>(['', '', '', '', '']);
  const [capturedFingerprints, setCapturedFingerprints] = useState<number[]>([]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Updated to only 5 fingerprints
  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const handleStudentFormChange = (formData: StudentFormData) => {
    setStudentFormData(formData);
  };

  const handleFingerprintChange = (index: number, value: string) => {
    setFingerprintTemplates(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });

    // Update captured fingerprints list
    setCapturedFingerprints(prev => {
      if (value && !prev.includes(index)) {
        return [...prev, index].sort((a, b) => a - b);
      } else if (!value && prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return prev;
    });
  };

  const handleImageChange = (index: number, imageData: string) => {
    setFingerprintImages(prev => {
      const updated = [...prev];
      updated[index] = imageData;
      return updated;
    });

    // Create fingerprint data when we have both template and image
    const template = fingerprintTemplates[index];
    if (template && imageData) {
      const fingerData: FingerprintData = {
        index,
        name: fingerNames[index],
        template,
        image: imageData,
        quality: 75, // Default quality, this should come from the capture system
      };

      setFingerprintData(prev => {
        const filtered = prev.filter(f => f.index !== index);
        return [...filtered, fingerData];
      });
    }
  };

  // Check if all required data is complete
  const isFormComplete = studentFormData.student_name.trim() && studentFormData.batch_id;
  const isFingerprintsComplete = capturedFingerprints.length === 5;
  const isAllDataComplete = isFormComplete && isFingerprintsComplete;

  const handleRegister = async () => {
    if (!isAllDataComplete || !user?.id) {
      toast.error("Please complete all required information and capture all fingerprints");
      return;
    }

    try {
      setIsRegistering(true);
      
      // Step 1: Create student record
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          student_name: studentFormData.student_name.trim(),
          mobile_number: studentFormData.mobile_number || null,
          batch_id: studentFormData.batch_id,
          address: studentFormData.address || null,
          user_id: user.id
        })
        .select()
        .single();

      if (studentError || !newStudent) {
        throw new Error(studentError?.message || 'Failed to create student record');
      }

      // Step 2: Save all fingerprint data
      const fingerprintInserts = fingerprintData.map(fp => ({
        student_id: newStudent.id,
        finger_index: fp.index,
        pid_data: fp.template,
        image_data: fp.image,
        quality_score: fp.quality,
        user_id: user.id
      }));

      const { error: fingerprintError } = await supabase
        .from('student_fingerprints')
        .insert(fingerprintInserts);

      if (fingerprintError) {
        // If fingerprint save fails, delete the student record to maintain consistency
        await supabase.from('students').delete().eq('id', newStudent.id);
        throw new Error(fingerprintError.message);
      }

      // Mark as completed
      setIsCompleted(true);
      
      toast.success("Student registration completed successfully!", {
        description: `${studentFormData.student_name} has been registered with all biometric data`,
        duration: 5000
      });

      // Redirect after a delay
      setTimeout(() => {
        navigate('/students');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
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
                    <h1 className="text-3xl font-bold text-slate-800">Register New Student</h1>
                    <div className="flex items-center text-sm text-slate-500 mt-2">
                      <span className="text-blue-600 hover:underline cursor-pointer">Dashboard</span>
                      <span className="mx-2">/</span>
                      <span className="text-blue-600 hover:underline cursor-pointer">Students</span>
                      <span className="mx-2">/</span>
                      <span className="text-slate-700 font-medium">Register Student</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    Student Registration
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4">
              <div className="text-center">
                <p className="text-blue-800 font-medium">
                  Fill out student information and capture all fingerprints in any order. 
                  Click "Register Student" when everything is complete.
                </p>
              </div>
            </div>

            {/* RD Service Connection */}
            <GlobalConnectionTestButton />

            {/* Student Information Card */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60">
                <CardTitle className="flex items-center justify-between text-xl text-slate-800">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Student Information</span>
                  </div>
                  {isFormComplete && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      Form Complete
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8">
                <StudentRegistrationForm 
                  formData={studentFormData}
                  onFormChange={handleStudentFormChange}
                />
              </CardContent>
            </Card>

            <Separator className="my-8" />

            {/* Biometric Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3 text-xl text-slate-800">
                    <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                    <span>Biometric Registration</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={isFingerprintsComplete ? "default" : "secondary"} className="bg-green-50 text-green-700 border-green-200">
                      <Fingerprint className="h-3 w-3 mr-1" />
                      {capturedFingerprints.length}/5 Captured
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                <FingerprintGuidanceSystem
                  fingerprints={fingerprintTemplates}
                  onFingerprintChange={handleFingerprintChange}
                  onImageChange={handleImageChange}
                  targetQuality={70}
                />
              </CardContent>
            </Card>

            {/* Register Button Section */}
            {!isCompleted && (
              <Card className={`shadow-lg border-0 ${isAllDataComplete ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-gray-50 to-slate-50'}`}>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className={`flex items-center justify-center space-x-2 ${isAllDataComplete ? 'text-green-700' : 'text-gray-500'}`}>
                      {isAllDataComplete ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <RefreshCw className="h-6 w-6" />
                      )}
                      <h3 className="text-xl font-semibold">
                        {isAllDataComplete ? 'Ready to Register' : 'Complete All Requirements'}
                      </h3>
                    </div>
                    <p className={`mb-6 ${isAllDataComplete ? 'text-green-600' : 'text-gray-600'}`}>
                      {isAllDataComplete 
                        ? 'All required information and fingerprints have been captured. Click below to register the student.'
                        : `Please complete: ${!isFormComplete ? 'Student Information' : ''} ${!isFormComplete && !isFingerprintsComplete ? 'and ' : ''} ${!isFingerprintsComplete ? 'All Fingerprints' : ''}`
                      }
                    </p>
                    <Button 
                      onClick={handleRegister}
                      disabled={!isAllDataComplete || isRegistering}
                      size="lg"
                      className={`px-8 py-3 text-lg font-medium ${
                        isAllDataComplete 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          Registering Student...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Register Student
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <Card className="shadow-lg border-0 bg-gradient-to-r from-green-100 to-emerald-100">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-green-700">
                      <CheckCircle2 className="h-8 w-8" />
                      <h3 className="text-2xl font-bold">Registration Completed!</h3>
                    </div>
                    <p className="text-green-700 text-lg">
                      Student has been successfully registered with all biometric data.
                      Redirecting to student list...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Summary */}
            <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-slate-800">Registration Progress</h3>
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isFormComplete ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Student Info: {isFormComplete ? 'Complete' : 'Incomplete'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isFingerprintsComplete ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Fingerprints: {capturedFingerprints.length}/5</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-green-500' : isAllDataComplete ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                      <span>Status: {isCompleted ? 'Registered' : isAllDataComplete ? 'Ready' : 'In Progress'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </GlobalRDServiceProvider>
  );
}
