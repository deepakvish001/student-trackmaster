import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Download, AlertCircle } from 'lucide-react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, isUpdating, updateServiceWorker } = usePWAUpdate();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/5 backdrop-blur-lg shadow-xl border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-sm text-blue-100">Update Available</h4>
              </div>
              
              <p className="text-xs text-gray-300 mb-3">
                A new version of SecureAuth is ready with improved features and bug fixes.
              </p>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={updateServiceWorker}
                  disabled={isUpdating}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 border-blue-500/30"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-1" />
                      Update Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}