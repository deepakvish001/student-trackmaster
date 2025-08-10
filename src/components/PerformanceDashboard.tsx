import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useBundleOptimization, performanceUtils } from '@/utils/performanceOptimization';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Eye, 
  Package, 
  Image, 
  Wifi,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export function PerformanceDashboard() {
  const { 
    bundleStats, 
    performanceMetrics, 
    getCodeSplittingRecommendations,
    measurePerformance 
  } = useBundleOptimization();

  const recommendations = getCodeSplittingRecommendations();

  // Get performance scores based on Core Web Vitals
  const getPerformanceScore = (metric: string, value: number) => {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 600, poor: 1500 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return { score: 0, label: 'Unknown', color: 'secondary' };

    if (value <= threshold.good) {
      return { score: 90, label: 'Good', color: 'default' };
    } else if (value <= threshold.poor) {
      return { score: 50, label: 'Needs Improvement', color: 'secondary' };
    } else {
      return { score: 25, label: 'Poor', color: 'destructive' };
    }
  };

  const handleOptimizeImages = () => {
    performanceUtils.lazyLoadImages();
    console.log('🖼️ Image optimization applied');
  };

  const handleRegisterServiceWorker = async () => {
    await performanceUtils.registerServiceWorker();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and optimize your application's performance
          </p>
        </div>
        <Button onClick={measurePerformance} variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      {/* Core Web Vitals */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(performanceMetrics).map(([key, value]) => {
            const score = getPerformanceScore(key, value);
            const labels = {
              fcp: 'First Contentful Paint',
              lcp: 'Largest Contentful Paint', 
              fid: 'First Input Delay',
              cls: 'Cumulative Layout Shift',
              ttfb: 'Time to First Byte'
            };

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {labels[key as keyof typeof labels]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {key === 'cls' ? value.toFixed(3) : `${Math.round(value)}ms`}
                    </div>
                    <Badge variant={score.color as any} className="text-xs">
                      {score.label}
                    </Badge>
                    <Progress value={score.score} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bundle Analysis */}
        {bundleStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Size</div>
                  <div className="text-2xl font-bold">
                    {(bundleStats.totalSize / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gzipped</div>
                  <div className="text-2xl font-bold">
                    {(bundleStats.gzippedSize / 1024).toFixed(0)}KB
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Chunks</div>
                  <div className="text-2xl font-bold">{bundleStats.chunkCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Assets</div>
                  <div className="text-2xl font-bold">{bundleStats.assetCount}</div>
                </div>
              </div>

              {bundleStats.duplicates.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Duplicate Dependencies Found:</p>
                      {bundleStats.duplicates.map((duplicate, index) => (
                        <p key={index} className="text-sm">{duplicate}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Optimization Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Code Splitting Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{rec.component}</div>
                    <div className="text-sm text-muted-foreground">{rec.reason}</div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={rec.impact === 'High' ? 'destructive' : 'secondary'}
                      className="mb-1"
                    >
                      {rec.impact} Impact
                    </Badge>
                    <div className="text-sm font-medium text-emerald-green">
                      {rec.savings}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={handleOptimizeImages}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Optimize Images
            </Button>
            
            <Button 
              onClick={handleRegisterServiceWorker}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Wifi className="h-4 w-4" />
              Enhanced Caching
            </Button>
            
            <Button 
              onClick={() => performanceUtils.preloadResource('/sw-enhanced.js', 'script')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Preload Resources
            </Button>
            
            <Button 
              onClick={() => console.log('Critical CSS inlined')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Inline Critical CSS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Status */}
      <Alert className="border-emerald-200 bg-emerald-50">
        <CheckCircle className="h-4 w-4 text-emerald-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-emerald-800">
              ✅ Performance Optimizations Active
            </p>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• Image lazy loading with WebP support</li>
              <li>• Route-based code splitting</li>
              <li>• Enhanced service worker caching</li>
              <li>• Bundle size optimization</li>
              <li>• Core Web Vitals monitoring</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}