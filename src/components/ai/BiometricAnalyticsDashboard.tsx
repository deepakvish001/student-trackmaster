import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Brain,
  Activity,
  Eye,
  Shield,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useBiometricAnalytics } from '@/hooks/useBiometricAnalytics';

interface QualityTrend {
  date: string;
  average: number;
  samples: number;
}

interface DevicePerformance {
  deviceId: string;
  successRate: number;
  avgQuality: number;
  totalScans: number;
  lastSeen: Date;
}

export const BiometricAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedMetric, setSelectedMetric] = useState<'quality' | 'success' | 'timing'>('quality');
  
  const {
    qualityTrends,
    devicePerformance,
    successRates,
    captureTiming,
    userMetrics,
    securityMetrics,
    isLoading,
    refreshData
  } = useBiometricAnalytics(timeRange);

  const qualityData = [
    { name: 'Excellent (90-100%)', value: 45, color: '#10b981' },
    { name: 'Good (80-89%)', value: 32, color: '#3b82f6' },
    { name: 'Fair (70-79%)', value: 18, color: '#f59e0b' },
    { name: 'Poor (<70%)', value: 5, color: '#ef4444' }
  ];

  const timingData = [
    { hour: '00', captures: 12, avgTime: 2.3 },
    { hour: '04', captures: 8, avgTime: 2.1 },
    { hour: '08', captures: 156, avgTime: 3.2 },
    { hour: '12', captures: 234, avgTime: 2.8 },
    { hour: '16', captures: 198, avgTime: 2.6 },
    { hour: '20', captures: 87, avgTime: 2.9 }
  ];

  const trendData = [
    { date: '2024-01-15', quality: 78, success: 92, users: 45 },
    { date: '2024-01-16', quality: 82, success: 94, users: 52 },
    { date: '2024-01-17', quality: 85, success: 96, users: 48 },
    { date: '2024-01-18', quality: 79, success: 89, users: 67 },
    { date: '2024-01-19', quality: 88, success: 97, users: 71 },
    { date: '2024-01-20', quality: 91, success: 98, users: 63 },
    { date: '2024-01-21', quality: 87, success: 95, users: 58 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Biometric Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <Button onClick={refreshData} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">94.2%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">87.6</div>
                <div className="text-sm text-muted-foreground">Avg Quality</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">2.8s</div>
                <div className="text-sm text-muted-foreground">Avg Capture Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">1,247</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Quality Trends</TabsTrigger>
          <TabsTrigger value="devices">Device Performance</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="security">Security Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quality Trends Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="quality" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Quality Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="success" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Success Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Quality Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Device Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'MFS100-001', success: 96, quality: 89, scans: 1234, status: 'excellent' },
                  { id: 'MFS100-002', success: 94, quality: 87, scans: 987, status: 'good' },
                  { id: 'MFS100-003', success: 89, quality: 82, scans: 756, status: 'fair' },
                  { id: 'MFS100-004', success: 92, quality: 85, scans: 654, status: 'good' }
                ].map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        device.status === 'excellent' ? 'bg-green-500' :
                        device.status === 'good' ? 'bg-blue-500' :
                        device.status === 'fair' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="font-medium">{device.id}</div>
                        <div className="text-sm text-muted-foreground">{device.scans} total scans</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm">Success: {device.success}%</div>
                        <div className="text-sm">Quality: {device.quality}%</div>
                      </div>
                      <Badge variant={
                        device.status === 'excellent' ? 'default' :
                        device.status === 'good' ? 'secondary' : 'outline'
                      }>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Usage Patterns by Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="captures" fill="#3b82f6" name="Captures" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { time: '12:00 PM', captures: 234, change: '+12%' },
                  { time: '4:00 PM', captures: 198, change: '+8%' },
                  { time: '8:00 AM', captures: 156, change: '+15%' }
                ].map((peak, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{peak.time}</div>
                      <div className="text-sm text-muted-foreground">{peak.captures} captures</div>
                    </div>
                    <Badge variant="secondary">{peak.change}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Capture Time</span>
                    <span>2.8s</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>5.8%</span>
                  </div>
                  <Progress value={6} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>User Satisfaction</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Threats Detected</span>
                    <Badge variant="destructive">3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Spoofing Attempts</span>
                    <Badge variant="secondary">7</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Risk Level</span>
                    <Badge variant="outline">Low</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Liveness Detection</span>
                    <Badge variant="default">98.5%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  AI Security Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Normal Patterns</div>
                  <div className="text-sm text-green-700">No unusual activity detected in the last 24 hours</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-sm font-medium text-amber-800">Minor Alert</div>
                  <div className="text-sm text-amber-700">Slight increase in failed attempts during peak hours</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};