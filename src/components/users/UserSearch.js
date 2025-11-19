import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import msalGraphService from '../../services/msalGraphService';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { logger } from '../../utils/logger';
import { SkeletonTable } from '../common/Skeleton';
import UserDetailModal from './UserDetailModal';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  UserIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const UserSearch = () => {
  const { hasPermission, getAccessToken } = useMSALAuth();
  const service = msalGraphService;
  
  // Set up MSAL graph service with token function
  useEffect(() => {
    msalGraphService.setGetTokenFunction(getAccessToken);
  }, [getAccessToken]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users for client-side filtering
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search by 500ms
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    accountEnabled: 'all',
    department: 'all',
    jobTitle: 'all',
  });
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableJobTitles, setAvailableJobTitles] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const usersPerPage = 25;

  // Fetch all users once on mount
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Filter and paginate when filters/search/page changes
  useEffect(() => {
    filterAndPaginateUsers();
  }, [currentPage, debouncedSearchTerm, filters, allUsers]); // Use debounced search term

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      logger.debug('📊 Fetching all users for search...');
      // Explicitly request accountEnabled and other fields needed for display and filtering
      const response = await service.getAllUsers({
        select: 'id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled'
      });
      const fetchedUsers = response.value || [];
      setAllUsers(fetchedUsers);
      logger.success(`✅ Loaded ${fetchedUsers.length} users`);

      // Extract unique departments and job titles for filters
      const departments = [...new Set(fetchedUsers.map(u => u.department).filter(Boolean))];
      const jobTitles = [...new Set(fetchedUsers.map(u => u.jobTitle).filter(Boolean))];
      setAvailableDepartments(departments.sort());
      setAvailableJobTitles(jobTitles.sort());
    } catch (error) {
      logger.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filterAndPaginateUsers = () => {
    let filtered = [...allUsers];

    // Apply search filter using debounced search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.userPrincipalName?.toLowerCase().includes(searchLower) ||
        user.mail?.toLowerCase().includes(searchLower)
      );
    }

    // Apply account status filter
    if (filters.accountEnabled !== 'all') {
      const isEnabled = filters.accountEnabled === 'enabled';
      filtered = filtered.filter(user => user.accountEnabled === isEnabled);
    }

    // Apply department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(user => user.department === filters.department);
    }

    // Apply job title filter
    if (filters.jobTitle !== 'all') {
      filtered = filtered.filter(user => user.jobTitle === filters.jobTitle);
    }

    setTotalUsers(filtered.length);

    // Paginate
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    setUsers(filtered.slice(startIndex, endIndex));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    // Filter will be applied automatically by useEffect
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      accountEnabled: 'all',
      department: 'all',
      jobTitle: 'all',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleUserUpdated = () => {
    // Refresh user list
    fetchAllUsers();
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.accountEnabled !== 'all') count++;
    if (filters.department !== 'all') count++;
    if (filters.jobTitle !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  const getStatusBadge = (user) => {
    if (user.accountEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
          Disabled
        </span>
      );
    }
  };

  return (
    <div className="animate-in">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">User Search</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Search and manage users in your organization
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="form-input pl-10"
                    placeholder="Search by name, email, or username"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} relative`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-danger-500 text-white text-xs rounded-full">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Status
                    </label>
                    <select
                      className="form-input"
                      value={filters.accountEnabled}
                      onChange={(e) => handleFilterChange('accountEnabled', e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="enabled">Active Only</option>
                      <option value="disabled">Disabled Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      className="form-input"
                      value={filters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title
                    </label>
                    <select
                      className="form-input"
                      value={filters.jobTitle}
                      onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                    >
                      <option value="all">All Titles</option>
                      {availableJobTitles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {getActiveFilterCount() > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
        Showing {users.length} of {totalUsers} users
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <SkeletonTable rows={10} cols={5} />
          ) : users.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th scope="col" className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                          </div>
                          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.displayName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.mail || user.userPrincipalName}
                            </div>
                            <div className="sm:hidden mt-1">
                              {getStatusBadge(user)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user)}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.department || '—'}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.jobTitle || '—'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => handleViewUserDetails(user)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 flex items-center justify-end text-xs sm:text-sm"
                          >
                            <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Details</span>
                            <span className="sm:hidden">View</span>
                          </button>
                          
                          {hasPermission('userManagement') && (
                            <>
                              {user.accountEnabled ? (
                                <Link
                                  to={`/offboarding/${user.id}`}
                                  className="text-danger-600 hover:text-danger-900 dark:text-danger-400 dark:hover:text-danger-300"
                                >
                                  Offboard
                                </Link>
                              ) : (
                                <Link
                                  to={`/onboarding/${user.id}`}
                                  className="text-success-600 hover:text-success-900 dark:text-success-400 dark:hover:text-success-300"
                                >
                                  Onboard
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No users found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 order-2 sm:order-1">
            <span className="hidden sm:inline">
              Showing {((currentPage - 1) * usersPerPage) + 1} to{' '}
              {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} results
            </span>
            <span className="sm:hidden">
              {((currentPage - 1) * usersPerPage) + 1}-{Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers}
            </span>
          </div>
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
            <span className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserSearch;
