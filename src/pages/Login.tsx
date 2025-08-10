
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
    <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Left Hero Section */}
      <div className="flex-1 relative bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/8 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl mx-auto w-full">
          {/* Logo Section */}
          <div className="flex items-center gap-6 mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/25">
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-branded-gradient">BiometricHub</h1>
              <p className="text-lg text-muted-foreground font-medium mt-1">Enterprise Security Platform</p>
            </div>
          </div>

          {/* Hero Title */}
          <div className="space-y-8 mb-16">
            <h2 className="text-6xl font-bold text-foreground leading-tight">
              Enterprise
              <br />
              <span className="text-branded-gradient">Security Access</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Advanced biometric authentication platform designed for modern enterprises. 
              Secure user management, fingerprint capture, and comprehensive access control.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div className="group">
              <div className="flex items-start gap-5 p-6 bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Enterprise Security</h3>
                  <p className="text-muted-foreground">Bank-level encryption and compliance standards</p>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="flex items-start gap-5 p-6 bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 hover:border-secondary/20 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/5">
                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center group-hover:bg-secondary/15 transition-colors">
                  <Zap className="w-7 h-7 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Lightning Performance</h3>
                  <p className="text-muted-foreground">Instant biometric recognition and processing</p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-start gap-5 p-6 bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 hover:border-accent/20 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">User Management</h3>
                  <p className="text-muted-foreground">Complete administrative control and oversight</p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-start gap-5 p-6 bg-card/60 backdrop-blur-sm rounded-3xl border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">Modern Interface</h3>
                  <p className="text-muted-foreground">Intuitive design with advanced features</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="w-full max-w-2xl flex flex-col justify-center px-12 lg:px-16 xl:px-20 bg-card/40 backdrop-blur-xl border-l border-border/30">
        <div className="w-full max-w-md mx-auto">
          {/* Form Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-3">Welcome Back</h3>
            <p className="text-muted-foreground text-lg">Sign in to your secure account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-12 h-14 bg-background/70 border-border/60 focus:border-primary focus:bg-background transition-all duration-300 rounded-xl text-lg"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-12 pr-12 h-14 bg-background/70 border-border/60 focus:border-primary focus:bg-background transition-all duration-300 rounded-xl text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>Sign In Securely</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>
          </form>

          {/* Security Information */}
          <div className="mt-12 space-y-6">
            {/* Security Badge */}
            <div className="p-6 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="flex items-center justify-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Secure Authentication</span>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center leading-relaxed">
                Protected by enterprise-grade 256-bit SSL encryption, multi-factor authentication, 
                and advanced security protocols trusted by organizations worldwide.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
