/**
 * Enhanced Department to Group Mapping Utilities
 * Comprehensive helper functions for managing department-based group assignments
 * Supports enterprise-grade validation, bulk operations, and Microsoft Graph integration
 */

// ========== COMMON DEPARTMENTS (Microsoft Best Practices) ==========
export const COMMON_DEPARTMENTS = [
  'Accounting',
  'Administration',
  'Customer Service',
  'Engineering',
  'Executive',
  'Facilities',
  'Finance',
  'Human Resources',
  'IT',
  'Legal',
  'Marketing',
  'Operations',
  'Product',
  'Research and Development',
  'Sales',
  'Security',
  'Support',
];

// ========== STORAGE KEY ==========
const STORAGE_KEY = 'departmentMappings';
const BACKUP_KEY = 'departmentMappings_backup';

// ========== CORE MAPPING OPERATIONS ==========

/**
 * Get all department mappings from localStorage
 * @returns {Array} Array of department mapping objects
 */
export const getDepartmentMappings = () => {
  try {
    const mappings = localStorage.getItem(STORAGE_KEY);
    return mappings ? JSON.parse(mappings) : [];
  } catch (error) {
    console.error('Error loading department mappings:', error);
    // Try to load from backup
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        console.log('Loaded mappings from backup');
        return JSON.parse(backup);
      }
    } catch (backupError) {
      console.error('Error loading backup:', backupError);
    }
    return [];
  }
};

/**
 * Get group IDs for a specific department
 * @param {string} department - The department name
 * @returns {Array<string>} Array of group IDs
 */
export const getGroupsForDepartment = (department) => {
  if (!department) return [];
  
  const mappings = getDepartmentMappings();
  const mapping = mappings.find(
    m => m.department.toLowerCase() === department.toLowerCase()
  );
  
  return mapping ? mapping.groupIds : [];
};

/**
 * Get detailed group information for a department
 * @param {string} department - The department name
 * @returns {Object} Mapping object with full details
 */
export const getDepartmentMapping = (department) => {
  if (!department) return null;
  
  const mappings = getDepartmentMappings();
  return mappings.find(
    m => m.department.toLowerCase() === department.toLowerCase()
  );
};

/**
 * Check if a department has any mapped groups
 * @param {string} department - The department name
 * @returns {boolean} True if department has mapped groups
 */
export const hasMappedGroups = (department) => {
  return getGroupsForDepartment(department).length > 0;
};

/**
 * Get all unique departments that have mappings
 * @returns {Array<string>} Array of department names
 */
export const getMappedDepartments = () => {
  const mappings = getDepartmentMappings();
  return mappings.map(m => m.department).filter(Boolean);
};

/**
 * Save department mappings to localStorage with backup
 * @param {Array} mappings - Array of department mapping objects
 * @returns {boolean} Success status
 */
export const saveDepartmentMappings = (mappings) => {
  try {
    // Validate mappings
    if (!Array.isArray(mappings)) {
      throw new Error('Mappings must be an array');
    }

    // Validate each mapping
    const validMappings = mappings.filter(m => {
      return m && 
             typeof m.department === 'string' && 
             m.department.trim().length > 0 &&
             Array.isArray(m.groupIds);
    });

    if (validMappings.length !== mappings.length) {
      console.warn(`Filtered out ${mappings.length - validMappings.length} invalid mappings`);
    }

    // Backup current mappings before saving
    const currentMappings = localStorage.getItem(STORAGE_KEY);
    if (currentMappings) {
      localStorage.setItem(BACKUP_KEY, currentMappings);
    }

    // Save new mappings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validMappings));
    return true;
  } catch (error) {
    console.error('Error saving department mappings:', error);
    return false;
  }
};

// ========== ADVANCED OPERATIONS ==========

/**
 * Add a new department mapping
 * @param {string} department - Department name
 * @param {Array<string>} groupIds - Array of group IDs
 * @param {Object} options - Additional options (description, createdBy, etc.)
 * @returns {boolean} Success status
 */
