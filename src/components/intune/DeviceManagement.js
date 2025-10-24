import React, { useState, useEffect } from 'react';
import { graphService } from '../../services/graphService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const DeviceManagement = () => {
  const { hasPermission } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDevices, setTotalDevices] = useState(0);
  const devicesPerPage = 25;

  useEffect(() => {
    if (hasPermission('deviceManagement')) {
      fetchDevices();
    }
  }, [currentPage, searchTerm, hasPermission]);

  const fetchDevices = async () => {
    if (!hasPermission('deviceManagement')) {
      return;
    }

    try {
      setLoading(true);
      let filterQuery = '';
      
      if (searchTerm) {
        filterQuery = `&$filter=contains(deviceName,'${searchTerm}') or contains(userPrincipalName,'${searchTerm}')`;
      }
      
      const skip = (currentPage - 1) * devicesPerPage;
      const response = await graphService.makeRequest(
        `/deviceManagement/managedDevices?$top=${devicesPerPage}&$skip=${skip}${filterQuery}&$select=id,deviceName,manufacturer,model,operatingSystem,osVersion,complianceState,lastSyncDateTime,userPrincipalName,serialNumber`
      );
      
      setDevices(response.value || []);
      setTotalDevices(response['@odata.count'] || response.value?.length || 0);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDevices();
  };

  const handleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(device => device.id));
    }
  };

  const handleRetireDevice = async (deviceId) => {
    try {
      await graphService.retireDevice(deviceId);
      toast.success('Device retired successfully');
      fetchDevices();
    } catch (error) {
      console.error('Error retiring device:', error);
      toast.error('Failed to retire device');
    }
  };

  const handleWipeDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to wipe this device? This action cannot be undone.')) {
      return;
    }

    try {
      await graphService.wipeDevice(deviceId, false, false);
      toast.success('Device wipe initiated successfully');
      fetchDevices();
    } catch (error) {
      console.error('Error wiping device:', error);
      toast.error('Failed to wipe device');
    }
  };

  const handleSyncDevice = async (deviceId) => {
    try {
      await graphService.syncDevice(deviceId);
      toast.success('Device sync initiated successfully');
      fetchDevices();
    } catch (error) {
      console.error('Error syncing device:', error);
      toast.error('Failed to sync device');
    }
  };

  const handleBulkRetire = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select devices to retire');
      return;
    }

    if (!window.confirm(`Are you sure you want to retire ${selectedDevices.length} device(s)?`)) {
      return;
    }

    try {
      for (const deviceId of selectedDevices) {
        await graphService.retireDevice(deviceId);
      }
      toast.success(`${selectedDevices.length} device(s) retired successfully`);
      setSelectedDevices([]);
      fetchDevices();
    } catch (error) {
      console.error('Error retiring devices:', error);
      toast.error('Failed to retire some devices');
    }
  };

  const handleBulkWipe = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select devices to wipe');
      return;
    }

    if (!window.confirm(`Are you sure you want to wipe ${selectedDevices.length} device(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      for (const deviceId of selectedDevices) {
        await graphService.wipeDevice(deviceId, false, false);
      }
      toast.success(`Wipe initiated for ${selectedDevices.length} device(s)`);
      setSelectedDevices([]);
      fetchDevices();
    } catch (error) {
      console.error('Error wiping devices:', error);
      toast.error('Failed to wipe some devices');
    }
  };

  const getComplianceStatusBadge = (complianceState) => {
    switch (complianceState) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Compliant
          </span>
        );
      case 'noncompliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Non-compliant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400">
            Unknown
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  if (!hasPermission('deviceManagement')) {
    return (
      <div className="text-center py-12">
        <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You do not have permission to manage devices.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Device Management</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage and monitor Intune-managed devices in your organization
        </p>
      </div>

      {/* Search and Actions */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search by device name or user"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
            
            <div className="flex gap-2">
              <button
                onClick={fetchDevices}
                disabled={loading}
                className="btn btn-secondary"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              
              {selectedDevices.length > 0 && (
                <>
                  <button
                    onClick={handleBulkRetire}
                    className="btn btn-warning"
                  >
                    Retire Selected ({selectedDevices.length})
                  </button>
                  <button
                    onClick={handleBulkWipe}
                    className="btn btn-danger"
                  >
                    Wipe Selected ({selectedDevices.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
        Showing {devices.length} of {totalDevices} devices
      </div>

      {/* Devices Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : devices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={selectedDevices.length === devices.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Device
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      OS
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Sync
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {devices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => handleDeviceSelection(device.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <ComputerDesktopIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {device.deviceName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {device.manufacturer} {device.model}
                            </div>
                            {device.serialNumber && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                S/N: {device.serialNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {device.userPrincipalName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {device.operatingSystem} {device.osVersion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getComplianceStatusBadge(device.complianceState)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(device.lastSyncDateTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleSyncDevice(device.id)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Sync Device"
                          >
                            Sync
                          </button>
                          <button
                            onClick={() => handleRetireDevice(device.id)}
                            className="text-warning-600 hover:text-warning-900"
                            title="Retire Device"
                          >
                            Retire
                          </button>
                          <button
                            onClick={() => handleWipeDevice(device.id)}
                            className="text-danger-600 hover:text-danger-900"
                            title="Wipe Device"
                          >
                            Wipe
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No devices found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalDevices > devicesPerPage && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * devicesPerPage) + 1} to{' '}
            {Math.min(currentPage * devicesPerPage, totalDevices)} of {totalDevices} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage} of {Math.ceil(totalDevices / devicesPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalDevices / devicesPerPage)))}
              disabled={currentPage === Math.ceil(totalDevices / devicesPerPage)}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;