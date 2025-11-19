/**
 * Intune Script Management Service
 * Manage PowerShell and Shell scripts for Windows, macOS, and Linux devices
 */

import msalGraphService from '../msalGraphService';

class IntuneScriptService {
  /**
   * Script types
   */
  static SCRIPT_TYPES = {
    POWERSHELL: 'PowerShell',
    SHELL: 'Shell',
    BATCH: 'Batch'
  };

  /**
   * Execution contexts
   */
  static EXECUTION_CONTEXTS = {
    SYSTEM: 'system',
    USER: 'user'
  };

  /**
   * Fetch all device management scripts
   * @returns {Promise<Array>} Array of scripts
   */
  async fetchAllScripts() {
    const endpoints = [
      { type: 'PowerShell', endpoint: '/deviceManagement/deviceManagementScripts' },
      { type: 'Shell', endpoint: '/deviceManagement/deviceShellScripts' }
    ];

    const allScripts = [];

    for (const { type, endpoint } of endpoints) {
      try {
        const response = await msalGraphService.makeRequest(endpoint, 'GET');
        const scripts = (response.value || []).map(script => ({
          ...script,
          scriptType: type
        }));
        allScripts.push(...scripts);
      } catch (error) {
        console.error(`Error fetching ${type} scripts:`, error);
      }
    }

    return allScripts;
  }

  /**
   * Fetch PowerShell scripts
   * @returns {Promise<Array>} Array of PowerShell scripts
   */
  async fetchPowerShellScripts() {
    const response = await msalGraphService.makeRequest(
      '/deviceManagement/deviceManagementScripts',
      'GET'
    );

    return response.value || [];
  }

  /**
   * Fetch Shell scripts (macOS/Linux)
   * @returns {Promise<Array>} Array of Shell scripts
   */
  async fetchShellScripts() {
    const response = await msalGraphService.makeRequest(
      '/deviceManagement/deviceShellScripts',
      'GET'
    );

    return response.value || [];
  }

