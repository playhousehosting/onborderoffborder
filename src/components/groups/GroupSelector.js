import React, { useState, useEffect } from 'react';
import { getActiveService, getAuthMode } from '../../services/serviceFactory';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

/**
 * Reusable Group Selector Component
 * 
 * @param {Object} props
 * @param {Array} props.selectedGroups - Array of currently selected group objects
 * @param {Function} props.onGroupsChange - Callback when groups selection changes
 * @param {Array} props.groupTypes - Filter by group types: ['distribution', 'security', 'microsoft365']
 * @param {boolean} props.multiple - Allow multiple selection (default: true)
 * @param {string} props.label - Label for the component
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether selection is required
 */
const GroupSelector = ({
  selectedGroups = [],
  onGroupsChange,
  groupTypes = [],
  multiple = true,
  label = 'Select Groups',
  placeholder = 'Search for groups...',
  required = false,
}) => {
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  // Use serviceFactory to get the correct service based on auth mode
  const authMode = getAuthMode();
  const service = getActiveService();
  
  // Determine which auth is active based on serviceFactory mode
  const isConvexAuth = authMode === 'convex';
  const isMSALAuth = authMode === 'msal';
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchGroups();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, groupTypes]);

  const searchGroups = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const results = await service.searchGroups(searchTerm, {
        groupTypes,
        top: 20,
      });
      setSearchResults(results.value || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching groups:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGroupSelect = (group) => {
    if (multiple) {
      const isAlreadySelected = selectedGroups.some(g => g.id === group.id);
      if (isAlreadySelected) {
        // Remove group
        onGroupsChange(selectedGroups.filter(g => g.id !== group.id));
      } else {
        // Add group
        onGroupsChange([...selectedGroups, group]);
      }
    } else {
      // Single selection
      onGroupsChange([group]);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  const handleRemoveGroup = (groupId) => {
    onGroupsChange(selectedGroups.filter(g => g.id !== groupId));
  };

  const getGroupTypeBadge = (group) => {
    if (group.groupTypes?.includes('Unified')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
          <SparklesIcon className="h-3 w-3 mr-1" />
          M365
        </span>
      );
    } else if (group.mailEnabled && !group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          <EnvelopeIcon className="h-3 w-3 mr-1" />
          Distribution
        </span>
      );
    } else if (group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <ShieldCheckIcon className="h-3 w-3 mr-1" />
          Security
        </span>
      );
    }
    return null;
  };

  const isGroupSelected = (groupId) => {
    return selectedGroups.some(g => g.id === groupId);
  };

  return (
    <div className="space-y-3">
      <label className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected Groups */}
      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedGroups.map((group) => (
            <div
              key={group.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
            >
              <UserGroupIcon className="h-4 w-4 text-primary-600" />
              <span className="text-primary-900 font-medium">{group.displayName}</span>
              {getGroupTypeBadge(group)}
              <button
                type="button"
                onClick={() => handleRemoveGroup(group.id)}
                className="ml-1 text-primary-600 hover:text-primary-800"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="form-input pl-10"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowDropdown(true)}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {searchResults.map((group) => {
              const selected = isGroupSelected(group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className={`
                    p-3 cursor-pointer border-b border-gray-100 last:border-b-0
                    ${selected ? 'bg-primary-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`
                          h-10 w-10 rounded-full flex items-center justify-center
                          ${selected ? 'bg-primary-100' : 'bg-gray-100'}
                        `}>
                          <UserGroupIcon className={`
                            h-6 w-6
                            ${selected ? 'text-primary-600' : 'text-gray-600'}
                          `} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {group.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {group.mail || 'No email address'}
                        </p>
                        <div className="mt-1">
                          {getGroupTypeBadge(group)}
                        </div>
                      </div>
                    </div>
                    {selected && (
                      <CheckIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {showDropdown && searchTerm && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
            <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No groups found</p>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default GroupSelector;

