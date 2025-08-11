
import React, { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Fingerprint, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isLoading: authLoading } = useEnhancedAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already logged in
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Hero Section - Dark with Orange Accents */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-8 lg:p-12 xl:p-16">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-orange-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,_orange_0%,_transparent_50%)] opacity-10"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-lg mx-auto">
          {/* Large Branding Icon */}
          <div className="mb-12">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/25 mb-8">
              <Fingerprint className="w-16 h-16 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-white mb-2">
                Biometric
                <span className="text-orange-500">Hub</span>
              </h1>
              <div className="w-20 h-1 bg-orange-500 mx-auto rounded-full"></div>
            </div>
          </div>

          {/* Minimal Tagline */}
          <div className="space-y-6">
            <p className="text-2xl font-light text-gray-300 leading-relaxed">
              Enterprise Security
              <br />
              <span className="text-orange-400 font-medium">Authentication Platform</span>
            </p>
            
            {/* Security Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <Shield className="w-5 h-5 text-orange-400" />
              <span className="text-white/90 font-medium">Enterprise Grade Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Section - Dark Black */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-8 lg:p-12 xl:p-16">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/20 via-transparent to-orange-600/10"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_25%,_orange_0%,_transparent_50%)] opacity-10"></div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto">
          {/* Form Container */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-2xl shadow-black/20 p-8 lg:p-10 border border-white/10">
            {/* Form Header */}
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Welcome Back</h2>
              <p className="text-gray-300 text-lg">Sign in to your secure account</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-7">
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
                    className="pl-12 h-14 bg-white/10 border-white/20 focus:border-orange-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-orange-400/30"
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
                    className="pl-12 pr-12 h-14 bg-white/10 border-white/20 focus:border-orange-400 focus:bg-white/15 rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-orange-400/30"
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
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-lg">Authenticating...</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
