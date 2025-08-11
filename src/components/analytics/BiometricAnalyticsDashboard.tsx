import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Fingerprint, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Download
} from 'lucide-react';

interface BiometricMetrics {
  captureStats: {
    totalCaptures: number;
    successRate: number;
    averageQuality: number;
    averageTime: number;
  };
  qualityDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  capturesByTime: Array<{
    hour: string;
    captures: number;
    quality: number;
  }>;
  fingerDistribution: Array<{
    finger: string;
    captures: number;
    averageQuality: number;
  }>;
  retryAnalysis: Array<{
    attempts: number;
    count: number;
    successRate: number;
  }>;
  performanceTrends: Array<{
    date: string;
    captures: number;
    quality: number;
    successRate: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function BiometricAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<BiometricMetrics | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analytics data
    const loadMetrics = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock analytics data
      setMetrics({
        captureStats: {
          totalCaptures: 1247,
          successRate: 94.2,
          averageQuality: 87.3,
          averageTime: 2.4
        },
        qualityDistribution: [
          { range: '90-100%', count: 456, percentage: 36.6 },
          { range: '80-89%', count: 387, percentage: 31.0 },
          { range: '70-79%', count: 284, percentage: 22.8 },
          { range: '60-69%', count: 89, percentage: 7.1 },
          { range: '<60%', count: 31, percentage: 2.5 }
        ],
        capturesByTime: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          captures: Math.floor(Math.random() * 50) + 10,
          quality: 75 + Math.random() * 20
        })),
        fingerDistribution: [
          { finger: 'Thumb', captures: 267, averageQuality: 89.2 },
          { finger: 'Index', captures: 301, averageQuality: 91.5 },
          { finger: 'Middle', captures: 243, averageQuality: 85.7 },
          { finger: 'Ring', captures: 198, averageQuality: 83.1 },
          { finger: 'Pinky', captures: 238, averageQuality: 86.9 }
        ],
        retryAnalysis: [
          { attempts: 1, count: 986, successRate: 98.2 },
          { attempts: 2, count: 156, successRate: 89.1 },
          { attempts: 3, count: 67, successRate: 73.1 },
          { attempts: 4, count: 28, successRate: 57.1 },
          { attempts: 5, count: 10, successRate: 30.0 }
        ],
        performanceTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          captures: Math.floor(Math.random() * 100) + 50,
          quality: 80 + Math.random() * 15,
          successRate: 85 + Math.random() * 15
        }))
      });
      
      setLoading(false);
    };

    loadMetrics();
  }, [selectedTimeRange]);

  const exportData = () => {
    // Simulate data export
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `biometric-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Loading Analytics...</h2>
              <p className="text-muted-foreground">Processing biometric data</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Biometric Analytics</h2>
            <p className="text-muted-foreground">Comprehensive fingerprint capture analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="day">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportData} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-blue-500" />
              Total Captures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.captureStats.totalCaptures.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Biometric captures today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.captureStats.successRate}%</div>
            <p className="text-xs text-muted-foreground">First-attempt success</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Avg Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.captureStats.averageQuality}%</div>
            <p className="text-xs text-muted-foreground">Image quality score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Avg Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.captureStats.averageTime}s</div>
            <p className="text-xs text-muted-foreground">Capture duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="distribution">Quality Distribution</TabsTrigger>
          <TabsTrigger value="fingers">Finger Analysis</TabsTrigger>
          <TabsTrigger value="timing">Timing Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="captures" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                      name="Captures"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="quality" 
                      stroke="#82ca9d" 
                      name="Quality %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.qualityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, percentage }) => `${range}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {metrics.qualityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retry Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.retryAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attempts" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fingers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Finger Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.fingerDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="finger" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="captures" fill="#8884d8" name="Captures" />
                    <Bar yAxisId="right" dataKey="averageQuality" fill="#82ca9d" name="Avg Quality %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Captures by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.capturesByTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="captures" 
                      stroke="#8884d8" 
                      name="Captures"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="quality" 
                      stroke="#82ca9d" 
                      name="Quality %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quality Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              High Quality Captures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {metrics.qualityDistribution[0].count + metrics.qualityDistribution[1].count}
            </div>
            <p className="text-xs text-muted-foreground">Quality score ≥ 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {metrics.qualityDistribution[2].count}
            </div>
            <p className="text-xs text-muted-foreground">Quality score 70-79%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {metrics.capturesByTime.reduce((max, current) => 
                current.captures > max.captures ? current : max
              ).hour}
            </div>
            <p className="text-xs text-muted-foreground">Highest activity period</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}