export const addDepartmentMapping = (department, groupIds, options = {}) => {
  try {
    if (!department || !Array.isArray(groupIds)) {
      throw new Error('Invalid parameters');
    }

    const mappings = getDepartmentMappings();
    
    // Check if department already exists
    const existingIndex = mappings.findIndex(
      m => m.department.toLowerCase() === department.toLowerCase()
    );

    const mapping = {
      department: department.trim(),
      groupIds: [...new Set(groupIds)], // Remove duplicates
      description: options.description || '',
      createdAt: options.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: options.createdBy || 'system',
      ...options,
    };

    if (existingIndex >= 0) {
      // Update existing
      mappings[existingIndex] = {
        ...mappings[existingIndex],
        ...mapping,
        createdAt: mappings[existingIndex].createdAt, // Preserve original creation date
      };
    } else {
      // Add new
      mappings.push(mapping);
    }

    return saveDepartmentMappings(mappings);
  } catch (error) {
    console.error('Error adding department mapping:', error);
    return false;
  }
};

/**
 * Update an existing department mapping
 * @param {string} department - Department name
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success status
 */
export const updateDepartmentMapping = (department, updates) => {
  try {
    const mappings = getDepartmentMappings();
    const index = mappings.findIndex(
      m => m.department.toLowerCase() === department.toLowerCase()
    );

    if (index === -1) {
      throw new Error(`Department "${department}" not found`);
    }

    mappings[index] = {
      ...mappings[index],
      ...updates,
      department: mappings[index].department, // Prevent changing the key
      updatedAt: new Date().toISOString(),
    };

    return saveDepartmentMappings(mappings);
  } catch (error) {
    console.error('Error updating department mapping:', error);
    return false;
  }
};

/**
 * Delete a department mapping
 * @param {string} department - Department name
 * @returns {boolean} Success status
 */
export const deleteDepartmentMapping = (department) => {
  try {
    const mappings = getDepartmentMappings();
    const filtered = mappings.filter(
      m => m.department.toLowerCase() !== department.toLowerCase()
    );

    if (filtered.length === mappings.length) {
      console.warn(`Department "${department}" not found`);
      return false;
    }

    return saveDepartmentMappings(filtered);
  } catch (error) {
    console.error('Error deleting department mapping:', error);
    return false;
  }
};

/**
 * Add a group to a department's mapping
 * @param {string} department - Department name
 * @param {string} groupId - Group ID to add
 * @returns {boolean} Success status
 */
export const addGroupToDepartment = (department, groupId) => {
  try {
    const mapping = getDepartmentMapping(department);
    
    if (!mapping) {
      // Create new mapping
      return addDepartmentMapping(department, [groupId]);
    }

    // Add to existing
    if (!mapping.groupIds.includes(groupId)) {
      mapping.groupIds.push(groupId);
      return updateDepartmentMapping(department, {groupIds: mapping.groupIds});
    }

    return true; // Already exists
  } catch (error) {
    console.error('Error adding group to department:', error);
    return false;
  }
};

/**
 * Remove a group from a department's mapping
 * @param {string} department - Department name
 * @param {string} groupId - Group ID to remove
 * @returns {boolean} Success status
 */
export const removeGroupFromDepartment = (department, groupId) => {
  try {
    const mapping = getDepartmentMapping(department);
    
    if (!mapping) {
      return false;
    }

    const updatedGroupIds = mapping.groupIds.filter(id => id !== groupId);
    return updateDepartmentMapping(department, {groupIds: updatedGroupIds});
  } catch (error) {
    console.error('Error removing group from department:', error);
    return false;
  }
};

// ========== BULK OPERATIONS ==========

/**
 * Import department mappings from JSON
 * @param {string} jsonString - JSON string of mappings
 * @param {boolean} merge - Whether to merge with existing or replace
 * @returns {Object} Result with success status and details
 */
