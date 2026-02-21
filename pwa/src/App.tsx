import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store';
import { Layout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/Toast';
import { CompatibilityWarning } from './components/CompatibilityWarning';
import { useErrorHandler } from './hooks/useErrorHandler';
import { chartCacheLoader } from './services/ChartCacheLoader';
import { loadSettings } from './store/slices/settingsSlice';
import './App.css';

// Lazy load page components for code splitting
const ChartPage = lazy(() => import('./pages/ChartPage').then(m => ({ default: m.ChartPage })));
const RoutesPage = lazy(() => import('./pages/RoutesPage').then(m => ({ default: m.RoutesPage })));
const TracksPage = lazy(() => import('./pages/TracksPage').then(m => ({ default: m.TracksPage })));
const LogbookPage = lazy(() => import('./pages/LogbookPage').then(m => ({ default: m.LogbookPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const InstrumentsPage = lazy(() => import('./pages/InstrumentsPage').then(m => ({ default: m.InstrumentsPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  
  // Connect error handler to notification system
  useErrorHandler();

  // Load cached regions and settings on app startup
  useEffect(() => {
    chartCacheLoader.loadCachedRegions(dispatch);
    dispatch(loadSettings());
  }, [dispatch]);

  return (
    <>
      <CompatibilityWarning />
      
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/chart" replace />} />
              <Route path="/chart" element={<ChartPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/tracks" element={<TracksPage />} />
              <Route path="/logbook" element={<LogbookPage />} />
              <Route path="/instruments" element={<InstrumentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
      
      <Toast />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
