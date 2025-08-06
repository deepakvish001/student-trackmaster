import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Fingerprint, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AutoRecoveryResult {
  success: boolean;
  template: string;
  imageData: string;
  quality: number;
  message: string;
  workingPort?: number;
}

interface ServicePort {
  port: number;
  protocol: 'http' | 'https';
  description: string;
}

const SERVICE_PORTS: ServicePort[] = [
  { port: 8003, protocol: 'http', description: 'Standard HTTP' },
  { port: 8003, protocol: 'https', description: 'Standard HTTPS' },
  { port: 11100, protocol: 'http', description: 'Alternative HTTP' },
  { port: 11100, protocol: 'https', description: 'Alternative HTTPS' },
  { port: 9000, protocol: 'http', description: 'Legacy HTTP' },
  { port: 8080, protocol: 'http', description: 'Fallback HTTP' }
];

export function AutoRecoveryMFS100Capture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastResult, setLastResult] = useState<AutoRecoveryResult | null>(null);
  const [currentPort, setCurrentPort] = useState<ServicePort | null>(null);
  const [discoveredPort, setDiscoveredPort] = useState<ServicePort | null>(null);

  const testService = async (servicePort: ServicePort): Promise<boolean> => {
    try {
      const baseUrl = `${servicePort.protocol}://localhost:${servicePort.port}/mfs100`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${baseUrl}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.ErrorCode === "0";

    } catch (error) {
      return false;
    }
  };

  const captureWithService = async (servicePort: ServicePort): Promise<AutoRecoveryResult> => {
    const baseUrl = `${servicePort.protocol}://localhost:${servicePort.port}/mfs100`;
    
    try {
      console.log(`🔍 Trying ${servicePort.description} (${baseUrl})`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const response = await fetch(`${baseUrl}/capture`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Quality: 60,
          TimeOut: 15
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.ErrorCode === "0") {
        console.log(`✅ Success with ${servicePort.description}, Quality: ${data.Quality}`);
        
        return {
          success: true,
          template: data.IsoTemplate || '',
          imageData: data.BitmapData || '',
          quality: data.Quality || 0,
          message: `Captured with ${servicePort.description} - Quality ${data.Quality}%`,
          workingPort: servicePort.port
        };
      } else {
        throw new Error(data.ErrorDescription || 'Capture failed');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`❌ Failed with ${servicePort.description}:`, message);
      
      return {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: `${servicePort.description}: ${message}`,
        workingPort: servicePort.port
      };
    }
  };

  const autoDiscoverAndCapture = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setLastResult(null);
    setCurrentPort(null);

    try {
      console.log('🔍 Starting auto-discovery for MFS100 service...');
      toast.info('Discovering MFS100 service...');

      // If we already know a working port, try it first
      if (discoveredPort) {
        console.log(`🎯 Trying known working port ${discoveredPort.port}...`);
        setCurrentPort(discoveredPort);
        
        const result = await captureWithService(discoveredPort);
        if (result.success) {
          setLastResult(result);
          toast.success(result.message);
          return;
        }
        
        // Working port failed, reset and try all ports
        setDiscoveredPort(null);
      }

      // Try each service configuration
      for (const servicePort of SERVICE_PORTS) {
        if (!isCapturing) break; // Check if cancelled
        
        setCurrentPort(servicePort);
        
        // First test if service is available
        const isAvailable = await testService(servicePort);
        if (!isAvailable) {
          console.log(`⚠️ ${servicePort.description} not available`);
          continue;
        }
        
        console.log(`✅ ${servicePort.description} is available, attempting capture...`);
        
        // Try capture
        const result = await captureWithService(servicePort);
        setLastResult(result);
        
        if (result.success) {
          setDiscoveredPort(servicePort);
          toast.success(`Found working service: ${servicePort.description}`);
          return;
        }
      }

      // No working service found
      const failureResult: AutoRecoveryResult = {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: 'No working MFS100 service found on any port. Please ensure the MFS100 service is running.'
      };
      
      setLastResult(failureResult);
      toast.error('No MFS100 service found');

    } catch (error) {
      const errorResult: AutoRecoveryResult = {
        success: false,
        template: '',
        imageData: '',
        quality: 0,
        message: error instanceof Error ? error.message : 'Auto-discovery failed'
      };
      
      setLastResult(errorResult);
      toast.error('Auto-discovery failed');

    } finally {
      setIsCapturing(false);
      setCurrentPort(null);
    }
  }, [isCapturing, discoveredPort]);

  const cancelCapture = useCallback(() => {
    setIsCapturing(false);
    setCurrentPort(null);
    toast.info('Capture cancelled');
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Auto-Recovery Fingerprint Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        {discoveredPort && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Working service found: {discoveredPort.description} (Port {discoveredPort.port})
            </AlertDescription>
          </Alert>
        )}

        {/* Current Operation */}
        {currentPort && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Testing {currentPort.description} (Port {currentPort.port})...
            </AlertDescription>
          </Alert>
        )}

        {/* Capture Button */}
        <div className="flex gap-2">
          <Button
            onClick={autoDiscoverAndCapture}
            disabled={isCapturing}
            className="flex-1"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Fingerprint className="h-4 w-4 mr-2" />
            )}
            {isCapturing ? 'Discovering...' : 'Capture Fingerprint'}
          </Button>
          
          {isCapturing && (
            <Button
              variant="outline"
              onClick={cancelCapture}
              className="px-3"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Reset Discovery */}
        {discoveredPort && !isCapturing && (
          <Button
            variant="outline"
            onClick={() => setDiscoveredPort(null)}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Service Discovery
          </Button>
        )}

        {/* Results */}
        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            {lastResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {lastResult.message}
              {lastResult.success && (
                <div className="mt-2 text-xs opacity-75">
                  Template: {lastResult.template ? '✓ Available' : '✗ Missing'}<br />
                  Image: {lastResult.imageData ? '✓ Available' : '✗ Missing'}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Fingerprint Preview */}
        {lastResult?.success && lastResult.imageData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Captured Fingerprint:</h4>
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={`data:image/bmp;base64,${lastResult.imageData}`}
                alt="Captured Fingerprint"
                className="w-full h-auto max-w-[200px] mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        )}

        {/* Service Discovery Info */}
        <div className="text-xs text-muted-foreground">
          <p>This component automatically tries:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {SERVICE_PORTS.map((port, index) => (
              <li key={index}>
                {port.protocol}://localhost:{port.port} ({port.description})
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}