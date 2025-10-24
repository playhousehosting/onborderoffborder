/**
 * Department to Group Mapping Utilities
 * Helper functions for managing department-based group assignments
 */

/**
 * Get all department mappings from localStorage
 * @returns {Array} Array of department mapping objects
 */
export const getDepartmentMappings = () => {
  try {
    const mappings = localStorage.getItem('departmentMappings');
    return mappings ? JSON.parse(mappings) : [];
  } catch (error) {
    console.error('Error loading department mappings:', error);
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
 * Save department mappings to localStorage
 * @param {Array} mappings - Array of department mapping objects
 */
export const saveDepartmentMappings = (mappings) => {
  try {
    localStorage.setItem('departmentMappings', JSON.stringify(mappings));
    return true;
  } catch (error) {
    console.error('Error saving department mappings:', error);
    return false;
  }
};
