import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Integrations from './pages/Integrations';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import About from './pages/About';

// Services
import { apiService } from './services/apiService';
import { socketService } from './services/socketService';

// Styles
import './index.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [appData, setAppData] = useState({
    totalIntegrations: 0,
    activeIntegrations: 0,
    realtimeEvents: [],
    systemHealth: 'checking'
  });

  // Initialize socket connection and app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize socket connection
        await socketService.connect();
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to real-time events
        socketService.on('integration-created', (data) => {
          setAppData(prev => ({
            ...prev,
            totalIntegrations: prev.totalIntegrations + 1,
            realtimeEvents: [
              { type: 'integration-created', data, timestamp: new Date() },
              ...prev.realtimeEvents.slice(0, 49)
            ]
          }));
        });

        socketService.on('sync-completed', (data) => {
          setAppData(prev => ({
            ...prev,
            realtimeEvents: [
              { type: 'sync-completed', data, timestamp: new Date() },
              ...prev.realtimeEvents.slice(0, 49)
            ]
          }));
        });

        socketService.on('webhook-received', (data) => {
          setAppData(prev => ({
            ...prev,
            realtimeEvents: [
              { type: 'webhook-received', data, timestamp: new Date() },
              ...prev.realtimeEvents.slice(0, 49)
            ]
          }));
        });

        // Load initial data
        await loadInitialData();

      } catch (error) {
        console.error('Failed to initialize app:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      if (socketService.socket) {
        socketService.disconnect();
      }
    };
  }, []);

  // Load initial application data
  const loadInitialData = async () => {
    try {
      const [healthResponse, integrationsResponse] = await Promise.allSettled([
        apiService.get('/health'),
        apiService.get('/integrations?limit=1')
      ]);

      if (healthResponse.status === 'fulfilled') {
        setAppData(prev => ({
          ...prev,
          systemHealth: healthResponse.value.status
        }));
      }

      if (integrationsResponse.status === 'fulfilled') {
        const { pagination } = integrationsResponse.value;
        setAppData(prev => ({
          ...prev,
          totalIntegrations: pagination.totalIntegrations || 0
        }));
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on mobile when clicking outside
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Connection status banner
  const ConnectionBanner = () => {
    if (connectionError) {
      return (
        <div className="bg-red-500 text-white px-4 py-2 text-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span>⚠️ Connection Error: {connectionError}</span>
            <button 
              onClick={() => window.location.reload()}
              className="underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="bg-yellow-500 text-white px-4 py-2 text-sm">
          <div className="max-w-7xl mx-auto">
            <span>🔄 Connecting to server...</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />

        {/* Connection status banner */}
        <ConnectionBanner />

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
          appData={appData}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          {/* Header */}
          <Header 
            onMenuClick={toggleSidebar}
            isConnected={isConnected}
            systemHealth={appData.systemHealth}
          />

          {/* Main content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <Dashboard 
                      appData={appData}
                      isConnected={isConnected}
                    />
                  } 
                />
                <Route 
                  path="/integrations" 
                  element={
                    <Integrations 
                      onDataChange={loadInitialData}
                    />
                  } 
                />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </div>
    </Router>
  );
}

export default App;