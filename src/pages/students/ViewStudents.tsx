
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { StudentFingerprintView } from '@/components/StudentFingerprintView';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Shield, 
  Activity,
  Clock,
  TrendingUp,
  Database,
  Fingerprint,
  User,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Download
} from 'lucide-react';

export default function ViewStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students', searchTerm, selectedBatch],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            batch_name,
            batch_code
          )
        `)
        .eq('is_enabled', true);

      if (searchTerm) {
        query = query.or(`student_name.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`);
      }

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name, batch_code')
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    }
  });

  // Real-time statistics
  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.is_enabled).length,
    completeBiometrics: students.filter(s => [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5).length,
    recentAdditions: students.filter(s => {
      const createdDate = new Date(s.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length
  };

  const getSecurityLevel = (student: any) => {
    const fingerprintCount = [student.finger_1, student.finger_2, student.finger_3, student.finger_4, student.finger_5]
      .filter(Boolean).length;
    
    if (fingerprintCount === 5) return { level: 'HIGH', color: 'text-electric-blue bg-electric-blue/10 border-electric-blue/30' };
    if (fingerprintCount >= 3) return { level: 'MEDIUM', color: 'text-sunset-orange bg-sunset-orange/10 border-sunset-orange/30' };
    return { level: 'LOW', color: 'text-pink-rose bg-pink-rose/10 border-pink-rose/30' };
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Students...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Enhanced Header with Real-time Data */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-electric-blue via-emerald-green to-pink-rose bg-clip-text text-transparent">
                👥 Student Database
              </h1>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-electric-blue animate-pulse" />
                  <span className="font-mono text-electric-blue text-lg">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-emerald-green" />
                  <span className="text-emerald-green font-semibold">
                    Live Data: {stats.totalStudents} Records
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 shadow-glow"
              >
                <Database className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                variant="outline"
                className="glass border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
          </div>

          {/* Real-time Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wider">Total Students</p>
                    <p className="text-4xl font-bold text-electric-blue">{stats.totalStudents}</p>
                    <p className="text-sm text-muted-foreground">In Database</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-electric-blue/20">
                    <Users className="h-8 w-8 text-electric-blue" />
                  </div>
                </div>
                <Progress value={100} className="mt-4 h-2 bg-electric-blue" />
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wider">Active Students</p>
                    <p className="text-4xl font-bold text-emerald-green">{stats.activeStudents}</p>
                    <p className="text-sm text-muted-foreground">Currently Active</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-green/20">
                    <Activity className="h-8 w-8 text-emerald-green" />
                  </div>
                </div>
                <Progress value={(stats.activeStudents / stats.totalStudents) * 100} className="mt-4 h-2 bg-emerald-green" />
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wider">Complete Biometrics</p>
                    <p className="text-4xl font-bold text-sunset-orange">{stats.completeBiometrics}</p>
                    <p className="text-sm text-muted-foreground">5/5 Fingerprints</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sunset-orange/20">
                    <Fingerprint className="h-8 w-8 text-sunset-orange" />
                  </div>
                </div>
                <Progress value={(stats.completeBiometrics / stats.totalStudents) * 100} className="mt-4 h-2 bg-sunset-orange" />
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wider">This Week</p>
                    <p className="text-4xl font-bold text-pink-rose">{stats.recentAdditions}</p>
                    <p className="text-sm text-muted-foreground">New Additions</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-pink-rose/20">
                    <TrendingUp className="h-8 w-8 text-pink-rose" />
                  </div>
                </div>
                <Progress value={(stats.recentAdditions / stats.totalStudents) * 100} className="mt-4 h-2 bg-pink-rose" />
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Search and Filters */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue" />
                  <Input
                    placeholder="🔍 Search students by name or mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base font-medium"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="pl-12 pr-8 py-3 glass bg-surface-darker border-emerald-green/30 text-foreground rounded-lg focus:border-emerald-green focus:ring-emerald-green/20 h-12 text-base font-medium min-w-[200px]"
                  >
                    <option value="all">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_name} ({batch.batch_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Students Display */}
          {students.length === 0 ? (
            <Card className="glass-card border-pink-rose/20 text-center p-12">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-pink-rose/20 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-12 w-12 text-pink-rose" />
                </div>
                <h3 className="text-2xl font-bold text-pink-rose">No Students Found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria or add new students.</p>
              </div>
            </Card>
          ) : (
            <div className={`grid gap-6 ${viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'}`}>
              {students.map((student) => {
                const security = getSecurityLevel(student);
                const fingerprintCount = [student.finger_1, student.finger_2, student.finger_3, student.finger_4, student.finger_5]
                  .filter(Boolean).length;

                return (
                  <Card 
                    key={student.id} 
                    className="glass-card border-foreground/10 hover-lift hover-glow interactive-card cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-vibrant-purple rounded-xl flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground font-bold">{student.student_name}</CardTitle>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {student.mobile}
                            </p>
                          </div>
                        </div>
                        <Badge className={`font-bold px-3 py-1 ${security.color} border`}>
                          {security.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {student.batches && (
                          <div className="flex items-center space-x-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-emerald-green" />
                            <span className="text-emerald-green font-semibold">{student.batches.batch_name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-sunset-orange" />
                          <span className="text-sunset-orange">
                            {new Date(student.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Fingerprint className="h-4 w-4 text-vibrant-purple" />
                            <span className="text-sm text-vibrant-purple font-semibold">
                              {fingerprintCount}/5 Fingerprints
                            </span>
                          </div>
                          <Progress value={(fingerprintCount / 5) * 100} className="w-20 h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Enhanced Student Detail Modal */}
          {selectedStudent && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="glass-card border-foreground/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader className="bg-gradient-to-r from-electric-blue/10 via-emerald-green/10 to-pink-rose/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-vibrant-purple rounded-2xl flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl text-foreground font-bold">{selectedStudent.student_name}</CardTitle>
                        <p className="text-lg text-muted-foreground">Student Profile</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedStudent(null)}
                      variant="ghost"
                      className="text-foreground hover:bg-foreground/10"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Student Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-electric-blue flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Personal Information
                      </h3>
                      <div className="space-y-3 glass-card p-4 border-electric-blue/20">
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-emerald-green" />
                          <span className="text-foreground font-medium">{selectedStudent.mobile}</span>
                        </div>
                        {selectedStudent.email && (
                          <div className="flex items-center space-x-3">
                            <Mail className="h-4 w-4 text-sunset-orange" />
                            <span className="text-foreground font-medium">{selectedStudent.email}</span>
                          </div>
                        )}
                        {selectedStudent.address && (
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-4 w-4 text-pink-rose" />
                            <span className="text-foreground font-medium">{selectedStudent.address}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-vibrant-purple" />
                          <span className="text-foreground font-medium">
                            Enrolled: {new Date(selectedStudent.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-emerald-green flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Security Status
                      </h3>
                      <div className="space-y-3 glass-card p-4 border-emerald-green/20">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">Security Level:</span>
                          <Badge className={`${getSecurityLevel(selectedStudent).color} font-bold`}>
                            {getSecurityLevel(selectedStudent).level}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">Biometric Status:</span>
                          <span className="text-emerald-green font-semibold">
                            {[selectedStudent.finger_1, selectedStudent.finger_2, selectedStudent.finger_3, selectedStudent.finger_4, selectedStudent.finger_5]
                              .filter(Boolean).length}/5 Complete
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">Account Status:</span>
                          <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fingerprint Data */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-sunset-orange flex items-center">
                      <Fingerprint className="h-5 w-5 mr-2" />
                      Biometric Data
                    </h3>
                    <div className="glass-card p-6 border-sunset-orange/20">
                      <StudentFingerprintView student={selectedStudent} showQuality={true} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
