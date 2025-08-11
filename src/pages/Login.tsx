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
import loginHeroLogo from '@/assets/login-hero-logo.png';
import fingerprintLogo from '@/assets/fingerprint-logo.png';

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
      {/* Left Hero Section - Dark with Blue/Purple Gradients */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 min-h-[50vh] lg:min-h-screen">
        {/* Subtle Background Pattern - Cross-browser compatible */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-full" style={{
            background: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
          }}></div>
        </div>

        {/* Hero Content - Mobile Responsive */}
        <div className="relative z-10 text-center max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
          {/* Large Branding Icon with Custom Logo - Responsive Sizing */}
          <div className="mb-8 lg:mb-12">
            <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 mx-auto bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-xl lg:shadow-2xl shadow-blue-500/30 mb-6 lg:mb-8 border border-white/10 relative overflow-hidden">
              {/* Background glow effect - Performance optimized */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-600/20" style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
              <img 
                src={fingerprintLogo} 
                alt="SecureAuth Fingerprint" 
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain relative z-10"
                style={{ filter: 'drop-shadow(0 10px 8px rgb(0 0 0 / 0.04))' }}
                loading="eager"
              />
            </div>
            <div className="space-y-3 lg:space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                Secure
                <span className="text-blue-400">Auth</span>
              </h1>
              <div className="w-16 lg:w-20 h-0.5 lg:h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full"></div>
              <p className="text-lg sm:text-xl text-gray-300 font-light">Biometric Security Platform</p>
            </div>
          </div>

          {/* Features List - Mobile Optimized */}
          <div className="space-y-4 lg:space-y-6">
            <p className="text-lg sm:text-xl lg:text-2xl font-light text-gray-300 leading-relaxed">
              Next-Generation
              <br />
              <span className="text-blue-400 font-medium">Biometric Authentication</span>
            </p>
            
            {/* Feature Badges - Stack on Mobile */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 justify-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-sm sm:text-base">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                <span className="text-white/90 font-medium">Multi-Factor Security</span>
              </div>
              
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-sm sm:text-base">
                <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                <span className="text-white/90 font-medium">Fingerprint Authentication</span>
              </div>
              
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-sm sm:text-base">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-medium">Offline Capability</span>
              </div>
              
              {showInstallPrompt && (
                <div 
                  className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-all duration-300 text-sm sm:text-base" 
                  onClick={handleInstallPWA}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallPWA()}
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                  <span className="text-blue-400 font-medium">Install SecureAuth App</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Section - Mobile Responsive */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 min-h-[50vh] lg:min-h-screen">
        {/* Subtle Background Pattern - Cross-browser compatible */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-blue-500/20 via-transparent to-purple-600/10"></div>
          <div className="absolute top-0 right-0 w-full h-full" style={{
            background: 'radial-gradient(circle at 75% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
          }}></div>
        </div>

        <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto">
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
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-xl lg:shadow-2xl shadow-black/20 p-6 sm:p-8 lg:p-10 border border-white/10">
            {/* Form Header */}
            <div className="text-center mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">Welcome Back</h2>
              <p className="text-gray-300 text-base sm:text-lg">Sign in to your secure account</p>
            </div>

            {/* Login Form - Mobile Optimized */}
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-7">
              {/* Email Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 h-12 sm:h-14 bg-white/10 border-white/20 focus:border-blue-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400/30 text-base"
                    autoComplete="email"
                    autoCapitalize="none"
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
                    <Lock className="h-5 w-5 text-blue-400 group-focus-within:text-blue-300 transition-colors" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 pr-12 h-12 sm:h-14 bg-white/10 border-white/20 focus:border-blue-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400/30 text-base"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-400 transition-colors touch-manipulation"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button - Touch Optimized */}
              <div className="pt-3 sm:pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !isOnline}
                  className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg touch-manipulation text-base sm:text-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Authenticating...</span>
                    </div>
                  ) : !isOnline ? (
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Offline - Login Unavailable</span>
                    </div>
                  ) : (
                    <span>Sign In Securely</span>
                  )}
                </Button>
              </div>
            </form>

            {/* Security Footer - Mobile Optimized */}
            <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-white/10">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-blue-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">Enterprise-Grade Encryption</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your data is protected by enterprise-grade security protocols
                  <br />
                  and advanced encryption standards.
                </p>
              </div>
            </div>

            {/* PWA Features Info - Mobile Stack */}
            <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-white/10">
              <div className="text-center space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-gray-400">
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