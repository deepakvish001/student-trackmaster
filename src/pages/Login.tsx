
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Main Login Card */}
      <div className="w-full max-w-md mx-4 modern-card p-8 animate-fade-in-up">
        <div className="space-y-6 text-center">
          {/* Logo/Icon */}
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-bounce-in">
            <User className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-geist font-bold text-gradient-primary flex items-center justify-center gap-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
              <Sparkles className="w-6 h-6 icon-primary animate-pulse" />
            </h1>
            <p className="text-muted-foreground font-geist">
              {isSignUp 
                ? 'Enter your details to create a new account and get started' 
                : 'Sign in to access your dashboard and manage your system'
              }
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-geist font-medium text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 icon-primary" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="modern-input pl-12 h-12"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-geist font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 icon-vibrant-purple" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="modern-input pl-12 pr-12 h-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 modern-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </Button>

          {/* Toggle Sign Up/Sign In */}
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full h-12 modern-button-outline" 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : 'Need an account? Sign up'
            }
          </Button>
        </form>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 text-center mt-8">
          <div className="p-3 glass rounded-xl">
            <div className="w-8 h-8 mx-auto mb-2 gradient-accent rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-geist text-muted-foreground">End-to-End Encrypted</p>
          </div>
          <div className="p-3 glass rounded-xl">
            <div className="w-8 h-8 mx-auto mb-2 gradient-warning rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-geist text-muted-foreground">Modern Interface</p>
          </div>
        </div>
      </div>
    </div>
  );
}
