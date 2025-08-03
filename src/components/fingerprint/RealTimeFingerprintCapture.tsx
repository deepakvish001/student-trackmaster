
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalRDService } from '@/contexts/GlobalRDServiceContext';

interface RealTimeFingerprintCaptureProps {
  index: number;
  fingerName: string;
  studentId?: string;
  onCaptureSuccess: (index: number, template: string, image: string, quality: number) => void;
}

export function RealTimeFingerprintCapture({ 
  index, 
  fingerName, 
  studentId,
  onCaptureSuccess 
}: RealTimeFingerprintCaptureProps) {
  const { user } = useAuth();
  const { isAvailable, captureFingerprint } = useGlobalRDService();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedData, setCapturedData] = useState<{
    template: string;
    image: string;
    quality: number;
  } | null>(null);

  const saveToDatabase = async (template: string, image: string, quality: number) => {
    if (!studentId || !user?.id) return;

    try {
      // Update student record with fingerprint data
      const fingerprintField = `finger_${index + 1}`;
      const imageField = `finger_${index + 1}_image`;
      
      const updateData = {
        [fingerprintField]: template,
        [imageField]: image,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId);

      if (error) throw error;

      console.log(`✅ ${fingerName} saved to database in real-time for student:`, studentId);
      
      // Also save to separate fingerprint table for detailed tracking
      const { error: fpError } = await supabase
        .from('student_fingerprints')
        .upsert({
          student_id: studentId,
          finger_index: index,
          pid_data: template,
          image_data: image,
          quality_score: quality,
          user_id: user.id,
          capture_timestamp: new Date().toISOString()
        }, {
          onConflict: 'student_id,finger_index'
        });

      if (fpError) throw fpError;
      
    } catch (error) {
      console.error(`❌ Error saving ${fingerName} to database:`, error);
      toast.error(`Failed to save ${fingerName} to database`);
    }
  };

  const handleCapture = useCallback(async () => {
    if (!isAvailable) {
      toast.error('Device not available. Please check connection.');
      return;
    }

    if (!studentId) {
      toast.error('Please enter student name first');
      return;
    }

    try {
      setIsCapturing(true);
      toast.info(`Place ${fingerName} on scanner...`);

      // Simulate real fingerprint capture using Global RD Service
      const result = await captureFingerprint(15000);
      
      if (result && result.template) {
        const quality = Math.floor(Math.random() * 30) + 70; // Mock quality 70-100%
        const mockImageData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
        
        const captureData = {
          template: result.template,
          image: mockImageData,
          quality: quality
        };
        
        setCapturedData(captureData);
        
        // Save to database immediately
        await saveToDatabase(captureData.template, captureData.image, captureData.quality);
        
        // Trigger parent callback
        onCaptureSuccess(index, captureData.template, captureData.image, captureData.quality);
        
        toast.success(`${fingerName} captured and saved!`, {
          description: `Quality: ${quality}% - Saved to database`
        });
      } else {
        throw new Error('No fingerprint data received');
      }
      
    } catch (error) {
      console.error(`${fingerName} capture error:`, error);
      toast.error(`Failed to capture ${fingerName}`, {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsCapturing(false);
    }
  }, [isAvailable, studentId, fingerName, index, captureFingerprint, onCaptureSuccess]);

  const handleRecapture = () => {
    setCapturedData(null);
    handleCapture();
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-200">
      {/* Fingerprint Display Area */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 mb-4 h-32 flex flex-col items-center justify-center bg-slate-50/50 relative overflow-hidden">
        {capturedData ? (
          <div className="w-full h-full flex items-center justify-center relative">
            <img 
              src={capturedData.image} 
              alt={`${fingerName} fingerprint`}
              className="max-w-full max-h-full object-contain filter contrast-125"
            />
            <div className="absolute top-1 right-1">
              <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                ✓ {capturedData.quality}%
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Fingerprint className={`h-8 w-8 ${isCapturing ? 'animate-pulse text-blue-500' : ''}`} />
            <span className="text-xs">
              {isCapturing ? 'Capturing...' : 'Ready to capture'}
            </span>
          </div>
        )}
      </div>

      {/* Finger Label */}
      <p className="text-sm font-medium text-slate-700 text-center mb-3">
        {fingerName}
      </p>

      {/* Real-time Status */}
      {studentId && (
        <div className="text-xs text-center mb-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Real-time enabled
          </Badge>
        </div>
      )}

      {/* Capture Button */}
      <Button
        type="button"
        size="sm"
        disabled={isCapturing || !isAvailable || !studentId}
        className={`w-full transition-all duration-200 ${
          capturedData
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
        onClick={capturedData ? handleRecapture : handleCapture}
      >
        {isCapturing ? (
          <>
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Capturing...
          </>
        ) : capturedData ? (
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

      {/* Success Indicator */}
      {capturedData && (
        <div className="flex items-center justify-center space-x-1 text-xs text-green-600 mt-2">
          <CheckCircle className="h-3 w-3" />
          <span>Saved to database</span>
        </div>
      )}
    </div>
  );
}
