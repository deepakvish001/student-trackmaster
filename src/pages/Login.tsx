import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Lock, Eye, EyeOff, Fingerprint, Shield, Wifi, WifiOff, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const { login, user, isLoading: authLoading } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const { pendingCount } = useOfflineSync();

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setShowInstallPrompt(false);
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast.error('Login requires an internet connection. Please check your network and try again.');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful! Welcome back.');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific authentication errors
      if (error?.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else if (error?.message?.includes('Email not confirmed')) {
        toast.error('Please confirm your email address before logging in.');
      } else if (error?.message?.includes('requested path is invalid')) {
        toast.error('Authentication configuration error. Please contact support.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already logged in
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left Hero Section - Dark with Orange Accents */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 min-h-[50vh] lg:min-h-full">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-orange-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,_orange_0%,_transparent_50%)] opacity-10"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-lg mx-auto">
          {/* Large Branding Icon */}
          <div className="mb-8 lg:mb-12">
            <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/25 mb-6 lg:mb-8">
              <Fingerprint className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white" />
            </div>
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                Biometric
                <span className="text-orange-500">Hub</span>
              </h1>
              <div className="w-16 sm:w-20 h-1 bg-orange-500 mx-auto rounded-full"></div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4 lg:space-y-6">
            <p className="text-lg sm:text-xl lg:text-2xl font-light text-gray-300 leading-relaxed">
              Enterprise Security
              <br />
              <span className="text-orange-400 font-medium">Authentication Platform</span>
            </p>
            
            {/* Feature Badges */}
            <div className="space-y-2 lg:space-y-3">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <Shield className="w-5 h-5 text-orange-400" />
                <span className="text-white/90 font-medium">Enterprise Grade Security</span>
              </div>
              
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white/90 font-medium">Works Offline</span>
              </div>
              
              {showInstallPrompt && (
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-orange-500/10 backdrop-blur-sm rounded-full border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-all duration-300" onClick={handleInstallPWA}>
                  <Download className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-400 font-medium">Install App</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Section - Dark Black */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 min-h-[50vh] lg:min-h-full">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/20 via-transparent to-orange-600/10"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_25%,_orange_0%,_transparent_50%)] opacity-10"></div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto">
          {/* Connection Status */}
          <div className="mb-6">
            <div className={`
              flex items-center justify-between p-4 rounded-xl border transition-all duration-300
              ${isOnline 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
              }
            `}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Offline</span>
                  </>
                )}
              </div>
              
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pending sync{pendingCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30 text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Login requires an internet connection. Please check your network connection.
              </AlertDescription>
            </Alert>
          )}

          {/* Form Container */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 lg:p-10 border border-white/10">
            {/* Form Header */}
            <div className="text-center mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 lg:mb-3">Welcome Back</h2>
              <p className="text-gray-300 text-base lg:text-lg">Sign in to your secure account</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-7">
              {/* Email Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-orange-400 group-focus-within:text-orange-300 transition-colors" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 h-12 sm:h-14 bg-white/10 border-white/20 focus:border-orange-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-orange-400/30 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-orange-400 group-focus-within:text-orange-300 transition-colors" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 pr-12 h-12 sm:h-14 bg-white/10 border-white/20 focus:border-orange-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-orange-400/30 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !isOnline}
                  className="w-full h-12 sm:h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-lg">Authenticating...</span>
                    </div>
                  ) : !isOnline ? (
                    <div className="flex items-center justify-center gap-3">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-lg">Offline - Login Unavailable</span>
                    </div>
                  ) : (
                    <span className="text-lg">Sign In Securely</span>
                  )}
                </Button>
              </div>
            </form>

            {/* Security Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-orange-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">256-bit SSL Encrypted</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your data is protected by enterprise-grade security protocols
                  <br />
                  and advanced encryption standards.
                </p>
              </div>
            </div>

            {/* PWA Features Info */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span>Works Offline</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span>Auto Sync</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span>PWA Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}