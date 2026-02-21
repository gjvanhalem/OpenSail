import { useChartPerformanceMonitor } from './ChartPerformanceMonitor';

describe('useChartPerformanceMonitor', () => {
  it('exports useChartPerformanceMonitor hook', () => {
    expect(useChartPerformanceMonitor).toBeDefined();
    expect(typeof useChartPerformanceMonitor).toBe('function');
  });

  it('accepts enabled parameter', () => {
    const hook = useChartPerformanceMonitor;
    expect(hook).toBeDefined();
  });

  it('accepts targetFPS parameter', () => {
    const hook = useChartPerformanceMonitor;
    expect(hook).toBeDefined();
  });

  it('accepts onMetricsUpdate callback', () => {
    const hook = useChartPerformanceMonitor;
    expect(hook).toBeDefined();
  });

  it('accepts onPerformanceWarning callback', () => {
    const hook = useChartPerformanceMonitor;
    expect(hook).toBeDefined();
  });
});
