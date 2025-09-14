import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Settings, 
  Home, 
  Zap, 
  TrendingUp, 
  Info,
  X,
  Activity,
  Database,
  Globe
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, appData }) => {
  const location = useLocation();
  
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'System overview and metrics'
    },
    {
      name: 'Integrations',
      href: '/integrations',
      icon: Zap,
      description: 'Manage org integrations',
      badge: appData.totalIntegrations
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: TrendingUp,
      description: 'Performance analytics'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'Platform configuration'
    },
    {
      name: 'About',
      href: '/about',
      icon: Info,
      description: 'Project information'
    }
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const getSystemStatusColor = () => {
    switch (appData.systemHealth) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSystemStatusText = () => {
    switch (appData.systemHealth) {
      case 'healthy': return 'All Systems Operational';
      case 'warning': return 'Performance Degraded';
      case 'error': return 'System Error';
      default: return 'Checking Status...';
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  Multi-Org Platform
                </h1>
                <p className="text-xs text-gray-500">Integration Dashboard</p>
              </div>
            </div>
            
            {/* Close button (mobile) */}
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* System Status */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Activity className={`w-4 h-4 ${getSystemStatusColor()}`} />
              <span className="text-sm font-medium text-gray-700">
                {getSystemStatusText()}
              </span>
            </div>
            
            {/* Quick stats */}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3" />
                <span>Integrations: {appData.totalIntegrations}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>Active: {appData.activeIntegrations}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = isActivePath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      flex-shrink-0 w-5 h-5 mr-3 transition-colors
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  <span className="flex-1">{item.name}</span>
                  
                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`
                      ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Real-time Activity Feed (if available) */}
          {appData.realtimeEvents && appData.realtimeEvents.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Recent Activity
                </h3>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {appData.realtimeEvents.slice(0, 3).map((event, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="text-xs text-gray-600">
                      <p className="font-medium capitalize">
                        {event.type.replace('-', ' ')}
                      </p>
                      <p className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Built by <strong>Riya Singh</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Salesforce Developer Portfolio
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;