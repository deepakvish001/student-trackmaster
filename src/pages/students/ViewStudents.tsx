import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Shield, 
  Activity,
  Clock,
  TrendingUp,
  Database,
  Fingerprint,
  User,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';

export default function ViewStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortBy, setSortBy] = useState<'student_name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students', searchTerm, selectedBatch, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            batch_name
          )
        `)
        .eq('is_enabled', true);

      if (searchTerm) {
        query = query.ilike('student_name', `%${searchTerm}%`);
      }

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    }
  });

  // Real-time statistics
  const stats = {
    totalStudents: students.length,
    completeBiometrics: students.filter(s => [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 5).length,
    partialBiometrics: students.filter(s => {
      const count = [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length;
      return count > 0 && count < 5;
    }).length,
    noBiometrics: students.filter(s => [s.finger_1, s.finger_2, s.finger_3, s.finger_4, s.finger_5].filter(Boolean).length === 0).length
  };

  const getSecurityBadge = (student: any) => {
    const fingerprintCount = [student.finger_1, student.finger_2, student.finger_3, student.finger_4, student.finger_5]
      .filter(Boolean).length;
    
    if (fingerprintCount === 5) 
      return <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30 font-bold">SECURE</Badge>;
    if (fingerprintCount >= 3) 
      return <Badge className="bg-sunset-orange/20 text-sunset-orange border-sunset-orange/30 font-bold">PARTIAL</Badge>;
    if (fingerprintCount > 0) 
      return <Badge className="bg-pink-rose/20 text-pink-rose border-pink-rose/30 font-bold">LIMITED</Badge>;
    return <Badge className="bg-muted/20 text-muted-foreground border-muted/30 font-bold">NONE</Badge>;
  };

  const getCompletionPercentage = (student: any) => {
    const fingerprintCount = [student.finger_1, student.finger_2, student.finger_3, student.finger_4, student.finger_5]
      .filter(Boolean).length;
    return (fingerprintCount / 5) * 100;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Student Data...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background">
        <div className="space-y-8 p-6 animate-fade-in-up">
          {/* Enhanced Header */}
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
                  <Database className="h-5 w-5 text-emerald-green" />
                  <span className="text-emerald-green font-semibold">
                    {stats.totalStudents} Active Students
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-sunset-orange" />
                  <span className="text-sunset-orange font-semibold">
                    {stats.completeBiometrics} Secured
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 shadow-glow"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 shadow-green-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <Button
                variant="outline"
                className="glass border-sunset-orange/30 text-sunset-orange hover:bg-sunset-orange/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Real-time Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wide">Complete Security</p>
                    <p className="text-3xl font-bold text-electric-blue">{stats.completeBiometrics}</p>
                    <div className="text-xs text-muted-foreground">
                      {stats.totalStudents > 0 ? Math.round((stats.completeBiometrics / stats.totalStudents) * 100) : 0}% of total
                    </div>
                  </div>
                  <Fingerprint className="h-8 w-8 text-electric-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wide">Partial Security</p>
                    <p className="text-3xl font-bold text-sunset-orange">{stats.partialBiometrics}</p>
                    <div className="text-xs text-muted-foreground">
                      {stats.totalStudents > 0 ? Math.round((stats.partialBiometrics / stats.totalStudents) * 100) : 0}% of total
                    </div>
                  </div>
                  <Shield className="h-8 w-8 text-sunset-orange" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wide">Needs Attention</p>
                    <p className="text-3xl font-bold text-pink-rose">{stats.noBiometrics}</p>
                    <div className="text-xs text-muted-foreground">
                      {stats.totalStudents > 0 ? Math.round((stats.noBiometrics / stats.totalStudents) * 100) : 0}% of total
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wide">Total Students</p>
                    <p className="text-3xl font-bold text-emerald-green">{stats.totalStudents}</p>
                    <div className="text-xs text-muted-foreground">
                      Active in system
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Search and Filter Section */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-electric-blue">Search Students</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue" />
                    <Input
                      placeholder="🔍 Search by student name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-green">Filter by Batch</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="pl-12 pr-8 py-3 glass bg-surface-darker border-emerald-green/30 text-foreground rounded-lg focus:border-emerald-green h-12 min-w-[200px]"
                    >
                      <option value="all">All Batches</option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-sunset-orange">Sort By</label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as any);
                      setSortOrder(order as any);
                    }}
                    className="px-4 py-3 glass bg-surface-darker border-sunset-orange/30 text-foreground rounded-lg focus:border-sunset-orange h-12 min-w-[160px]"
                  >
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                    <option value="student_name-asc">Name A-Z</option>
                    <option value="student_name-desc">Name Z-A</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Student Grid */}
          {students.length === 0 ? (
            <Card className="glass-card border-pink-rose/20 text-center p-16">
              <div className="space-y-6">
                <div className="w-24 h-24 bg-pink-rose/20 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-12 w-12 text-pink-rose" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-pink-rose mb-2">No Students Found</h3>
                  <p className="text-muted-foreground text-lg">Try adjusting your search criteria or add new students.</p>
                </div>
                <Button className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 shadow-green-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Student
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {students.map((student) => {
                const completionPercentage = getCompletionPercentage(student);
                
                return (
                  <Card key={student.id} className="glass-card border-foreground/10 hover-lift hover-glow interactive-card overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-electric-blue/10 via-emerald-green/10 to-pink-rose/10 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-vibrant-purple rounded-xl flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground font-bold">{student.student_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">ID: {student.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        {getSecurityBadge(student)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-3">
                        {student.batches && (
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4 text-emerald-green" />
                            <span className="text-sm text-emerald-green font-semibold">{student.batches.batch_name}</span>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground font-medium">Biometric Progress</span>
                            <span className="text-sm font-bold text-electric-blue">
                              {Math.round(completionPercentage)}%
                            </span>
                          </div>
                          <div className="w-full bg-surface-darker/50 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-electric-blue to-emerald-green h-2 rounded-full transition-all duration-500"
                              style={{ width: `${completionPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {[student.finger_1, student.finger_2, student.finger_3, student.finger_4, student.finger_5]
                              .filter(Boolean).length} / 5 fingerprints captured
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-sunset-orange" />
                            <span className="text-muted-foreground">Enrolled:</span>
                          </div>
                          <span className="text-sunset-orange font-medium">
                            {new Date(student.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <div className="px-6 pb-6">
                      <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
                        <Button size="sm" variant="outline" className="glass border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="glass border-emerald-green/30 text-emerald-green hover:bg-emerald-green/10">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="glass border-sunset-orange/30 text-sunset-orange hover:bg-sunset-orange/10">
                          <Fingerprint className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="glass border-pink-rose/30 text-pink-rose hover:bg-pink-rose/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
