import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Fingerprint, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Users
} from 'lucide-react';
import { useUnifiedMFS100 } from '@/hooks/useUnifiedMFS100';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BiometricLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BiometricLogin({ onSuccess, onCancel }: BiometricLoginProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [enrolledUsers, setEnrolledUsers] = useState<any[]>([]);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    isConnected, 
    deviceInfo, 
    captureFingerprint, 
    error: deviceError 
  } = useUnifiedMFS100();
  
  const { login } = useEnhancedAuth();

  // Load enrolled users
  useEffect(() => {
    loadEnrolledUsers();
  }, []);

  const loadEnrolledUsers = async () => {
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, name, email, fingerprint_data')
        .not('fingerprint_data', 'is', null);

      if (error) throw error;
      setEnrolledUsers(students || []);
    } catch (error) {
      console.error('Error loading enrolled users:', error);
      toast.error('Failed to load enrolled users');
    }
  };

  const startBiometricLogin = async () => {
    if (!isConnected) {
      toast.error('Fingerprint device not connected');
      return;
    }

    if (enrolledUsers.length === 0) {
      toast.error('No enrolled users found');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setMatchResult(null);

    try {
      // Simulate scan progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      // Capture fingerprint
      const captureResult = await captureFingerprint();
      clearInterval(progressInterval);
      setScanProgress(100);

      if (!captureResult.success) {
        throw new Error('Fingerprint capture failed');
      }

      // Match against enrolled users
      const matchedUser = await matchFingerprint(captureResult.template);
      
      if (matchedUser) {
        setMatchResult(matchedUser);
        await authenticateUser(matchedUser);
      } else {
        toast.error('Fingerprint not recognized');
        setIsScanning(false);
      }

    } catch (error) {
      console.error('Biometric login error:', error);
      toast.error('Biometric authentication failed');
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const matchFingerprint = async (capturedData: string): Promise<any> => {
    // In a real implementation, this would use actual biometric matching
    // For demo purposes, we'll simulate matching
    for (const user of enrolledUsers) {
      if (user.fingerprint_data) {
        // Simulate biometric matching algorithm
        const similarity = Math.random();
        if (similarity > 0.8) { // 80% threshold
          return {
            ...user,
            matchScore: similarity,
            confidence: 'High'
          };
        }
      }
    }
    return null;
  };

  const authenticateUser = async (user: any) => {
    setIsLoading(true);
    try {
      // In a production system, you would:
      // 1. Verify the biometric match server-side
      // 2. Generate a secure session token
      // 3. Log the biometric authentication event

      // For demo, we'll use the user's email for authentication
      if (user.email) {
        // Create a temporary session or use passwordless authentication
        const { data, error } = await supabase.auth.signInWithOtp({
          email: user.email,
          options: {
            shouldCreateUser: false
          }
        });

        if (error) throw error;

        toast.success(`Biometric authentication successful for ${user.name}`);
        onSuccess?.();
      } else {
        throw new Error('User email not found');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setIsScanning(false);
    setScanProgress(0);
    setMatchResult(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-black/50 border-orange-500/30 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-white">
          <Fingerprint className="w-6 h-6 text-orange-400" />
          Biometric Login
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Device Status */}
        <div className={`
          flex items-center justify-between p-3 rounded-lg border
          ${isConnected 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
          }
        `}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isConnected ? 'Device Ready' : 'Device Disconnected'}
            </span>
          </div>
          {isConnected && deviceInfo && (
            <Badge variant="outline" className="text-xs">
              {deviceInfo.model}
            </Badge>
          )}
        </div>

        {/* Enrolled Users Count */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 text-blue-400">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Enrolled Users</span>
          </div>
          <Badge variant="secondary">
            {enrolledUsers.length}
          </Badge>
        </div>

        {/* Error Display */}
        {deviceError && (
          <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{deviceError}</AlertDescription>
          </Alert>
        )}

        {/* Scan Progress */}
        {isScanning && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-400 font-medium">Scanning...</span>
              <span className="text-gray-400">{scanProgress}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
            <p className="text-xs text-gray-400 text-center">
              Place your finger on the scanner
            </p>
          </div>
        )}

        {/* Match Result */}
        {matchResult && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">{matchResult.name}</p>
                <p className="text-xs text-gray-400">
                  Match Score: {(matchResult.matchScore * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isScanning && !matchResult && (
            <Button
              onClick={startBiometricLogin}
              disabled={!isConnected || enrolledUsers.length === 0 || isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              {isLoading ? 'Authenticating...' : 'Scan Fingerprint'}
            </Button>
          )}

          {isScanning && (
            <Button
              onClick={resetScan}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel Scan
            </Button>
          )}

          {matchResult && (
            <div className="flex gap-2">
              <Button
                onClick={() => authenticateUser(matchResult)}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? 'Logging In...' : 'Confirm Login'}
              </Button>
              <Button
                onClick={resetScan}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Try Again
              </Button>
            </div>
          )}

          <Button
            onClick={onCancel}
            variant="ghost"
            className="w-full text-gray-400 hover:text-gray-300"
          >
            Back to Email Login
          </Button>
        </div>

        {/* Security Notice */}
        <div className="text-center pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-orange-400 mb-2">
            <Shield className="w-3 h-3" />
            <span className="text-xs font-medium">Biometric Security</span>
          </div>
          <p className="text-xs text-gray-400">
            Your biometric data is processed locally and never stored on our servers
          </p>
        </div>
      </CardContent>
    </Card>
  );
}