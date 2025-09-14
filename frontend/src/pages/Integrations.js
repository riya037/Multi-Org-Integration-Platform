import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Settings, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Eye,
  Edit
} from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const Integrations = ({ onDataChange }) => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalIntegrations: 0
  });

  // Load integrations
  const loadIntegrations = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      
      const data = await apiService.integrations.getAll(params);
      setIntegrations(data.integrations || []);
      setPagination(data.pagination || pagination);
      
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [searchTerm, statusFilter]);

  // Handle sync integration
  const handleSync = async (integration) => {
    try {
      await apiService.integrations.sync(integration._id);
      toast.success(`Sync triggered for ${integration.name}`);
      loadIntegrations(pagination.currentPage);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to trigger sync');
    }
  };

  // Handle delete integration
  const handleDelete = async (integration) => {
    if (!window.confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      return;
    }

    try {
      await apiService.integrations.delete(integration._id);
      toast.success(`Integration "${integration.name}" deleted`);
      loadIntegrations(pagination.currentPage);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete integration');
    }
  };

  // Get status icon and color
  const getStatusDisplay = (integration) => {
    const { status, isActive } = integration;
    
    if (!isActive) {
      return { icon: Pause, color: 'text-gray-400', bgColor: 'bg-gray-100', label: 'Inactive' };
    }
    
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100', label: 'Active' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Error' };
      case 'syncing':
        return { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'Syncing' };
      default:
        return { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Pending' };
    }
  };

  // Integration Card Component
  const IntegrationCard = ({ integration }) => {
    const statusDisplay = getStatusDisplay(integration);
    const StatusIcon = statusDisplay.icon;

    return (
      <div className="card hover-lift">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${statusDisplay.bgColor}`}>
                  <Zap className={`w-5 h-5 ${statusDisplay.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{integration.description || 'No description'}</p>
                </div>
              </div>
              
              {/* Source and Target */}
              <div className="mt-4 flex items-center space-x-4 text-sm">
                <div className="flex-1">
                  <span className="text-gray-500">Source:</span>
                  <span className="ml-2 font-medium">{integration.sourceOrg?.name}</span>
                  <span className="text-gray-400 ml-1">({integration.sourceOrg?.objectType})</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex-1">
                  <span className="text-gray-500">Target:</span>
                  <span className="ml-2 font-medium">{integration.targetOrg?.name}</span>
                  <span className="text-gray-400 ml-1">({integration.targetOrg?.objectType})</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {integration.syncStats?.totalSyncs || 0}
                  </div>
                  <div className="text-gray-500">Total Syncs</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {integration.successRate || 0}%
                  </div>
                  <div className="text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {integration.fieldMappings?.length || 0}
                  </div>
                  <div className="text-gray-500">Field Mappings</div>
                </div>
              </div>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-start space-x-2">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusDisplay.label}
              </div>
              
              <div className="relative">
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                  onClick={() => setSelectedIntegration(integration)}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Last sync info */}
          {integration.lastSyncTime && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Last sync: {new Date(integration.lastSyncTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quick Actions Menu
  const QuickActionsMenu = ({ integration, onClose }) => {
    if (!integration) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
          </div>
          <div className="py-2">
            <button
              onClick={() => {
                handleSync(integration);
                onClose();
              }}
              className="w-full px-6 py-3 text-left flex items-center space-x-3 hover:bg-gray-50"
            >
              <Play className="w-4 h-4 text-blue-500" />
              <span>Trigger Sync</span>
            </button>
            <button
              onClick={() => {
                // Navigate to integration details
                onClose();
              }}
              className="w-full px-6 py-3 text-left flex items-center space-x-3 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4 text-gray-500" />
              <span>View Details</span>
            </button>
            <button
              onClick={() => {
                // Navigate to edit integration
                onClose();
              }}
              className="w-full px-6 py-3 text-left flex items-center space-x-3 hover:bg-gray-50"
            >
              <Edit className="w-4 h-4 text-gray-500" />
              <span>Edit Settings</span>
            </button>
            <button
              onClick={() => {
                handleDelete(integration);
                onClose();
              }}
              className="w-full px-6 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Integration</span>
            </button>
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your Salesforce org integrations
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Integration
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search integrations..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Status filter */}
        <div className="sm:w-48">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
            <option value="syncing">Syncing</option>
          </select>
        </div>
      </div>

      {/* Integrations List */}
      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card">
                <div className="card-body animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-64"></div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : integrations.length > 0 ? (
          <>
            {integrations.map(integration => (
              <IntegrationCard key={integration._id} integration={integration} />
            ))}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => loadIntegrations(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadIntegrations(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => loadIntegrations(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="btn-secondary rounded-r-none disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadIntegrations(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="btn-secondary rounded-l-none disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // Empty state
          <div className="card">
            <div className="card-body text-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first integration.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Integration
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Menu */}
      {selectedIntegration && (
        <QuickActionsMenu
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}

      {/* Create Integration Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Integration</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                This feature is coming soon! For now, integrations are created automatically 
                with demo data to showcase the platform capabilities.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Demo Mode Active
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        The platform is running in demo mode with sample integrations 
                        to showcase AI-powered field mapping and real-time sync capabilities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;