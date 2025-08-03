
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Users, GraduationCap, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';
import { GlobalConnectionTestButton } from '@/components/rd/GlobalConnectionTestButton';
import DashboardLayout from '@/components/DashboardLayout';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RealTimeStudentForm } from '@/components/forms/RealTimeStudentForm';
import { RealTimeFingerprintCapture } from '@/components/fingerprint/RealTimeFingerprintCapture';

interface FingerprintData {
  index: number;
  name: string;
  template: string;
  image: string;
  quality: number;
}

export function AddStudent() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string>("");
  const [capturedFingerprints, setCapturedFingerprints] = useState<number[]>([]);
  const [fingerprintData, setFingerprintData] = useState<FingerprintData[]>([]);

  // Updated to only 5 fingerprints
  const fingerNames = [
    "Right Thumb",
    "Right Index", 
    "Right Middle",
    "Left Index",
    "Left Thumb"
  ];

  const handleStudentIdChange = (id: string) => {
    setStudentId(id);
    toast.success("Student record created in real-time!", {
      description: "You can now capture fingerprints"
    });
  };

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
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    Student Registration
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    🔴 Real-time Mode
                  </Badge>
                </div>
              </div>
            </div>

            {/* Real-time Status Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 rounded-xl p-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-green-800 font-medium">
                  Real-time mode active - All data automatically saves to Supabase as you type and capture
                </p>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* RD Service Connection */}
            <GlobalConnectionTestButton />

            {/* Student Information Card */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60">
                <CardTitle className="flex items-center space-x-3 text-xl text-slate-800">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Student Information</span>
                  {studentId && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      ID: {studentId.slice(-8)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8">
                <RealTimeStudentForm 
                  studentId={studentId}
                  onStudentIdChange={handleStudentIdChange}
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
                    <span>Real-time Biometric Registration</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={capturedFingerprints.length === 5 ? "default" : "secondary"} className="bg-green-50 text-green-700 border-green-200">
                      <Fingerprint className="h-3 w-3 mr-1" />
                      {capturedFingerprints.length}/5 Captured & Saved
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                {!studentId && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Enter Student Information First</p>
                    <p className="text-sm">Student details will be saved automatically, then you can capture fingerprints</p>
                  </div>
                )}

                {studentId && (
                  <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200/60">
                    <div className="grid grid-cols-5 gap-6">
                      {fingerNames.map((fingerName, index) => (
                        <RealTimeFingerprintCapture
                          key={index}
                          index={index}
                          fingerName={fingerName}
                          studentId={studentId}
                          onCaptureSuccess={handleFingerprintCapture}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Summary */}
            <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-slate-800">Real-time Data Summary</h3>
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${studentId ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Student Record: {studentId ? 'Created' : 'Pending'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${capturedFingerprints.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Fingerprints: {capturedFingerprints.length}/5 Saved</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    All changes are automatically synced with Supabase database in real-time
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </GlobalRDServiceProvider>
  );
}
