
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  FileText, 
  Image, 
  Database, 
  Archive,
  Calendar,
  Clock,
  Activity,
  TrendingDown,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Folder,
  HardDrive,
  Zap,
  Users,
  Shield,
  Fingerprint
} from 'lucide-react';

interface DownloadItem {
  id: string;
  name: string;
  type: 'student_data' | 'batch_report' | 'biometric_backup' | 'system_logs';
  size: number;
  format: 'xlsx' | 'csv' | 'pdf' | 'json' | 'zip';
  created_at: string;
  status: 'ready' | 'generating' | 'expired';
  download_count: number;
}

export default function Downloads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data for demonstration - replace with actual API call
  const mockDownloads: DownloadItem[] = [
    {
      id: '1',
      name: 'Student Database Export',
      type: 'student_data',
      size: 2.4 * 1024 * 1024, // 2.4 MB
      format: 'xlsx',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      status: 'ready',
      download_count: 5
    },
    {
      id: '2', 
      name: 'Batch Performance Report',
      type: 'batch_report',
      size: 1.8 * 1024 * 1024, // 1.8 MB
      format: 'pdf',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      status: 'ready',
      download_count: 12
    },
    {
      id: '3',
      name: 'Biometric Data Backup',
      type: 'biometric_backup',
      size: 15.6 * 1024 * 1024, // 15.6 MB
      format: 'zip',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      status: 'ready',
      download_count: 2
    },
    {
      id: '4',
      name: 'System Activity Logs',
      type: 'system_logs',
      size: 5.2 * 1024 * 1024, // 5.2 MB
      format: 'json',
      created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      status: 'generating',
      download_count: 0
    }
  ];

  const { data: downloads = mockDownloads, isLoading, refetch } = useQuery({
    queryKey: ['downloads', searchTerm, typeFilter],
    queryFn: async () => {
      // In a real app, this would fetch from your API
      let filtered = mockDownloads;

      if (searchTerm) {
        filtered = filtered.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (typeFilter !== 'all') {
        filtered = filtered.filter(item => item.type === typeFilter);
      }

      return filtered;
    },
    refetchInterval: 5000 // Refresh every 5 seconds for real-time status
  });

  // Real-time statistics
  const stats = {
    totalDownloads: downloads.length,
    readyDownloads: downloads.filter(d => d.status === 'ready').length,
    generatingDownloads: downloads.filter(d => d.status === 'generating').length,
    totalSize: downloads.reduce((sum, d) => sum + d.size, 0),
    totalDownloadCount: downloads.reduce((sum, d) => sum + d.download_count, 0)
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'student_data': return <Users className="h-5 w-5 text-electric-blue" />;
      case 'batch_report': return <FileText className="h-5 w-5 text-emerald-green" />;
      case 'biometric_backup': return <Fingerprint className="h-5 w-5 text-sunset-orange" />;
      case 'system_logs': return <Database className="h-5 w-5 text-pink-rose" />;
      default: return <FileDown className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student_data': return 'text-electric-blue bg-electric-blue/10 border-electric-blue/20';
      case 'batch_report': return 'text-emerald-green bg-emerald-green/10 border-emerald-green/20';
      case 'biometric_backup': return 'text-sunset-orange bg-sunset-orange/10 border-sunset-orange/20';
      case 'system_logs': return 'text-pink-rose bg-pink-rose/10 border-pink-rose/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready': return <Badge className="bg-emerald-green/20 text-emerald-green border-emerald-green/30"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'generating': return <Badge className="bg-sunset-orange/20 text-sunset-orange border-sunset-orange/30 animate-pulse"><Clock className="h-3 w-3 mr-1" />Generating</Badge>;
      case 'expired': return <Badge className="bg-pink-rose/20 text-pink-rose border-pink-rose/30"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      default: return <Badge className="bg-muted/20 text-muted-foreground border-muted/30">Unknown</Badge>;
    }
  };

  const handleDownload = (item: DownloadItem) => {
    if (item.status !== 'ready') return;
    
    // Simulate download progress
    setDownloadProgress(prev => ({ ...prev, [item.id]: 0 }));
    
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        const current = prev[item.id] || 0;
        if (current >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setDownloadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[item.id];
              return newProgress;
            });
          }, 2000);
          return prev;
        }
        return { ...prev, [item.id]: current + 10 };
      });
    }, 200);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface-darker to-background flex items-center justify-center">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="animate-spin w-16 h-16 border-4 border-electric-blue/30 border-t-electric-blue rounded-full mx-auto"></div>
            <div className="text-2xl font-bold text-electric-blue animate-pulse">Loading Downloads...</div>
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
                📥 Download Center
              </h1>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-electric-blue animate-pulse" />
                  <span className="font-mono text-electric-blue text-lg">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-emerald-green" />
                  <span className="text-emerald-green font-semibold">
                    {formatFileSize(stats.totalSize)} Total
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-sunset-orange" />
                  <span className="text-sunset-orange font-semibold">
                    {stats.totalDownloadCount} Downloads
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
                Refresh
              </Button>
              <Button
                className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 shadow-green-glow"
              >
                <Archive className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Real-time Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="glass-card border-electric-blue/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-electric-blue font-bold uppercase tracking-wide">Total Files</p>
                    <p className="text-3xl font-bold text-electric-blue">{stats.totalDownloads}</p>
                  </div>
                  <Folder className="h-8 w-8 text-electric-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-emerald-green/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-green font-bold uppercase tracking-wide">Ready</p>
                    <p className="text-3xl font-bold text-emerald-green">{stats.readyDownloads}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-green" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-sunset-orange/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-sunset-orange font-bold uppercase tracking-wide">Processing</p>
                    <p className="text-3xl font-bold text-sunset-orange">{stats.generatingDownloads}</p>
                  </div>
                  <Zap className="h-8 w-8 text-sunset-orange animate-pulse" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-pink-rose/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-pink-rose font-bold uppercase tracking-wide">Total Size</p>
                    <p className="text-lg font-bold text-pink-rose">{formatFileSize(stats.totalSize)}</p>
                  </div>
                  <HardDrive className="h-8 w-8 text-pink-rose" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-vibrant-purple/20 hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-vibrant-purple font-bold uppercase tracking-wide">Downloads</p>
                    <p className="text-3xl font-bold text-vibrant-purple">{stats.totalDownloadCount}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-vibrant-purple" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Search and Filters */}
          <Card className="glass-card border-foreground/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-electric-blue">Search Files</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-electric-blue" />
                    <Input
                      placeholder="🔍 Search downloads by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 glass bg-surface-darker border-electric-blue/30 text-foreground placeholder:text-muted-foreground/70 focus:border-electric-blue focus:ring-electric-blue/20 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-green">Filter by Type</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-green" />
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="pl-12 pr-8 py-3 glass bg-surface-darker border-emerald-green/30 text-foreground rounded-lg focus:border-emerald-green h-12 min-w-[200px]"
                    >
                      <option value="all">All Types</option>
                      <option value="student_data">Student Data</option>
                      <option value="batch_report">Batch Reports</option>
                      <option value="biometric_backup">Biometric Backup</option>
                      <option value="system_logs">System Logs</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Downloads List */}
          {downloads.length === 0 ? (
            <Card className="glass-card border-pink-rose/20 text-center p-16">
              <div className="space-y-6">
                <div className="w-24 h-24 bg-pink-rose/20 rounded-full flex items-center justify-center mx-auto">
                  <Download className="h-12 w-12 text-pink-rose" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-pink-rose mb-2">No Downloads Found</h3>
                  <p className="text-muted-foreground text-lg">No files match your search criteria.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {downloads.map((item) => (
                <Card 
                  key={item.id} 
                  className="glass-card border-foreground/10 hover-lift interactive-card overflow-hidden"
                >
                  <CardHeader className="bg-gradient-to-r from-surface-darker/50 to-surface-dark/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-electric-blue/20 to-vibrant-purple/20 rounded-xl flex items-center justify-center">
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground font-bold">{item.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{formatFileSize(item.size)} • {item.format.toUpperCase()}</p>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className={`font-semibold px-3 py-1 ${getTypeColor(item.type)}`}>
                        {item.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Downloads:</span>
                        <span className="text-vibrant-purple font-semibold">{item.download_count}x</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Created:</span>
                        <span className="text-sunset-orange">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {downloadProgress[item.id] !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">Downloading...</span>
                          <span className="text-electric-blue font-semibold">{downloadProgress[item.id]}%</span>
                        </div>
                        <Progress value={downloadProgress[item.id]} className="h-2" />
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleDownload(item)}
                        disabled={item.status !== 'ready'}
                        className={`w-full transition-all duration-300 ${
                          item.status === 'ready'
                            ? 'bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 shadow-glow'
                            : 'bg-muted/20 cursor-not-allowed'
                        }`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {item.status === 'ready' ? 'Download File' : 
                         item.status === 'generating' ? 'Generating...' : 'Expired'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <Card className="glass-card border-foreground/10">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground flex items-center">
                <Zap className="h-6 w-6 mr-3 text-electric-blue" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-electric-blue to-vibrant-purple hover:scale-105 transition-all duration-300 p-6 h-auto flex-col space-y-2">
                  <Users className="h-8 w-8" />
                  <span className="font-semibold">Export Students</span>
                  <span className="text-xs opacity-80">Download all student data</span>
                </Button>
                
                <Button className="bg-gradient-to-r from-emerald-green to-lime-green hover:scale-105 transition-all duration-300 p-6 h-auto flex-col space-y-2">
                  <FileText className="h-8 w-8" />
                  <span className="font-semibold">Batch Report</span>
                  <span className="text-xs opacity-80">Generate batch analytics</span>
                </Button>
                
                <Button className="bg-gradient-to-r from-sunset-orange to-pink-rose hover:scale-105 transition-all duration-300 p-6 h-auto flex-col space-y-2">
                  <Shield className="h-8 w-8" />
                  <span className="font-semibold">Backup Data</span>
                  <span className="text-xs opacity-80">Secure biometric backup</span>
                </Button>
                
                <Button className="bg-gradient-to-r from-pink-rose to-vibrant-purple hover:scale-105 transition-all duration-300 p-6 h-auto flex-col space-y-2">
                  <Activity className="h-8 w-8" />
                  <span className="font-semibold">System Logs</span>
                  <span className="text-xs opacity-80">Download activity logs</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
