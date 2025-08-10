import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';

interface SDKStatus {
  sdkLoaded: boolean;
  functions: {
    GetMFS100Info: boolean;
    CaptureFinger: boolean;
    jQuery: boolean;
  };
  deviceInfo: any;
  lastCheck: Date;
}

export function MFS100Debug() {
  const [status, setStatus] = useState<SDKStatus>({
    sdkLoaded: false,
    functions: {
      GetMFS100Info: false,
      CaptureFinger: false,
      jQuery: false
    },
    deviceInfo: null,
    lastCheck: new Date()
  });

  const checkSDKStatus = () => {
    console.log('🔍 Checking MFS100 SDK Status...');
    
    const newStatus: SDKStatus = {
      sdkLoaded: false,
      functions: {
        GetMFS100Info: typeof window.GetMFS100Info === 'function',
        CaptureFinger: typeof window.CaptureFinger === 'function',
        jQuery: typeof window.$ === 'function'
      },
      deviceInfo: null,
      lastCheck: new Date()
    };

    newStatus.sdkLoaded = newStatus.functions.GetMFS100Info && newStatus.functions.CaptureFinger;

    // Try to get device info if SDK is loaded
    if (newStatus.sdkLoaded) {
      try {
        const deviceResponse = window.GetMFS100Info();
        console.log('📱 Device Response:', deviceResponse);
        newStatus.deviceInfo = deviceResponse;
      } catch (error) {
        console.error('❌ Device info error:', error);
      }
    }

    setStatus(newStatus);
  };

  const testCapture = async () => {
    if (!status.sdkLoaded) {
      alert('SDK not loaded!');
      return;
    }

    try {
      console.log('🧪 Testing capture function...');
      const result = window.CaptureFinger(70, 10);
      console.log('🧪 Capture result:', result);
      alert(`Capture test completed. Check console for details.`);
    } catch (error) {
      console.error('❌ Capture test error:', error);
      alert(`Capture test failed: ${error}`);
    }
  };

  useEffect(() => {
    // Initial check
    checkSDKStatus();

    // Check periodically
    const interval = setInterval(checkSDKStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-electric-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-electric-blue" />
          <span>MFS100 SDK Debug Panel</span>
          <Badge variant={status.sdkLoaded ? "default" : "destructive"}>
            {status.sdkLoaded ? "SDK Loaded" : "SDK Missing"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SDK Functions Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(status.functions).map(([name, available]) => (
            <div key={name} className="flex items-center space-x-2 p-3 rounded-lg border">
              {available ? (
                <CheckCircle className="h-5 w-5 text-emerald-green" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">{name}</span>
            </div>
          ))}
        </div>

        {/* Device Information */}
        {status.deviceInfo && (
          <Alert className="border-emerald-green/30 bg-emerald-green/10">
            <CheckCircle className="h-4 w-4 text-emerald-green" />
            <AlertDescription>
              <strong>Device Connected:</strong>
              <br />
              Status: {status.deviceInfo.httpStaus ? '✅ Connected' : '❌ Not Connected'}
              {status.deviceInfo.err && (
                <>
                  <br />
                  Error: {status.deviceInfo.err}
                </>
              )}
              {status.deviceInfo.data && (
                <>
                  <br />
                  Error Code: {status.deviceInfo.data.ErrorCode}
                  <br />
                  Description: {status.deviceInfo.data.ErrorDescription}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* SDK Not Loaded Warning */}
        {!status.sdkLoaded && (
          <Alert className="border-destructive/30 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <strong>MFS100 SDK Not Loaded</strong>
              <br />
              • Make sure MFS100 RD Service is installed
              <br />
              • Verify the device is connected via USB
              <br />
              • Check if the mfs100-9.0.2.6.js file is accessible
              <br />
              • Try refreshing the page
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button onClick={checkSDKStatus} variant="outline">
            Refresh Status
          </Button>
          <Button 
            onClick={testCapture} 
            disabled={!status.sdkLoaded}
            className="bg-electric-blue hover:bg-electric-blue/90"
          >
            Test Capture
          </Button>
        </div>

        {/* Last Check Time */}
        <div className="text-sm text-muted-foreground">
          Last checked: {status.lastCheck.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}