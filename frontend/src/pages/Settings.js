import React, { useState } from 'react';
import { 
  Save, 
  RefreshCw, 
  Bell, 
  Shield, 
  Database, 
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    general: {
      platformName: 'Multi-Org Integration Platform',
      enableNotifications: true,
      enableRealTime: true,
      enableAIFeatures: true,
      enableAnalytics: true,
      defaultTimeRange: '24h',
      maxRetries: 3,
      timeoutDuration: 30000
    },
    security: {
      enableRateLimit: true,
      maxRequestsPerWindow: 100,
      rateLimitWindow: 900000,
      enableLogging: true,
      logLevel: 'info',
      enableAuditTrail: true
    },
    integrations: {
      enableAutoSync: true,
      syncFrequency: 'realtime',
      enableConflictResolution: true,
      conflictResolutionStrategy: 'ai-resolve',
      enableFieldMapping: true,
      fieldMappingConfidence: 0.8
    },
    notifications: {
      enableEmailNotifications: false,
      enableWebhookNotifications: true,
      enableSlackNotifications: false,
      emailRecipient: 'admin@company.com',
      webhookUrl: '',
      slackWebhookUrl: ''
    }
  });

  const [showApiKeys, setShowApiKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Connection test successful');
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const SettingSection = ({ title, description, children, icon: Icon }) => (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="card-body space-y-4">
        {children}
      </div>
    </div>
  );

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const FormField = ({ label, type = 'text', value, onChange, placeholder, description, options }) => (
    <div>
      <label className="form-label">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      {type === 'select' ? (
        <select
          className="form-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure platform behavior and integrations
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary"
          >
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Demo Mode Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Demo Mode Active</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This platform is running in demonstration mode. Settings changes are simulated 
                and will reset on page refresh. In a production environment, these settings 
                would be persisted to the database.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <SettingSection
        title="General Settings"
        description="Basic platform configuration"
        icon={Globe}
      >
        <FormField
          label="Platform Name"
          value={settings.general.platformName}
          onChange={(value) => handleSettingChange('general', 'platformName', value)}
          placeholder="Enter platform name"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Default Time Range"
            type="select"
            value={settings.general.defaultTimeRange}
            onChange={(value) => handleSettingChange('general', 'defaultTimeRange', value)}
            options={[
              { value: '1h', label: 'Last Hour' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last Week' },
              { value: '30d', label: 'Last Month' }
            ]}
          />
          
          <FormField
            label="Max Retries"
            type="number"
            value={settings.general.maxRetries}
            onChange={(value) => handleSettingChange('general', 'maxRetries', parseInt(value))}
            description="Maximum retry attempts for failed operations"
          />
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.general.enableNotifications}
            onChange={(value) => handleSettingChange('general', 'enableNotifications', value)}
            label="Enable Notifications"
            description="Show system notifications and alerts"
          />
          
          <ToggleSwitch
            enabled={settings.general.enableRealTime}
            onChange={(value) => handleSettingChange('general', 'enableRealTime', value)}
            label="Real-time Updates"
            description="Enable WebSocket connections for live updates"
          />
          
          <ToggleSwitch
            enabled={settings.general.enableAIFeatures}
            onChange={(value) => handleSettingChange('general', 'enableAIFeatures', value)}
            label="AI Features"
            description="Enable AI-powered field mapping and conflict resolution"
          />
          
          <ToggleSwitch
            enabled={settings.general.enableAnalytics}
            onChange={(value) => handleSettingChange('general', 'enableAnalytics', value)}
            label="Analytics Tracking"
            description="Collect and analyze performance metrics"
          />
        </div>
      </SettingSection>

      {/* Security Settings */}
      <SettingSection
        title="Security & Logging"
        description="Security policies and audit configuration"
        icon={Shield}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Rate Limit (requests/window)"
            type="number"
            value={settings.security.maxRequestsPerWindow}
            onChange={(value) => handleSettingChange('security', 'maxRequestsPerWindow', parseInt(value))}
            description="Maximum requests per time window"
          />
          
          <FormField
            label="Log Level"
            type="select"
            value={settings.security.logLevel}
            onChange={(value) => handleSettingChange('security', 'logLevel', value)}
            options={[
              { value: 'error', label: 'Error Only' },
              { value: 'warn', label: 'Warning & Error' },
              { value: 'info', label: 'Info, Warning & Error' },
              { value: 'debug', label: 'All Logs (Debug)' }
            ]}
          />
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.security.enableRateLimit}
            onChange={(value) => handleSettingChange('security', 'enableRateLimit', value)}
            label="Rate Limiting"
            description="Enable API rate limiting protection"
          />
          
          <ToggleSwitch
            enabled={settings.security.enableLogging}
            onChange={(value) => handleSettingChange('security', 'enableLogging', value)}
            label="System Logging"
            description="Log system events and API requests"
          />
          
          <ToggleSwitch
            enabled={settings.security.enableAuditTrail}
            onChange={(value) => handleSettingChange('security', 'enableAuditTrail', value)}
            label="Audit Trail"
            description="Maintain detailed audit logs for compliance"
          />
        </div>
      </SettingSection>

      {/* Integration Settings */}
      <SettingSection
        title="Integration Configuration"
        description="Default behavior for new integrations"
        icon={Database}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Sync Frequency"
            type="select"
            value={settings.integrations.syncFrequency}
            onChange={(value) => handleSettingChange('integrations', 'syncFrequency', value)}
            options={[
              { value: 'realtime', label: 'Real-time' },
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' }
            ]}
          />
          
          <FormField
            label="Conflict Resolution Strategy"
            type="select"
            value={settings.integrations.conflictResolutionStrategy}
            onChange={(value) => handleSettingChange('integrations', 'conflictResolutionStrategy', value)}
            options={[
              { value: 'ai-resolve', label: 'AI Resolution' },
              { value: 'source-wins', label: 'Source Wins' },
              { value: 'target-wins', label: 'Target Wins' },
              { value: 'latest-wins', label: 'Latest Wins' }
            ]}
          />
        </div>

        <FormField
          label="Field Mapping Confidence Threshold"
          type="number"
          value={settings.integrations.fieldMappingConfidence}
          onChange={(value) => handleSettingChange('integrations', 'fieldMappingConfidence', parseFloat(value))}
          placeholder="0.8"
          description="Minimum confidence score for automatic field mapping (0.0 - 1.0)"
        />

        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.integrations.enableAutoSync}
            onChange={(value) => handleSettingChange('integrations', 'enableAutoSync', value)}
            label="Auto Sync"
            description="Automatically sync data when changes are detected"
          />
          
          <ToggleSwitch
            enabled={settings.integrations.enableConflictResolution}
            onChange={(value) => handleSettingChange('integrations', 'enableConflictResolution', value)}
            label="Conflict Resolution"
            description="Automatically resolve data conflicts using AI"
          />
          
          <ToggleSwitch
            enabled={settings.integrations.enableFieldMapping}
            onChange={(value) => handleSettingChange('integrations', 'enableFieldMapping', value)}
            label="AI Field Mapping"
            description="Use AI to automatically map fields between systems"
          />
        </div>
      </SettingSection>

      {/* Notification Settings */}
      <SettingSection
        title="Notifications"
        description="Configure how you receive alerts and updates"
        icon={Bell}
      >
        <div className="space-y-4">
          <ToggleSwitch
            enabled={settings.notifications.enableEmailNotifications}
            onChange={(value) => handleSettingChange('notifications', 'enableEmailNotifications', value)}
            label="Email Notifications"
            description="Receive alerts via email"
          />
          
          {settings.notifications.enableEmailNotifications && (
            <FormField
              label="Email Recipient"
              type="email"
              value={settings.notifications.emailRecipient}
              onChange={(value) => handleSettingChange('notifications', 'emailRecipient', value)}
              placeholder="admin@company.com"
            />
          )}
          
          <ToggleSwitch
            enabled={settings.notifications.enableWebhookNotifications}
            onChange={(value) => handleSettingChange('notifications', 'enableWebhookNotifications', value)}
            label="Webhook Notifications"
            description="Send alerts to webhook endpoints"
          />
          
          {settings.notifications.enableWebhookNotifications && (
            <FormField
              label="Webhook URL"
              value={settings.notifications.webhookUrl}
              onChange={(value) => handleSettingChange('notifications', 'webhookUrl', value)}
              placeholder="https://your-webhook-endpoint.com/alerts"
            />
          )}
          
          <ToggleSwitch
            enabled={settings.notifications.enableSlackNotifications}
            onChange={(value) => handleSettingChange('notifications', 'enableSlackNotifications', value)}
            label="Slack Notifications"
            description="Send alerts to Slack channels"
          />
          
          {settings.notifications.enableSlackNotifications && (
            <FormField
              label="Slack Webhook URL"
              value={settings.notifications.slackWebhookUrl}
              onChange={(value) => handleSettingChange('notifications', 'slackWebhookUrl', value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          )}
        </div>
      </SettingSection>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">System Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Application</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Version: 1.0.0</div>
                <div>Environment: Production Demo</div>
                <div>Build: 2024.01.15</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Database</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Type: MongoDB Atlas</div>
                <div>Status: <span className="text-green-600">Connected</span></div>
                <div>Storage: Free Tier (512MB)</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Hosting</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Frontend: Vercel</div>
                <div>Backend: Render.com</div>
                <div>CDN: Cloudflare</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Uptime: <span className="text-green-600">99.9%</span></div>
                <div>Avg Response: 120ms</div>
                <div>Last Deploy: 2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;