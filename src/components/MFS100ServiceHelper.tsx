
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Settings, 
  Play, 
  Info,
  ExternalLink,
  Copy,
  Terminal
} from "lucide-react";
import { toast } from "sonner";
import { useServiceManager } from "@/hooks/useServiceManager";

interface MFS100ServiceHelperProps {
  onServiceReady?: () => void;
}

export function MFS100ServiceHelper({ onServiceReady }: MFS100ServiceHelperProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  const {
    isServiceRunning,
    serviceMessage,
    isChecking,
    startupResult,
    showInstructions,
    checkService,
    recoverService,
    hideInstructions,
    reset,
    retryCount,
    commonPaths
  } = useServiceManager();

  const handleRecoverService = async () => {
    toast.loading("Checking MFS100 service...", { id: "service-check" });
    
    try {
      const result = await recoverService();
      
      if (result.success) {
        toast.success("MFS100 service is ready!", { id: "service-check" });
        onServiceReady?.();
      } else {
        toast.error("Service needs manual start", { id: "service-check" });
      }
    } catch (error) {
      toast.error("Failed to check service", { id: "service-check" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const openServiceUrl = () => {
    window.open("https://localhost:8003/mfs100/info", "_blank");
  };

  if (isServiceRunning) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>MFS100 Service Ready</span>
            <Badge className="bg-green-500 text-white">Connected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-green-700">{serviceMessage}</p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openServiceUrl}
                className="border-green-300"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Test Service
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkService()}
                disabled={isChecking}
                className="border-green-300"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                Recheck
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Service Status */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>{serviceMessage}</span>
              <Badge variant="destructive">
                {retryCount > 0 ? `${retryCount} attempts` : 'Disconnected'}
              </Badge>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleRecoverService}
                disabled={isChecking}
                size="sm"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Start Service Check'}
              </Button>
              
              <Button
                onClick={reset}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              
              <Button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                size="sm"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Service Startup Instructions */}
      {showInstructions && startupResult?.instructions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-blue-800">
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>MFS100 Service Setup Required</span>
              </div>
              <Button
                onClick={hideInstructions}
                size="sm"
                variant="ghost"
                className="text-blue-600"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded border text-sm font-mono">
              {startupResult.instructions.map((instruction, index) => (
                <div key={index} className="mb-1">
                  {instruction}
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => copyToClipboard(startupResult.instructions?.join('\n') || '')}
                size="sm"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Instructions
              </Button>
              
              <Button
                onClick={openServiceUrl}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Test Service URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      {showTechnicalDetails && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <Terminal className="h-5 w-5" />
              <span>Technical Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Service URL:</strong>
                <br />
                <code className="bg-gray-100 p-1 rounded">https://localhost:8003</code>
              </div>
              <div>
                <strong>Status:</strong>
                <br />
                <Badge variant={isServiceRunning ? "default" : "destructive"}>
                  {isServiceRunning ? 'Running' : 'Stopped'}
                </Badge>
              </div>
            </div>
            
            <div>
              <strong>Common Installation Paths:</strong>
              <div className="mt-2 space-y-1">
                {commonPaths.map((path, index) => (
                  <div key={index} className="text-xs bg-gray-100 p-2 rounded font-mono">
                    {path}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600">
                💡 <strong>Pro Tip:</strong> Add MFS100Service.exe to Windows Startup to avoid manual starts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
