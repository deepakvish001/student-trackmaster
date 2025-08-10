
import { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signUp, user, isLoading: authLoading } = useEnhancedAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error('Auth failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already logged in
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Premium Login Card */}
      <div className="w-full max-w-lg mx-4 premium-card p-10 animate-fade-in-up">
        <div className="space-y-8 text-center">
          {/* Premium Logo/Icon */}
          <div className="mx-auto space-y-4">
            <div className="w-20 h-20 bg-sunset-orange rounded-3xl flex items-center justify-center shadow-lg animate-bounce-in">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-branded-gradient">
                BiometricHub
              </h1>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <Sparkles className="w-6 h-6 text-vibrant-purple animate-pulse" />
              </div>
              <p className="text-lg text-muted-foreground max-w-sm mx-auto">
                {isSignUp 
                  ? 'Join the future of biometric management. Create your secure account now.' 
                  : 'Access your enterprise biometric management platform with enhanced security.'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 mt-8">
          {/* Premium Email Field */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-electric-blue uppercase tracking-wider">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-electric-blue group-focus-within:scale-110 transition-transform duration-300" />
              <Input
                type="email"
                placeholder="Enter your professional email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="modern-input pl-14 h-14 text-lg bg-muted/20 border-2 border-border/50 focus:border-electric-blue focus:bg-background transition-all duration-300"
              />
            </div>
          </div>

          {/* Premium Password Field */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-vibrant-purple uppercase tracking-wider">Secure Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-vibrant-purple group-focus-within:scale-110 transition-transform duration-300" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="modern-input pl-14 pr-14 h-14 text-lg bg-muted/20 border-2 border-border/50 focus:border-vibrant-purple focus:bg-background transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-vibrant-purple transition-all duration-300 hover:scale-110"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Premium Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-16 text-lg font-bold bg-sunset-orange hover:bg-sunset-orange/90 hover:scale-105 text-white rounded-2xl shadow-lg transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span>{isSignUp ? 'Create Premium Account' : 'Access Dashboard'}</span>
                <Sparkles className="w-5 h-5" />
              </div>
            )}
          </Button>

          {/* Premium Toggle Sign Up/Sign In */}
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full h-14 text-lg border-2 border-border/50 hover:border-electric-blue hover:bg-electric-blue/5 rounded-2xl transition-all duration-300" 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp 
              ? 'Already have an account? Sign in →' 
              : 'Need an account? Create one →'
            }
          </Button>
        </form>

        {/* Premium Features */}
        <div className="grid grid-cols-3 gap-4 text-center mt-10">
          <div className="p-4 bg-electric-blue/5 border border-electric-blue/20 rounded-2xl group hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-3 bg-electric-blue/10 border border-electric-blue/20 rounded-2xl flex items-center justify-center group-hover:bg-electric-blue group-hover:text-white transition-all duration-300">
              <Lock className="w-6 h-6 text-electric-blue group-hover:text-white" />
            </div>
            <p className="text-sm font-bold text-electric-blue">Enterprise Security</p>
            <p className="text-xs text-muted-foreground mt-1">256-bit encryption</p>
          </div>
          <div className="p-4 bg-vibrant-purple/5 border border-vibrant-purple/20 rounded-2xl group hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-3 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-2xl flex items-center justify-center group-hover:bg-vibrant-purple group-hover:text-white transition-all duration-300">
              <Sparkles className="w-6 h-6 text-vibrant-purple group-hover:text-white" />
            </div>
            <p className="text-sm font-bold text-vibrant-purple">Modern UI</p>
            <p className="text-xs text-muted-foreground mt-1">Intuitive design</p>
          </div>
          <div className="p-4 bg-emerald-green/5 border border-emerald-green/20 rounded-2xl group hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-3 bg-emerald-green/10 border border-emerald-green/20 rounded-2xl flex items-center justify-center group-hover:bg-emerald-green group-hover:text-white transition-all duration-300">
              <User className="w-6 h-6 text-emerald-green group-hover:text-white" />
            </div>
            <p className="text-sm font-bold text-emerald-green">Biometric Auth</p>
            <p className="text-xs text-muted-foreground mt-1">Future-ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}
