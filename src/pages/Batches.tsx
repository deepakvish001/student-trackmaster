import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BatchCRUD } from '@/components/batches/BatchCRUD';
import { BatchListSkeleton } from '@/components/batches/BatchListSkeleton';
import { BatchPagination } from '@/components/batches/BatchPagination';
import { useOptimizedBatches } from '@/hooks/useOptimizedBatches';
import { useRealTimeBatchAccess } from '@/hooks/useRealTimeBatchAccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Batch } from '@/types/index';
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function Batches() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  
  // Enable real-time batch access updates
  const { isSubscribed } = useRealTimeBatchAccess();
  
  const {
    batches,
    stats,
    pagination,
    filters,
    actions,
    loading,
    error
  } = useOptimizedBatches({ pageSize: 12, enablePrefetch: true });

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <BatchListSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Premium Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-vibrant-purple" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-branded-gradient">Batch Management</h1>
                  <p className="text-lg text-muted-foreground">
                    Manage your accessible batches • {stats.utilizationRate}% system utilization
                  </p>
                </div>
              </div>
              
              {isSubscribed && (
                <Alert className="bg-primary/10 border-primary/20">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Real-time batch access monitoring is active. You'll be notified of any changes to your permissions.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => actions.refetch()}
                variant="outline"
                className="modern-button-outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
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
                      placeholder="🔍 Search by batch name, serial number, or admin..."
                      value={filters.searchTerm}
                      onChange={(e) => actions.handleSearch(e.target.value)}
                      className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-green">Filter by Status</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                    <select
                      value={filters.statusFilter}
                      onChange={(e) => actions.handleStatusFilter(e.target.value)}
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
                  <h3 className="text-3xl font-bold text-pink-rose mb-2">No Accessible Batches</h3>
                  <p className="text-muted-foreground text-lg">You don't have access to any batches yet. Contact your administrator to get batch access.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {batches.map((batch) => {
                const utilizationPercentage = ((batch.student_count || 0) / batch.max_students) * 100;
                
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
                          {getUtilizationBadge(batch.student_count || 0, batch.max_students)}
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
                          <span className={`text-lg font-bold ${getUtilizationColor(batch.student_count || 0, batch.max_students)}`}>
                            {batch.student_count || 0}/{batch.max_students}
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
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button
                variant="outline"
                onClick={() => actions.handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
                className="glass-card"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isCurrentPage = page === pagination.currentPage;
                  
                  return (
                    <Button
                      key={page}
                      variant={isCurrentPage ? "default" : "outline"}
                      onClick={() => actions.handlePageChange(page)}
                      className={isCurrentPage 
                        ? "bg-electric-blue text-white" 
                        : "glass-card hover:bg-electric-blue/10"
                      }
                      size="sm"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                onClick={() => actions.handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="glass-card"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
          
          {/* Results Info */}
          <div className="text-center text-muted-foreground mt-4">
            Showing {((pagination.currentPage - 1) * 12) + 1} to {Math.min(pagination.currentPage * 12, pagination.totalCount)} of {pagination.totalCount} accessible batches
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}