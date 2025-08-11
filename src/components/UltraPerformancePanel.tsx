import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUltraPerformanceOptimizer } from '@/hooks/useUltraPerformanceOptimizer';
import { Zap, Gauge, Cpu, Network, MemoryStick, Settings, TrendingUp } from 'lucide-react';

export function UltraPerformancePanel() {
  const {
    metrics,
    suggestions,
    isOptimizing,
    autoOptimizeEnabled,
    optimizeNow,
    toggleAutoOptimize
  } = useUltraPerformanceOptimizer();

  const getPerformanceScore = () => {
    const scores = [
      metrics.renderTime < 16 ? 25 : Math.max(0, 25 - (metrics.renderTime - 16)),
      metrics.memoryUsage < 50 ? 25 : Math.max(0, 25 - (metrics.memoryUsage - 50) / 2),
      metrics.cacheHitRate > 80 ? 25 : Math.max(0, metrics.cacheHitRate * 25 / 80),
      metrics.networkLatency < 200 ? 25 : Math.max(0, 25 - (metrics.networkLatency - 200) / 20)
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0));
  };

  const performanceScore = getPerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-black/90 border-gray-700/50 shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-xl flex items-center justify-center">
              <Zap className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">Ultra Performance</CardTitle>
              <p className="text-sm text-gray-400">Real-time optimization & monitoring</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <div className="text-xs text-gray-400">Performance Score</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Render Time */}
          <div className="bg-black/60 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Gauge className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Render</span>
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {metrics.renderTime.toFixed(1)}ms
            </div>
            <Progress 
              value={Math.min(100, (16 / Math.max(metrics.renderTime, 1)) * 100)} 
              className="h-1 mt-2"
            />
          </div>

          {/* Memory Usage */}
          <div className="bg-black/60 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MemoryStick className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Memory</span>
            </div>
            <div className="text-lg font-bold text-blue-400">
              {metrics.memoryUsage.toFixed(1)}%
            </div>
            <Progress 
              value={100 - metrics.memoryUsage} 
              className="h-1 mt-2"
            />
          </div>

          {/* Cache Hit Rate */}
          <div className="bg-black/60 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Cache</span>
            </div>
            <div className="text-lg font-bold text-purple-400">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <Progress 
              value={metrics.cacheHitRate} 
              className="h-1 mt-2"
            />
          </div>

          {/* Network Latency */}
          <div className="bg-black/60 backdrop-blur-sm border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Network className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Network</span>
            </div>
            <div className="text-lg font-bold text-orange-400">
              {metrics.networkLatency.toFixed(0)}ms
            </div>
            <Progress 
              value={Math.min(100, (500 - metrics.networkLatency) / 5)} 
              className="h-1 mt-2"
            />
          </div>
        </div>

        {/* Optimization Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={optimizeNow}
              disabled={isOptimizing}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Optimize Now
                </>
              )}
            </Button>
            
            <Badge 
              variant={autoOptimizeEnabled ? "default" : "secondary"}
              className={`cursor-pointer ${autoOptimizeEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}`}
              onClick={toggleAutoOptimize}
            >
              {autoOptimizeEnabled ? 'Auto-Optimize ON' : 'Auto-Optimize OFF'}
            </Badge>
          </div>
          
          <div className="text-xs text-gray-400">
            Last updated: {metrics.lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Optimization Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Performance Suggestions</span>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="text-xs text-amber-200 flex items-start space-x-2">
                  <div className="w-1 h-1 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}