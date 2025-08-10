
import { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Fingerprint, Shield, Zap, Users, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left Hero Section */}
      <div className="flex-1 relative bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex flex-col justify-center px-12 lg:px-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-branded-gradient">BiometricHub</h1>
              <p className="text-sm text-muted-foreground font-medium">Enterprise Platform</p>
            </div>
          </div>

          {/* Hero Title */}
          <div className="space-y-6 mb-12">
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              Secure Access
              <br />
              <span className="text-branded-gradient">Made Simple</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Advanced biometric authentication platform for modern enterprises. 
              Manage users, capture fingerprints, and secure your organization with cutting-edge technology.
            </p>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 bg-card/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">Bank-level encryption</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-card/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">Instant recognition</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">User Management</h3>
                <p className="text-sm text-muted-foreground">Complete control</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card/50 rounded-2xl border border-border/50">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Modern UI</h3>
                <p className="text-sm text-muted-foreground">Intuitive design</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="w-full max-w-md flex flex-col justify-center px-8 lg:px-12 bg-card/30 backdrop-blur-xl border-l border-border/50">
        <div className="w-full max-w-sm mx-auto">
          {/* Form Header */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h3>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-background/50 border-border focus:border-primary transition-all duration-300"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-12 bg-background/50 border-border focus:border-primary transition-all duration-300"
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
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Button>
          </form>

          {/* Security Badge */}
          <div className="mt-8 p-4 bg-card/50 rounded-xl border border-border/50 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">Secure Login</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Protected by 256-bit SSL encryption and enterprise-grade security protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
