
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { BatchCRUD } from '@/components/batches/BatchCRUD';
import { 
  GraduationCap, 
  Users, 
  Search, 
  Filter, 
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  Database,
  BookOpen,
  Target,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface Batch {
  id: string;
  batch_name: string;
  serial_number: string;
  admin_name: string;
  username: string;
  max_students: number;
  created_at: string;
  is_enabled: boolean;
  student_count?: number;
}

export default function Batches() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ['batches', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase.from('batches').select('*');

      if (searchTerm) {
        query = query.or(`batch_name.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_enabled', statusFilter === 'active');
      }

      const { data: batchData, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }

      // Get student count for each batch
      const batchesWithCounts = await Promise.all(
        (batchData || []).map(async (batch) => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('batch_id', batch.id)
            .eq('is_enabled', true);
          
          return {
            ...batch,
            student_count: count || 0
          };
        })
      );

      return batchesWithCounts;
    },
    refetchInterval: 30000
  });

  // Real-time statistics
  const stats = {
    totalBatches: batches.length,
    activeBatches: batches.filter(b => b.is_enabled).length,
    totalCapacity: batches.reduce((sum, b) => sum + b.max_students, 0),
    totalStudents: batches.reduce((sum, b) => sum + (b.student_count || 0), 0),
    utilizationRate: batches.length > 0 
      ? Math.round((batches.reduce((sum, b) => sum + (b.student_count || 0), 0) / 
          batches.reduce((sum, b) => sum + b.max_students, 0)) * 100) 
      : 0
  };

  const getUtilizationColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-pink-rose';
    if (percentage >= 70) return 'text-sunset-orange';
    if (percentage >= 50) return 'text-electric-blue';
    return 'text-emerald-green';
  };

  const getUtilizationBadge = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return <Badge className="bg-pink-rose/20 text-pink-rose border-pink-rose/30">Full</Badge>;
    if (percentage >= 70) return <Badge className="bg-sunset-orange/20 text-sunset-orange border-sunset-orange/30">High</Badge>;
    if (percentage >= 50) return <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">Medium</Badge>;
    return <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30">Low</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Batches...</div>
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
                🎓 Batch Management
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
                    {stats.totalBatches} Total Batches
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-sunset-orange" />
                  <span className="text-sunset-orange font-semibold">
                    {stats.utilizationRate}% Utilized
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
              <BatchCRUD batches={batches} />
            </div>
          </div>

          {/* Real-time Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wide">Total Batches</p>
                    <p className="text-3xl font-bold text-electric-blue">{stats.totalBatches}</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-electric-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wide">Active Batches</p>
                    <p className="text-3xl font-bold text-emerald-green">{stats.activeBatches}</p>
                  </div>
                  <Activity className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wide">Total Capacity</p>
                    <p className="text-3xl font-bold text-sunset-orange">{stats.totalCapacity}</p>
                  </div>
                  <Target className="h-8 w-8 text-sunset-orange" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wide">Enrolled Students</p>
                    <p className="text-3xl font-bold text-pink-rose">{stats.totalStudents}</p>
                  </div>
                  <Users className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-vibrant-purple/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-vibrant-purple font-bold uppercase tracking-wide">Utilization</p>
                    <p className="text-3xl font-bold text-vibrant-purple">{stats.utilizationRate}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-vibrant-purple" />
                </div>
                <Progress value={stats.utilizationRate} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Search and Filters */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-electric-blue">Search Batches</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue" />
                    <Input
                      placeholder="🔍 Search by batch name or serial number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-green">Filter by Status</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-12 pr-8 py-3 glass bg-surface-darker border-emerald-green/30 text-foreground rounded-lg focus:border-emerald-green h-12 min-w-[200px]"
                    >
                      <option value="all">All Batches</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Batch Grid */}
          {batches.length === 0 ? (
            <Card className="glass-card border-pink-rose/20 text-center p-16">
              <div className="space-y-6">
                <div className="w-24 h-24 bg-pink-rose/20 rounded-full flex items-center justify-center mx-auto">
                  <GraduationCap className="h-12 w-12 text-pink-rose" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-pink-rose mb-2">No Batches Found</h3>
                  <p className="text-muted-foreground text-lg">Create your first batch to get started with student management.</p>
                </div>
                <BatchCRUD batches={[]} />
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {batches.map((batch) => {
                const utilizationPercentage = (batch.student_count! / batch.max_students) * 100;
                
                return (
                  <Card 
                    key={batch.id} 
                    className="glass-card border-foreground/10 hover-lift hover-glow interactive-card cursor-pointer overflow-hidden"
                    onClick={() => setSelectedBatch(batch)}
                  >
                    <CardHeader className="bg-gradient-to-br from-electric-blue/10 via-emerald-green/10 to-pink-rose/10 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-vibrant-purple rounded-xl flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground font-bold">{batch.batch_name}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono">{batch.serial_number}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={batch.is_enabled 
                            ? "bg-emerald-green/20 text-emerald-green border-emerald-green/30" 
                            : "bg-muted/20 text-muted-foreground border-muted/30"
                          }>
                            {batch.is_enabled ? 'Active' : 'Inactive'}
                          </Badge>
                          {getUtilizationBadge(batch.student_count!, batch.max_students)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-electric-blue" />
                            <span className="text-sm text-foreground font-medium">Student Enrollment</span>
                          </div>
                          <span className={`text-lg font-bold ${getUtilizationColor(batch.student_count!, batch.max_students)}`}>
                            {batch.student_count}/{batch.max_students}
                          </span>
                        </div>
                        
                        <Progress value={utilizationPercentage} className="h-3" />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-sunset-orange" />
                              <span className="text-muted-foreground">Created:</span>
                            </div>
                            <span className="text-sunset-orange font-medium">
                              {new Date(batch.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-3 w-3 text-vibrant-purple" />
                              <span className="text-muted-foreground">Usage:</span>
                            </div>
                            <span className="text-vibrant-purple font-medium">
                              {Math.round(utilizationPercentage)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Batch Detail Modal */}
          {selectedBatch && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="glass-card border-foreground/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader className="bg-gradient-to-r from-electric-blue/10 via-emerald-green/10 to-pink-rose/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-vibrant-purple rounded-2xl flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl text-foreground font-bold">{selectedBatch.batch_name}</CardTitle>
                        <p className="text-lg text-muted-foreground font-mono">{selectedBatch.serial_number}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedBatch(null)}
                      variant="ghost"
                      className="text-foreground hover:bg-foreground/10 text-2xl"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 space-y-8">
                  {/* Batch Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3 glass-card p-6 border-electric-blue/20">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-electric-blue" />
                        <h3 className="text-lg font-bold text-electric-blue">Enrollment</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-foreground">Current Students:</span>
                          <span className="text-2xl font-bold text-electric-blue">{selectedBatch.student_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-foreground">Max Capacity:</span>
                          <span className="text-xl font-semibold text-muted-foreground">{selectedBatch.max_students}</span>
                        </div>
                        <Progress 
                          value={(selectedBatch.student_count! / selectedBatch.max_students) * 100} 
                          className="h-3 mt-3" 
                        />
                        <p className="text-sm text-center text-muted-foreground">
                          {Math.round((selectedBatch.student_count! / selectedBatch.max_students) * 100)}% Utilized
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 glass-card p-6 border-emerald-green/20">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-emerald-green" />
                        <h3 className="text-lg font-bold text-emerald-green">Status</h3>
                      </div>
                      <div className="space-y-3">
                        <Badge className={selectedBatch.is_enabled 
                          ? "bg-emerald-green/20 text-emerald-green border-emerald-green/30 text-lg px-4 py-2" 
                          : "bg-muted/20 text-muted-foreground border-muted/30 text-lg px-4 py-2"
                        }>
                          {selectedBatch.is_enabled ? '✅ Active' : '⏸️ Inactive'}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {selectedBatch.is_enabled ? 'Accepting new enrollments' : 'Not accepting enrollments'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 glass-card p-6 border-sunset-orange/20">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-sunset-orange" />
                        <h3 className="text-lg font-bold text-sunset-orange">Created</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-sunset-orange">
                          {new Date(selectedBatch.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(selectedBatch.created_at).toLocaleTimeString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Math.ceil((Date.now() - new Date(selectedBatch.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-6 border-t border-foreground/10">
                    <BatchCRUD batches={[selectedBatch]} />
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
