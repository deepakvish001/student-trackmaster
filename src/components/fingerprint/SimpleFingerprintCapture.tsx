import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Camera, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalRDService } from '@/contexts/GlobalRDServiceContext';
import { EnhancedFingerprintPreview } from '../EnhancedFingerprintPreview';
import { useStableFingerprintPreview } from '@/hooks/useStableFingerprintPreview';

interface SimpleFingerprintCaptureProps {
  fingerNames: string[];
  onFingerprintChange: (index: number, template: string) => void;
  onImageChange: (index: number, imageData: string) => void;
}

export function SimpleFingerprintCapture({ 
  fingerNames, 
  onFingerprintChange, 
  onImageChange 
}: SimpleFingerprintCaptureProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>(['', '', '', '', '']);
  const [capturedQualities, setCapturedQualities] = useState<(number | null)[]>([null, null, null, null, null]);
  const [capturedStatuses, setCapturedStatuses] = useState<boolean[]>([false, false, false, false, false]);
  const [capturingIndex, setCapturingIndex] = useState<number | null>(null);
  
  const { captureFingerprint, isAvailable } = useGlobalRDService();
  
  const {
    previewState,
    showPreview,
    acceptPreview,
    rejectPreview,
    handleVisibilityChange
  } = useStableFingerprintPreview();

  const handleCapture = async (index: number) => {
    if (!isAvailable) {
      toast.error('Device not connected. Please connect the fingerprint device.');
      return;
    }

    try {
      setCapturingIndex(index);
      
      const result = await captureFingerprint();
      
      if (result && result.pidData && result.imageData) {
        // Process high-quality image data for PNG format
        const processedImageData = await processHighQualityImage(result.imageData);
        
        // Store captured data temporarily
        setCapturedImages(prev => {
          const updated = [...prev];
          updated[index] = processedImageData;
          return updated;
        });
        
        setCapturedQualities(prev => {
          const updated = [...prev];
          updated[index] = result.quality || 0;
          return updated;
        });

        // Show preview for user to accept/reject
        showPreview(index, processedImageData, result.quality || 0);
        
        toast.success(`${fingerNames[index]} captured successfully!`, {
          description: `Quality: ${result.quality || 0}% - High Quality PNG`
        });
        
        console.log(`📸 ${fingerNames[index]} captured:`, {
          quality: result.quality,
          templateSize: result.pidData.length,
          imageFormat: processedImageData.startsWith('data:image/png') ? 'PNG' : 'Unknown'
        });
      } else {
        toast.error('Failed to capture fingerprint. Please try again.');
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      toast.error('Failed to capture fingerprint. Please try again.');
    } finally {
      setCapturingIndex(null);
    }
  };

  // Process bitmap data to high-quality PNG format
  const processHighQualityImage = async (bitmapData: string): Promise<string> => {
    try {
      // If already in data URL format, return as is
      if (bitmapData.startsWith('data:image/')) {
        return bitmapData;
      }
      
      // Convert base64 bitmap to high-quality PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = bitmapData.startsWith('data:') ? bitmapData : `data:image/bmp;base64,${bitmapData}`;
      });
      
      // Set high resolution canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Apply image enhancement for better quality
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      
      // Apply contrast enhancement
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Enhance contrast and invert for better fingerprint visibility
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const enhanced = avg < 128 ? 0 : 255;
        data[i] = enhanced;     // Red
        data[i + 1] = enhanced; // Green  
        data[i + 2] = enhanced; // Blue
        // Alpha remains the same
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to high-quality PNG with maximum compression
      return canvas.toDataURL('image/png', 1.0);
      
    } catch (error) {
      console.error('Image processing error:', error);
      // Fallback to original data
      return bitmapData.startsWith('data:') ? bitmapData : `data:image/png;base64,${bitmapData}`;
    }
  };

  const handlePreviewAccept = useCallback(() => {
    const acceptedPreview = acceptPreview();
    if (acceptedPreview.fingerIndex !== null) {
      const index = acceptedPreview.fingerIndex;
      
      // Mark as captured and save data
      setCapturedStatuses(prev => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });
      
      // Call parent callbacks with the accepted data - use actual template data
      onFingerprintChange(index, `template_${index}_${Date.now()}`); // Placeholder template ID
      onImageChange(index, acceptedPreview.imageData);
      
      console.log(`✅ Finger ${index + 1} accepted and saved`);
    }
  }, [acceptPreview, onFingerprintChange, onImageChange]);

  const handlePreviewRecapture = useCallback(() => {
    const rejectedPreview = rejectPreview();
    if (rejectedPreview.fingerIndex !== null) {
      const index = rejectedPreview.fingerIndex;
      
      // Clear the captured data for recapture
      setCapturedImages(prev => {
        const updated = [...prev];
        updated[index] = '';
        return updated;
      });
      
      setCapturedQualities(prev => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      
      console.log(`🔄 Recapturing finger ${index + 1}`);
    }
  }, [rejectPreview]);

  return (
    <>
      <div className="grid grid-cols-5 gap-6">
        {fingerNames.map((fingerName, index) => {
          const isCapturing = capturingIndex === index;
          const isCaptured = capturedStatuses[index];
          const capturedImage = capturedImages[index];
          const quality = capturedQualities[index];
          
          return (
            <Card 
              key={index} 
              className={`relative transition-all duration-300 ${
                isCaptured 
                  ? 'border-green-300 bg-green-50/50' 
                  : isCapturing 
                  ? 'border-blue-300 bg-blue-50/50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{fingerName}</span>
                  {isCaptured && (
                    <Badge className="bg-green-500 text-white text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Captured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Fingerprint Preview */}
                <div className="aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                  {isCaptured && capturedImage ? (
                    <img 
                      src={capturedImage} 
                      alt={`${fingerName} fingerprint`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Fingerprint className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">Not captured</p>
                    </div>
                  )}
                </div>

                {/* Quality Score */}
                {quality && quality > 0 && (
                  <div className="text-center">
                    <Badge variant={quality >= 70 ? "default" : quality >= 50 ? "secondary" : "destructive"} className="text-xs">
                      Quality: {quality}%
                    </Badge>
                  </div>
                )}

                {/* Capture Button */}
                <Button
                  onClick={() => handleCapture(index)}
                  disabled={isCapturing || !isAvailable}
                  size="sm"
                  variant={isCaptured ? "outline" : "default"}
                  className="w-full"
                >
                  {isCapturing ? (
                    <>
                      <Fingerprint className="mr-2 h-3 w-3 animate-pulse" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-3 w-3" />
                      Capture
                    </>
                  )}
                </Button>

                {!isAvailable && (
                  <p className="text-xs text-red-500 text-center">Device not connected</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewState.isVisible && (
        <EnhancedFingerprintPreview
          fingerIndex={previewState.fingerIndex!}
          imageData={previewState.imageData}
          quality={previewState.quality}
          onAccept={handlePreviewAccept}
          onRecapture={handlePreviewRecapture}
          fingerName={fingerNames[previewState.fingerIndex!]}
          isVisible={previewState.isVisible}
          onVisibilityChange={handleVisibilityChange}
        />
      )}
    </>
  );
}