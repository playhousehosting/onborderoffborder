/**
 * WinGet Package Manager Service
 * Integration with Microsoft WinGet repository for app discovery, packaging, and Intune deployment
 * Handles .intunewin packaging and automated upload workflows
 */

import intuneService from './intuneService';

// ========== WINGET API ENDPOINTS ==========
// Note: Using winget-pkgs GitHub repository API and REST sources
const WINGET_SOURCES = {
  MSSTORE: 'https://storeedgefd.dsx.mp.microsoft.com/v9.0',
  WINGET: 'https://cdn.winget.microsoft.com/cache',
  GITHUB_API: 'https://api.github.com/repos/microsoft/winget-pkgs'
};

// ========== PACKAGE SEARCH & DISCOVERY ==========

/**
 * Search WinGet packages
 * @param {string} query - Search query
 * @param {Object} options - Search options (source, limit)
 * @returns {Promise<Array>} List of matching packages
 */
export const searchPackages = async (query, options = {}) => {
  try {
    // For demo purposes, returning curated popular packages
    // In production, this would query the WinGet REST API or GitHub
    const mockPackages = getMockWinGetPackages();
    
    const filtered = mockPackages.filter(pkg => 
      pkg.packageName.toLowerCase().includes(query.toLowerCase()) ||
      pkg.publisher.toLowerCase().includes(query.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    return options.limit ? filtered.slice(0, options.limit) : filtered;
  } catch (error) {
    console.error('Error searching WinGet packages:', error);
    throw error;
  }
};

/**
 * Get package details
 * @param {string} packageId - Package identifier (e.g., 'Microsoft.PowerToys')
 * @returns {Promise<Object>} Package details
 */
export const getPackageDetails = async (packageId) => {
  try {
    const packages = getMockWinGetPackages();
    const pkg = packages.find(p => p.packageIdentifier === packageId);
    
    if (!pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }
    
    return pkg;
  } catch (error) {
    console.error(`Error fetching package details for ${packageId}:`, error);
    throw error;
  }
};

/**
 * Get available package versions
 * @param {string} packageId - Package identifier
 * @returns {Promise<Array>} List of available versions
 */
export const getPackageVersions = async (packageId) => {
  try {
    const pkg = await getPackageDetails(packageId);
    return pkg.versions || [pkg.version];
  } catch (error) {
    console.error(`Error fetching versions for ${packageId}:`, error);
    throw error;
  }
};

/**
 * Get package manifest
 * @param {string} packageId - Package identifier
 * @param {string} version - Package version
 * @returns {Promise<Object>} Package manifest
 */
export const getPackageManifest = async (packageId, version) => {
  try {
    const pkg = await getPackageDetails(packageId);
    
    return {
      packageIdentifier: pkg.packageIdentifier,
      packageVersion: version || pkg.version,
      packageName: pkg.packageName,
      publisher: pkg.publisher,
      license: pkg.license || 'Proprietary',
      description: pkg.description,
      homepage: pkg.homepage,
      installers: pkg.installers || [],
      dependencies: pkg.dependencies || []
    };
  } catch (error) {
    console.error(`Error fetching manifest for ${packageId}:`, error);
    throw error;
  }
};

// ========== PACKAGE DOWNLOAD ==========

/**
 * Get installer download URL
 * @param {string} packageId - Package identifier
 * @param {string} version - Package version
 * @param {string} architecture - Architecture (x64, x86, arm64)
 * @returns {Promise<string>} Download URL
 */
export const getInstallerUrl = async (packageId, version, architecture = 'x64') => {
  try {
    const manifest = await getPackageManifest(packageId, version);
    
    const installer = manifest.installers.find(
      inst => inst.architecture === architecture
    ) || manifest.installers[0];
    
    if (!installer) {
      throw new Error(`No installer found for ${packageId} ${architecture}`);
    }
    
    return installer.installerUrl;
  } catch (error) {
    console.error(`Error getting installer URL:`, error);
    throw error;
  }
};

/**
 * Download installer (simulated)
 * @param {string} packageId - Package identifier
 * @param {string} version - Package version
 * @param {string} architecture - Architecture
 * @returns {Promise<Object>} Download result
 */
export const downloadInstaller = async (packageId, version, architecture = 'x64') => {
  try {
    const url = await getInstallerUrl(packageId, version, architecture);
    
    // In production, this would actually download the file
    // For now, simulate the download
    return {
      packageId,
      version,
      architecture,
      downloadUrl: url,
      localPath: `C:\\Temp\\WinGet\\${packageId}_${version}_${architecture}.exe`,
      size: Math.floor(Math.random() * 500000000) + 10000000, // 10MB - 500MB
      downloaded: true
    };
  } catch (error) {
    console.error(`Error downloading installer:`, error);
    throw error;
  }
};

// ========== .INTUNEWIN PACKAGING ==========

/**
 * Generate detection rules for an app
 * @param {Object} packageInfo - Package information
 * @param {string} detectionType - Detection type ('registry', 'file', 'msi', 'script')
 * @returns {Array<Object>} Detection rules
 */
export const generateDetectionRules = (packageInfo, detectionType = 'file') => {
  const rules = [];
  
  switch (detectionType) {
    case 'file':
      rules.push({
        '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection',
        operator: 'exists',
        path: `C:\\Program Files\\${packageInfo.publisher}\\${packageInfo.packageName}`,
        fileOrFolderName: `${packageInfo.packageName}.exe`,
        check32BitOn64System: false
      });
      break;
      
    case 'registry':
      rules.push({
        '@odata.type': '#microsoft.graph.win32LobAppRegistryDetection',
        operator: 'exists',
        keyPath: `HKEY_LOCAL_MACHINE\\SOFTWARE\\${packageInfo.publisher}\\${packageInfo.packageName}`,
        valueName: 'Version',
        check32BitOn64System: false
      });
      break;
      
    case 'msi':
      rules.push({
        '@odata.type': '#microsoft.graph.win32LobAppProductCodeDetection',
        productCode: packageInfo.productCode,
        productVersionOperator: 'greaterThanOrEqual',
        productVersion: packageInfo.version
      });
      break;
      
    case 'script':
      rules.push({
        '@odata.type': '#microsoft.graph.win32LobAppPowerShellScriptDetection',
        enforceSignatureCheck: false,
        runAs32Bit: false,
        scriptContent: btoa(`
# Detection script for ${packageInfo.packageName}
$path = "C:\\Program Files\\${packageInfo.publisher}\\${packageInfo.packageName}\\${packageInfo.packageName}.exe"
if (Test-Path $path) {
    $version = (Get-Item $path).VersionInfo.FileVersion
    if ($version -ge "${packageInfo.version}") {
        Write-Host "Detected"
        exit 0
    }
}
exit 1
        `)
      });
      break;
      
    default:
      throw new Error(`Unknown detection type: ${detectionType}`);
  }
  
  return rules;
};

/**
 * Generate requirement rules for an app
 * @param {Object} packageInfo - Package information
 * @returns {Array<Object>} Requirement rules
 */
export const generateRequirementRules = (packageInfo) => {
  return [
    {
      '@odata.type': '#microsoft.graph.win32LobAppFileSystemRequirement',
      operator: 'exists',
      detectionValue: null,
      path: 'C:\\Windows\\System32',
      fileOrFolderName: 'kernel32.dll',
      check32BitOn64System: false,
      detectionType: 'exists'
    }
  ];
};

/**
 * Package installer as .intunewin (simulated)
 * @param {string} sourceFolder - Source folder containing installer
 * @param {string} setupFile - Setup file name
 * @returns {Promise<Object>} Packaging result
 */
export const packageAsIntuneWin = async (sourceFolder, setupFile) => {
  try {
    // In production, this would call the IntuneWinAppUtil.exe via PowerShell
    // For now, simulate the packaging process
    
    console.log(`Packaging ${setupFile} from ${sourceFolder}...`);
    
    // Simulate packaging time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const intuneWinPath = `${sourceFolder}\\${setupFile}.intunewin`;
    
    return {
      success: true,
      intuneWinPath,
      originalSize: Math.floor(Math.random() * 200000000) + 50000000,
      encryptedSize: Math.floor(Math.random() * 220000000) + 55000000,
      manifest: {
        fileName: setupFile,
        setupFile: setupFile,
        encryptionInfo: {
          encryptionKey: 'simulated-encryption-key',
          macKey: 'simulated-mac-key',
          initializationVector: 'simulated-iv',
          mac: 'simulated-mac',
          profileIdentifier: 'simulated-profile-id'
        }
      }
    };
  } catch (error) {
    console.error('Error packaging as .intunewin:', error);
    throw error;
  }
};

/**
 * Validate .intunewin file (simulated)
 * @param {string} intuneWinPath - Path to .intunewin file
 * @returns {Promise<boolean>} Validation result
 */
export const validateIntuneWinFile = async (intuneWinPath) => {
  try {
    // In production, this would verify the .intunewin package structure
    console.log(`Validating ${intuneWinPath}...`);
    return true;
  } catch (error) {
    console.error('Error validating .intunewin file:', error);
    return false;
  }
};

// ========== INTUNE UPLOAD & DEPLOYMENT ==========

/**
 * Upload Win32 app to Intune (complete workflow)
 * @param {string} packageId - WinGet package identifier
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadToIntune = async (packageId, options = {}) => {
  try {
    const { version, architecture = 'x64', detectionType = 'file' } = options;
    
    // Step 1: Get package details
    console.log(`📦 Fetching package details for ${packageId}...`);
    const packageDetails = await getPackageDetails(packageId);
    
    // Step 2: Download installer
    console.log(`⬇️ Downloading installer...`);
    const download = await downloadInstaller(packageId, version || packageDetails.version, architecture);
    
    // Step 3: Package as .intunewin
    console.log(`📦 Packaging as .intunewin...`);
    const sourceFolder = download.localPath.substring(0, download.localPath.lastIndexOf('\\'));
    const setupFile = download.localPath.substring(download.localPath.lastIndexOf('\\') + 1);
    const packageResult = await packageAsIntuneWin(sourceFolder, setupFile);
    
    // Step 4: Validate package
    console.log(`✅ Validating package...`);
    const isValid = await validateIntuneWinFile(packageResult.intuneWinPath);
    if (!isValid) {
      throw new Error('Invalid .intunewin package');
    }
    
    // Step 5: Generate detection and requirement rules
    console.log(`🔍 Generating detection rules...`);
    const detectionRules = generateDetectionRules(packageDetails, detectionType);
    const requirementRules = generateRequirementRules(packageDetails);
    
    // Step 6: Create Win32 app in Intune
    console.log(`🚀 Creating app in Intune...`);
    const appData = {
      displayName: packageDetails.packageName,
      description: packageDetails.description,
      publisher: packageDetails.publisher,
      fileName: setupFile,
      installCommandLine: packageDetails.installers[0]?.installCommandLine || `${setupFile} /silent`,
      uninstallCommandLine: packageDetails.installers[0]?.uninstallCommandLine || `msiexec /x {ProductCode} /quiet`,
      detectionRules,
      requirementRules,
      runAsAccount: 'system',
      installExperience: {
        runAsAccount: 'system',
        deviceRestartBehavior: 'allow'
      }
    };
    
    const createdApp = await intuneService.createWin32App(appData);
    console.log(`✅ App created with ID: ${createdApp.id}`);
    
    // Step 7: Create content version
    console.log(`📝 Creating content version...`);
    const contentVersion = await intuneService.createWin32AppContentVersion(createdApp.id);
    
    // Step 8: Create content file
    console.log(`📄 Creating content file entry...`);
    const fileData = {
      name: `${setupFile}.intunewin`,
      size: packageResult.originalSize,
      sizeEncrypted: packageResult.encryptedSize,
      manifest: JSON.stringify(packageResult.manifest)
    };
    
    const contentFile = await intuneService.createWin32AppContentFile(
      createdApp.id,
      contentVersion.id,
      fileData
    );
    
    // Step 9: Upload file to Azure Storage (simulated)
    console.log(`☁️ Uploading to Azure Storage...`);
    // In production, this would use the azureStorageUri from contentFile
    // and perform the actual file upload using Azure Storage SDK
    
    console.log(`✨ Upload complete!`);
    
    return {
      success: true,
      appId: createdApp.id,
      appName: packageDetails.packageName,
      packageId,
      version: version || packageDetails.version,
      contentVersionId: contentVersion.id,
      fileId: contentFile.id
    };
    
  } catch (error) {
    console.error('Error uploading to Intune:', error);
    throw error;
  }
};

/**
 * Quick deploy: Upload and assign in one operation
 * @param {string} packageId - WinGet package identifier
 * @param {Array<string>} groupIds - Azure AD group IDs to assign to
 * @param {Object} options - Deployment options
 * @returns {Promise<Object>} Deployment result
 */
export const quickDeploy = async (packageId, groupIds, options = {}) => {
  try {
    // Upload to Intune
    const uploadResult = await uploadToIntune(packageId, options);
    
    // Assign to groups
    console.log(`🎯 Assigning to ${groupIds.length} group(s)...`);
    const assignments = groupIds.map(groupId => ({
      groupId,
      intent: options.intent || 'required',
      targetType: '#microsoft.graph.groupAssignmentTarget'
    }));
    
    await intuneService.assignApp(uploadResult.appId, assignments);
    
    console.log(`✅ Deployment complete!`);
    
    return {
      ...uploadResult,
      assignedGroups: groupIds,
      assignmentIntent: options.intent || 'required'
    };
    
  } catch (error) {
    console.error('Error in quick deploy:', error);
    throw error;
  }
};

// ========== MOCK DATA (for demonstration) ==========

/**
 * Get mock WinGet package data
 * In production, this would be replaced with actual WinGet API calls
 */
const getMockWinGetPackages = () => [
  {
    packageIdentifier: 'Microsoft.PowerToys',
    packageName: 'PowerToys',
    version: '0.75.1',
    publisher: 'Microsoft',
    description: 'Windows system utilities to maximize productivity',
    homepage: 'https://github.com/microsoft/PowerToys',
    license: 'MIT',
    icon: '⚡',
    category: 'Utilities',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://github.com/microsoft/PowerToys/releases/download/v0.75.1/PowerToysSetup-0.75.1-x64.exe',
        installCommandLine: 'PowerToysSetup-0.75.1-x64.exe /install /quiet /norestart',
        uninstallCommandLine: 'PowerToysSetup-0.75.1-x64.exe /uninstall /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Microsoft.VisualStudioCode',
    packageName: 'Visual Studio Code',
    version: '1.85.1',
    publisher: 'Microsoft',
    description: 'Code editing. Redefined.',
    homepage: 'https://code.visualstudio.com',
    license: 'MIT',
    icon: '💻',
    category: 'Development',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64',
        installCommandLine: 'VSCodeSetup.exe /VERYSILENT /MERGETASKS=!runcode',
        uninstallCommandLine: 'unins000.exe /VERYSILENT'
      }
    ]
  },
  {
    packageIdentifier: 'Google.Chrome',
    packageName: 'Google Chrome',
    version: '120.0.6099.109',
    publisher: 'Google LLC',
    description: 'Fast, secure, and free web browser',
    homepage: 'https://www.google.com/chrome',
    license: 'Proprietary',
    icon: '🌐',
    category: 'Browsers',
    installers: [
      {
        architecture: 'x64',
        installerType: 'msi',
        installerUrl: 'https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi',
        installCommandLine: 'msiexec /i GoogleChromeStandaloneEnterprise64.msi /quiet',
        uninstallCommandLine: 'msiexec /x {ProductCode} /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Mozilla.Firefox',
    packageName: 'Mozilla Firefox',
    version: '121.0',
    publisher: 'Mozilla',
    description: 'Free and open-source web browser',
    homepage: 'https://www.mozilla.org/firefox',
    license: 'MPL-2.0',
    icon: '🦊',
    category: 'Browsers',
    installers: [
      {
        architecture: 'x64',
        installerType: 'msi',
        installerUrl: 'https://download.mozilla.org/?product=firefox-msi-latest-ssl&os=win64&lang=en-US',
        installCommandLine: 'msiexec /i firefox.msi /quiet',
        uninstallCommandLine: 'msiexec /x {ProductCode} /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Adobe.Acrobat.Reader.64-bit',
    packageName: 'Adobe Acrobat Reader DC',
    version: '23.008.20458',
    publisher: 'Adobe Inc.',
    description: 'View, print, and annotate PDF documents',
    homepage: 'https://www.adobe.com/acrobat/pdf-reader.html',
    license: 'Proprietary',
    icon: '📄',
    category: 'Productivity',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://ardownload2.adobe.com/pub/adobe/reader/win/AcrobatDC/2300820458/AcroRdrDC2300820458_en_US.exe',
        installCommandLine: 'AcroRdrDC2300820458_en_US.exe /sAll /rs /msi EULA_ACCEPT=YES',
        uninstallCommandLine: 'msiexec /x {ProductCode} /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Zoom.Zoom',
    packageName: 'Zoom',
    version: '5.16.10',
    publisher: 'Zoom Video Communications, Inc.',
    description: 'Video conferencing, cloud phone, and webinars',
    homepage: 'https://zoom.us',
    license: 'Proprietary',
    icon: '🎥',
    category: 'Communication',
    installers: [
      {
        architecture: 'x64',
        installerType: 'msi',
        installerUrl: 'https://zoom.us/client/latest/ZoomInstallerFull.msi',
        installCommandLine: 'msiexec /i ZoomInstallerFull.msi /quiet',
        uninstallCommandLine: 'msiexec /x {ProductCode} /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Microsoft.Teams',
    packageName: 'Microsoft Teams',
    version: '1.6.00.4472',
    publisher: 'Microsoft',
    description: 'Meet, chat, call, and collaborate',
    homepage: 'https://www.microsoft.com/microsoft-teams',
    license: 'Proprietary',
    icon: '👥',
    category: 'Communication',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://teams.microsoft.com/downloads/desktopurl?env=production&plat=windows&arch=x64&managedInstaller=true&download=true',
        installCommandLine: 'Teams_windows_x64.exe /s',
        uninstallCommandLine: 'Teams_windows_x64.exe /u /s'
      }
    ]
  },
  {
    packageIdentifier: 'Notepad++.Notepad++',
    packageName: 'Notepad++',
    version: '8.6.0',
    publisher: 'Notepad++ Team',
    description: 'Free source code editor and Notepad replacement',
    homepage: 'https://notepad-plus-plus.org',
    license: 'GPL-3.0',
    icon: '📝',
    category: 'Development',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6/npp.8.6.Installer.x64.exe',
        installCommandLine: 'npp.8.6.Installer.x64.exe /S',
        uninstallCommandLine: 'uninstall.exe /S'
      }
    ]
  },
  {
    packageIdentifier: '7zip.7zip',
    packageName: '7-Zip',
    version: '23.01',
    publisher: '7-Zip',
    description: 'File archiver with high compression ratio',
    homepage: 'https://www.7-zip.org',
    license: 'LGPL-2.1',
    icon: '📦',
    category: 'Utilities',
    installers: [
      {
        architecture: 'x64',
        installerType: 'msi',
        installerUrl: 'https://www.7-zip.org/a/7z2301-x64.msi',
        installCommandLine: 'msiexec /i 7z2301-x64.msi /quiet',
        uninstallCommandLine: 'msiexec /x {ProductCode} /quiet'
      }
    ]
  },
  {
    packageIdentifier: 'Git.Git',
    packageName: 'Git',
    version: '2.43.0',
    publisher: 'Git for Windows',
    description: 'Distributed version control system',
    homepage: 'https://git-scm.com',
    license: 'GPL-2.0',
    icon: '🔀',
    category: 'Development',
    installers: [
      {
        architecture: 'x64',
        installerType: 'exe',
        installerUrl: 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe',
        installCommandLine: 'Git-2.43.0-64-bit.exe /VERYSILENT /NORESTART',
        uninstallCommandLine: 'unins000.exe /VERYSILENT /NORESTART'
      }
    ]
  }
];

export default {
  // Search & Discovery
  searchPackages,
  getPackageDetails,
  getPackageVersions,
  getPackageManifest,
  
  // Download
  getInstallerUrl,
  downloadInstaller,
  
  // Packaging
  generateDetectionRules,
  generateRequirementRules,
  packageAsIntuneWin,
  validateIntuneWinFile,
  
  // Deployment
  uploadToIntune,
  quickDeploy,
};
