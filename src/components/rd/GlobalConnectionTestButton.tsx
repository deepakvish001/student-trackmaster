
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Settings, Info } from "lucide-react";
import { toast } from "sonner";
import { useGlobalRDService } from "@/contexts/GlobalRDServiceContext";

export function GlobalConnectionTestButton() {
  const {
    isAvailable,
    isChecking,
    error,
    deviceInfo,
    retryCount,
    lastCheckTime,
    checkConnection,
    resetConnection
  } = useGlobalRDService();

  const handleTestConnection = async () => {
    toast.info("Testing RD Service connection...", {
      description: "Checking device availability for all fingerprints"
    });
    
    try {
      await checkConnection();
      if (isAvailable) {
        toast.success("RD Service connected successfully!", {
          description: "All fingerprint captures are now available"
        });
      }
    } catch (error) {
      toast.error("Connection test failed", {
        description: "Please check device and service status"
      });
    }
  };

  const handleReset = async () => {
    toast.info("Resetting RD Service connection...", {
      description: "This will reset the connection for all fingerprints"
    });
    
    await resetConnection();
  };

  const getStatusColor = () => {
    if (isChecking) return "bg-yellow-500";
    return isAvailable ? "bg-green-500" : "bg-red-500";
  };

  const getStatusBadge = () => {
    if (isChecking) return <Badge variant="secondary">Checking...</Badge>;
    if (isAvailable) return <Badge className="bg-green-500 text-white">All Fingerprints Ready</Badge>;
    return <Badge variant="destructive">Service Unavailable</Badge>;
  };

  return (
    <Card className="w-full mb-6 border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>RD Service Status</span>
            {isAvailable ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-gray-600">
              {isChecking ? 'Checking connection...' : 
               isAvailable ? 'Connected and ready' : 
               'Disconnected'}
            </span>
          </div>
          
          {lastCheckTime && (
            <span className="text-xs text-gray-500">
              Last check: {lastCheckTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Device Information */}
        {deviceInfo && isAvailable && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded">
            <CheckCircle className="h-4 w-4" />
            <div>
              <div className="font-medium">Device Connected: {deviceInfo.dpId}</div>
              <div className="text-xs">All fingerprint captures are now available</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !isAvailable && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{error}</div>
                {retryCount > 0 && (
                  <div className="text-xs">
                    Connection attempts: {retryCount}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {!isAvailable && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">RD Service Setup Required:</p>
                <ul className="text-sm space-y-1 list-decimal list-inside">
                  <li>Install RD Service from device manufacturer</li>
                  <li>Connect your fingerprint scanner via USB</li>
                  <li>Start the RD Service (usually runs on port 11100)</li>
                  <li>Click "Test Connection" to verify setup</li>
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Once connected, all fingerprint captures will be available
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleTestConnection}
            disabled={isChecking}
            className="flex-1"
            size="lg"
          >
            <RefreshCw className={`mr-2 h-5 w-5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Testing Connection...' : 'Test Connection'}
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isChecking}
            className="flex-1"
            size="lg"
          >
            <Settings className="mr-2 h-4 w-4" />
            Reset Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
