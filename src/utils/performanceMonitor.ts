import { debugLogger } from './debugLogger';

/**
 * Performance monitoring utilities
 */

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};

  constructor() {
    this.collectInitialMetrics();
    this.setupPerformanceObserver();
  }

  private collectInitialMetrics() {
    // Collect basic timing metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      
      debugLogger.info('Performance: Initial metrics collected', {
        loadTime: this.metrics.loadTime,
        domContentLoaded: this.metrics.domContentLoaded,
        domInteractive: navigation.domInteractive,
        domComplete: navigation.domComplete
      });
    }

    // Collect memory usage if available
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
      
      debugLogger.info('Performance: Memory usage', this.metrics.memoryUsage);
    }
  }

  private setupPerformanceObserver() {
    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint') {
              this.metrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          }
          
          debugLogger.info('Performance: Paint metrics', {
            firstPaint: this.metrics.firstPaint,
            firstContentfulPaint: this.metrics.firstContentfulPaint
          });
        });
        
        paintObserver.observe({ entryTypes: ['paint'] });

        // Observe LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
          
          debugLogger.info('Performance: LCP updated', {
            largestContentfulPaint: this.metrics.largestContentfulPaint
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        debugLogger.warn('Performance: Observer setup failed', { error });
      }
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return {
      loadTime: this.metrics.loadTime || 0,
      domContentLoaded: this.metrics.domContentLoaded || 0,
      firstPaint: this.metrics.firstPaint,
      firstContentfulPaint: this.metrics.firstContentfulPaint,
      largestContentfulPaint: this.metrics.largestContentfulPaint,
      memoryUsage: this.metrics.memoryUsage
    };
  }

  // Monitor a specific operation
  async monitorOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    debugLogger.info(`Performance: Starting operation "${name}"`);
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      debugLogger.info(`Performance: Operation "${name}" completed`, {
        duration: Math.round(duration * 100) / 100,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      debugLogger.error(`Performance: Operation "${name}" failed`, {
        duration: Math.round(duration * 100) / 100,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  // Log current memory usage
  logMemoryUsage(context: string) {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      const current = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
      
      debugLogger.info(`Performance: Memory usage (${context})`, current);
      return current;
    }
    return null;
  }
}

// Create global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Make it available globally for debugging
(window as any).performanceMonitor = performanceMonitor;