export const importMappings = (jsonString, merge = true) => {
  try {
    const importedMappings = JSON.parse(jsonString);
    
    if (!Array.isArray(importedMappings)) {
      throw new Error('Invalid format: expected array');
    }

    let mappings;
    if (merge) {
      const existing = getDepartmentMappings();
      const merged = [...existing];
      
      importedMappings.forEach(imported => {
        const index = merged.findIndex(
          m => m.department.toLowerCase() === imported.department.toLowerCase()
        );
        if (index >= 0) {
          merged[index] = {...merged[index], ...imported};
        } else {
          merged.push(imported);
        }
      });
      
      mappings = merged;
    } else {
      mappings = importedMappings;
    }

    const success = saveDepartmentMappings(mappings);
    return {
      success,
      imported: importedMappings.length,
      total: mappings.length,
    };
  } catch (error) {
    console.error('Error importing mappings:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Export department mappings to JSON
 * @returns {string} JSON string of all mappings
 */
export const exportMappings = () => {
  const mappings = getDepartmentMappings();
  return JSON.stringify(mappings, null, 2);
};

/**
 * Clear all department mappings (with confirmation)
 * @param {boolean} confirmed - Must be true to execute
 * @returns {boolean} Success status
 */
export const clearAllMappings = (confirmed = false) => {
  if (!confirmed) {
    throw new Error('Clearing all mappings requires confirmation');
  }

  try {
    // Backup before clearing
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      localStorage.setItem(
        `${BACKUP_KEY}_${Date.now()}`,
        current
      );
    }

    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing mappings:', error);
    return false;
  }
};

/**
 * Restore from backup
 * @returns {boolean} Success status
 */
export const restoreFromBackup = () => {
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) {
      throw new Error('No backup found');
    }

    localStorage.setItem(STORAGE_KEY, backup);
    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return false;
  }
};

// ========== VALIDATION & UTILITIES ==========

/**
 * Validate a department mapping
 * @param {Object} mapping - Mapping object to validate
 * @returns {Object} Validation result with errors
 */
export const validateMapping = (mapping) => {
  const errors = [];

  if (!mapping) {
    errors.push('Mapping is required');
    return {valid: false, errors};
  }

  if (!mapping.department || typeof mapping.department !== 'string') {
    errors.push('Department name is required');
  }

  if (!Array.isArray(mapping.groupIds)) {
    errors.push('Group IDs must be an array');
  } else if (mapping.groupIds.length === 0) {
    errors.push('At least one group ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get mapping statistics
 * @returns {Object} Statistics about current mappings
 */
export const getMappingStats = () => {
  const mappings = getDepartmentMappings();
  
  return {
    totalDepartments: mappings.length,
    totalGroupAssignments: mappings.reduce((sum, m) => sum + m.groupIds.length, 0),
    averageGroupsPerDepartment: mappings.length > 0 
      ? (mappings.reduce((sum, m) => sum + m.groupIds.length, 0) / mappings.length).toFixed(2)
      : 0,
    departmentsWithoutGroups: mappings.filter(m => m.groupIds.length === 0).length,
    lastUpdated: mappings.length > 0 
      ? Math.max(...mappings.map(m => new Date(m.updatedAt || m.createdAt).getTime()))
      : null,
  };
};

/**
 * Search departments by name or description
 * @param {string} searchTerm - Search term
 * @returns {Array} Matching mappings
 */
export const searchDepartments = (searchTerm) => {
  if (!searchTerm) return getDepartmentMappings();

  const term = searchTerm.toLowerCase();
  const mappings = getDepartmentMappings();
  
  return mappings.filter(m => 
    m.department.toLowerCase().includes(term) ||
    (m.description && m.description.toLowerCase().includes(term))
  );
};

export default {
  // Core operations
  getDepartmentMappings,
  getGroupsForDepartment,
  getDepartmentMapping,
  hasMappedGroups,
  getMappedDepartments,
  saveDepartmentMappings,
  
  // Advanced operations
  addDepartmentMapping,
  updateDepartmentMapping,
  deleteDepartmentMapping,
  addGroupToDepartment,
  removeGroupFromDepartment,
  
  // Bulk operations
  importMappings,
  exportMappings,
  clearAllMappings,
  restoreFromBackup,
  
  // Utilities
  validateMapping,
  getMappingStats,
  searchDepartments,
  
  // Constants
  COMMON_DEPARTMENTS,
};