  /**
   * Get script content
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @returns {Promise<string>} Decoded script content
   */
  async getScriptContent(scriptId, scriptType) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}`
      : `/deviceManagement/deviceShellScripts/${scriptId}`;

    const response = await msalGraphService.makeRequest(endpoint, 'GET');
    
    // Decode base64 content
    if (response.scriptContent) {
      return atob(response.scriptContent);
    }

    return '';
  }

  /**
   * Create PowerShell script
   * @param {Object} scriptData - Script configuration
   * @returns {Promise<Object>} Created script
   */
  async createPowerShellScript(scriptData) {
    const {
      displayName,
      description,
      scriptContent,
      runAsAccount = 'system',
      enforceSignatureCheck = false,
      runAs32Bit = false,
      fileName
    } = scriptData;

    // Encode script content to base64
    const encodedContent = btoa(scriptContent);

    const script = {
      displayName,
      description: description || '',
      scriptContent: encodedContent,
      runAsAccount,
      enforceSignatureCheck,
      runAs32Bit,
      fileName: fileName || `${displayName}.ps1`
    };

    const response = await msalGraphService.makeRequest(
      '/deviceManagement/deviceManagementScripts',
      'POST',
      script
    );

    return response;
  }

  /**
   * Create Shell script (macOS/Linux)
   * @param {Object} scriptData - Script configuration
   * @returns {Promise<Object>} Created script
   */
  async createShellScript(scriptData) {
    const {
      displayName,
      description,
      scriptContent,
      runAsAccount = 'system',
      fileName
    } = scriptData;

    // Encode script content to base64
    const encodedContent = btoa(scriptContent);

    const script = {
      displayName,
      description: description || '',
      scriptContent: encodedContent,
      runAsAccount,
      fileName: fileName || `${displayName}.sh`
    };

    const response = await msalGraphService.makeRequest(
      '/deviceManagement/deviceShellScripts',
      'POST',
      script
    );

    return response;
  }

  /**
   * Update script
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated script
   */
  async updateScript(scriptId, scriptType, updates) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}`
      : `/deviceManagement/deviceShellScripts/${scriptId}`;

    // Encode script content if provided
    if (updates.scriptContent) {
      updates.scriptContent = btoa(updates.scriptContent);
    }

    const response = await msalGraphService.makeRequest(
      endpoint,
      'PATCH',
      updates
    );

    return response;
  }

  /**
   * Delete script
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @returns {Promise<void>}
   */
  async deleteScript(scriptId, scriptType) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}`
      : `/deviceManagement/deviceShellScripts/${scriptId}`;

    await msalGraphService.makeRequest(endpoint, 'DELETE');
  }

  /**
   * Get script assignments
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @returns {Promise<Array>} Array of assignments
   */
  async getScriptAssignments(scriptId, scriptType) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}/assignments`
      : `/deviceManagement/deviceShellScripts/${scriptId}/assignments`;

    const response = await msalGraphService.makeRequest(endpoint, 'GET');
    return response.value || [];
  }

  /**
   * Assign script to groups
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @param {Array} groupIds - Array of group IDs
   * @returns {Promise<void>}
   */
  async assignScript(scriptId, scriptType, groupIds) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}/assign`
      : `/deviceManagement/deviceShellScripts/${scriptId}/assign`;

    const assignments = groupIds.map(groupId => ({
      target: {
        '@odata.type': '#microsoft.graph.groupAssignmentTarget',
        groupId
      }
    }));

    await msalGraphService.makeRequest(endpoint, 'POST', {
      deviceManagementScriptAssignments: assignments
    });
  }

  /**
   * Get script run states
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @returns {Promise<Object>} Run states summary
   */
  async getScriptRunStates(scriptId, scriptType) {
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}/deviceRunStates`
      : `/deviceManagement/deviceShellScripts/${scriptId}/deviceRunStates`;

    try {
      const response = await msalGraphService.makeRequest(endpoint, 'GET');
      const runStates = response.value || [];

      // Summarize results
      const summary = {
        total: runStates.length,
        success: 0,
        failed: 0,
        pending: 0,
        runStates: runStates
      };

      runStates.forEach(state => {
        if (state.runState === 'success') {
          summary.success++;
        } else if (state.runState === 'fail') {
          summary.failed++;
        } else {
          summary.pending++;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error fetching run states:', error);
      return { total: 0, success: 0, failed: 0, pending: 0, runStates: [] };
    }
  }

  /**
   * Import script from file
   * @param {File} file - Script file
   * @param {Object} metadata - Script metadata
   * @returns {Promise<Object>} Created script
   */
  async importScriptFromFile(file, metadata) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          
          // Determine script type from file extension
          const extension = file.name.split('.').pop().toLowerCase();
          const scriptType = extension === 'ps1' ? 'PowerShell' : 'Shell';

          const scriptData = {
            displayName: metadata.displayName || file.name,
            description: metadata.description || '',
            scriptContent: content,
            runAsAccount: metadata.runAsAccount || 'system',
            enforceSignatureCheck: metadata.enforceSignatureCheck || false,
            runAs32Bit: metadata.runAs32Bit || false,
            fileName: file.name
          };

          let script;
          if (scriptType === 'PowerShell') {
            script = await this.createPowerShellScript(scriptData);
          } else {
            script = await this.createShellScript(scriptData);
          }

          resolve({ script, scriptType });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Export script to file
   * @param {string} scriptId - Script ID
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @param {string} fileName - Output filename
   */
  async exportScriptToFile(scriptId, scriptType, fileName) {
    const content = await this.getScriptContent(scriptId, scriptType);
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Bulk import scripts from multiple files
   * @param {FileList} files - Script files
   * @param {Object} defaultMetadata - Default metadata for all scripts
   * @returns {Promise<Array>} Array of import results
   */
  async bulkImportScripts(files, defaultMetadata = {}) {
    const results = [];

    for (const file of files) {
      try {
        const metadata = {
          ...defaultMetadata,
          displayName: defaultMetadata.displayName || file.name.replace(/\.[^/.]+$/, '')
        };

        const result = await this.importScriptFromFile(file, metadata);
        results.push({
          success: true,
          fileName: file.name,
          script: result.script,
          scriptType: result.scriptType
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: file.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Clone script
   * @param {string} scriptId - Script ID to clone
   * @param {string} scriptType - Script type (PowerShell or Shell)
   * @param {string} newName - Name for the cloned script
   * @returns {Promise<Object>} Cloned script
   */
  async cloneScript(scriptId, scriptType, newName) {
    // Get original script
    const endpoint = scriptType === 'PowerShell'
      ? `/deviceManagement/deviceManagementScripts/${scriptId}`
      : `/deviceManagement/deviceShellScripts/${scriptId}`;

    const original = await msalGraphService.makeRequest(endpoint, 'GET');
    
    // Decode content
    const content = original.scriptContent ? atob(original.scriptContent) : '';

    // Create clone with new name
    const cloneData = {
      displayName: newName,
      description: original.description ? `Copy of ${original.description}` : '',
      scriptContent: content,
      runAsAccount: original.runAsAccount,
      enforceSignatureCheck: original.enforceSignatureCheck,
      runAs32Bit: original.runAs32Bit,
      fileName: original.fileName
    };

    if (scriptType === 'PowerShell') {
      return await this.createPowerShellScript(cloneData);
    } else {
      return await this.createShellScript(cloneData);
    }
  }

  /**
   * Validate script syntax (basic validation)
   * @param {string} scriptContent - Script content
   * @param {string} scriptType - Script type
   * @returns {Object} Validation result
   */
  validateScriptSyntax(scriptContent, scriptType) {
    const errors = [];
    const warnings = [];

    if (!scriptContent || scriptContent.trim().length === 0) {
      errors.push('Script content is empty');
      return { valid: false, errors, warnings };
    }

    if (scriptType === 'PowerShell') {
      // Basic PowerShell validation
      if (!scriptContent.includes('#') && !scriptContent.includes('$')) {
        warnings.push('Script may not be valid PowerShell (no variables or comments found)');
      }

      // Check for common issues
      if (scriptContent.includes('invoke-expression') || scriptContent.includes('iex ')) {
        warnings.push('Script uses Invoke-Expression which can be a security risk');
      }
    } else {
      // Basic Shell validation
      if (!scriptContent.startsWith('#!') && !scriptContent.includes('#!/')) {
        warnings.push('Script missing shebang (#!/bin/bash or similar)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default new IntuneScriptService();
