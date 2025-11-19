# i18n Implementation Guide

## ✅ Completed

### Translation Files
- **src/locales/en.json** - Comprehensive English translations added for:
  - Users module (search, details, authentication, devices)
  - Settings (Azure config, preferences, security)
  - Devices (management, actions, compliance states)
  - Offboarding (wizard, actions, results)
  - Onboarding (wizard, account creation)
  - Transfer (types, workflow, notifications)
  - Common actions and UI elements
  - Error messages

### Components with i18n
- ✅ Dashboard
- ✅ PurviewManagement
- ✅ FAQ
- ✅ DefenderManagement
- ✅ WorkflowManagement
- ✅ TeamsManagement
- ✅ MSALLogin
- ✅ Layout
- ✅ LanguageSelector
- ✅ NotFound (newly added)

## 🔨 TODO: High Priority Components

### 1. UserSearch Component
**File**: `src/components/users/UserSearch.js`

**Steps**:
1. Add import:
```javascript
import { useTranslation } from 'react-i18next';
```

2. Add hook in component:
```javascript
const { t } = useTranslation();
```

3. Replace strings:
```javascript
// Search placeholder
placeholder={t('users.searchPlaceholder')}

// Table headers
{t('users.name')}
{t('users.email')}
{t('users.department')}
{t('users.jobTitle')}
{t('users.status')}

// Status filter
{t('users.all')}
{t('users.enabled')}
{t('users.disabled')}

// Buttons
{t('users.offboard')}
{t('users.onboard')}
{t('common.search')}

// Loading/Empty states
{t('users.loadingUsers')}
{t('users.noUsersFound')}

// Pagination
{t('users.showing')} {start}-{end} {t('users.of')} {total} {t('users.users')}
```

### 2. Settings Component
**File**: `src/components/settings/Settings.js`

**Steps**:
1. Add import and hook (same as above)

2. Replace section titles:
```javascript
{t('settings.title')}
{t('settings.azureConfig')}
{t('settings.azureConfigDesc')}
{t('settings.userPreferences')}
{t('settings.userPreferencesDesc')}
{t('settings.permissionStatus')}
```

3. Replace form labels:
```javascript
{t('settings.clientId')}
placeholder={t('settings.clientIdPlaceholder')}
{t('settings.clientIdHelp')}

{t('settings.tenantId')}
{t('settings.clientSecret')}
```

4. Replace toggles:
```javascript
{t('settings.enableNotifications')}
{t('settings.enableNotificationsDesc')}
{t('settings.autoRefresh')}
{t('settings.compactView')}
{t('settings.demoMode')}
```

5. Replace buttons:
```javascript
{t('settings.clearConfiguration')}
{t('settings.saveConfiguration')}
{isSaving ? t('settings.saving') : t('common.save')}
```

6. Replace status messages:
```javascript
{t('settings.granted')}
{t('settings.notGranted')}
{t('settings.checking')}
```

### 3. DeviceManagement Component
**File**: `src/components/intune/DeviceManagement.js`

**Steps**:
1. Add import and hook

2. Replace table headers:
```javascript
{t('devices.deviceName')}
{t('devices.user')}
{t('devices.operatingSystem')}
{t('devices.complianceState')}
{t('devices.lastSyncDateTime')}
{t('devices.actions')}
```

3. Replace buttons:
```javascript
{t('devices.sync')}
{t('devices.wipe')}
{t('devices.retire')}
{t('devices.delete')}
```

4. Replace status badges:
```javascript
{t('devices.compliant')}
{t('devices.nonCompliant')}
```

5. Replace search/filter:
```javascript
placeholder={t('devices.searchDevices')}
{t('devices.filterByCompliance')}
{t('devices.allDevices')}
```

6. Replace loading/empty states:
```javascript
{t('devices.loadingDevices')}
{t('devices.noDevicesFound')}
```

7. Replace toast messages:
```javascript
toast.success(t('devices.syncSuccess'));
toast.success(t('devices.wipeSuccess'));
toast.error(t('devices.actionError'));
```

### 4. UserDetail & UserDetailModal
**Files**: 
- `src/components/users/UserDetail.js`
- `src/components/users/UserDetailModal.js`

**Steps**:
1. Add import and hook

2. Replace tab names:
```javascript
{t('users.overview')}
{t('users.signInLogs')}
{t('users.authMethods')}
{t('users.devices')}
{t('users.groups')}
{t('users.licenses')}
```

3. Replace field labels:
```javascript
{t('users.displayName')}
{t('users.email')}
{t('users.userPrincipalName')}
{t('users.jobTitle')}
{t('users.department')}
{t('users.phoneNumber')}
{t('users.officeLocation')}
{t('users.manager')}
```

4. Replace buttons:
```javascript
{t('users.resetPassword')}
{t('users.disableAccount')}
{t('users.editUser')}
{t('common.close')}
```

5. Replace status:
```javascript
{t('users.active')}
{t('users.accountEnabled')}
{t('users.accountDisabled')}
```

6. Replace empty states:
```javascript
{t('users.noSignInLogs')}
{t('users.noDevices')}
{t('users.noGroups')}
{t('users.noLicenses')}
```

### 5. OffboardingWizard
**File**: `src/components/offboarding/OffboardingWizard.js`

**Steps**:
1. Add import and hook

2. Replace wizard step names:
```javascript
{t('offboarding.selectUser')}
{t('offboarding.chooseTemplate')}
{t('offboarding.customizeActions')}
{t('offboarding.reviewAndExecute')}
{t('offboarding.results')}
```

3. Replace section headers:
```javascript
{t('offboarding.accountActions')}
{t('offboarding.mailboxActions')}
{t('offboarding.deviceActions')}
{t('offboarding.dataActions')}
```

4. Replace options:
```javascript
{t('offboarding.disableAccount')}
{t('offboarding.convertToShared')}
{t('offboarding.setForwarding')}
{t('offboarding.setAutoReply')}
{t('offboarding.removeGroups')}
{t('offboarding.removeLicenses')}
{t('offboarding.wipeDevices')}
{t('offboarding.retireDevices')}
```

5. Replace buttons:
```javascript
{t('common.next')}
{t('common.previous')}
{t('offboarding.executeOffboarding')}
{executing ? t('offboarding.executing') : t('common.finish')}
{t('offboarding.exportPDF')}
```

6. Replace status messages:
```javascript
{t('offboarding.offboardingComplete')}
{t('offboarding.offboardingFailed')}
{t('offboarding.successfulActions')}
{t('offboarding.failedActions')}
```

### 6. OnboardingWizard
**File**: `src/components/onboarding/OnboardingWizard.js`

**Steps**:
1. Add import and hook

2. Replace wizard steps:
```javascript
{t('onboarding.basicInfo')}
{t('onboarding.accountSetup')}
{t('onboarding.accessRights')}
{t('onboarding.review')}
{t('onboarding.results')}
```

3. Replace form fields:
```javascript
{t('onboarding.firstName')}
{t('onboarding.lastName')}
{t('onboarding.email')}
{t('onboarding.displayName')}
{t('onboarding.userPrincipalName')}
{t('onboarding.jobTitle')}
{t('onboarding.department')}
{t('onboarding.manager')}
{t('onboarding.startDate')}
```

4. Replace sections:
```javascript
{t('onboarding.selectLicenses')}
{t('onboarding.selectGroups')}
{t('onboarding.assignManager')}
```

5. Replace buttons and status:
```javascript
{t('onboarding.createAccount')}
{t('onboarding.completeOnboarding')}
{t('onboarding.onboardingComplete')}
{t('onboarding.userCreated')}
```

### 7. TransferWizard
**File**: `src/components/transfer/TransferWizard.js`

**Steps**:
1. Add import and hook

2. Replace title and steps:
```javascript
{t('transfer.title')}
{t('transfer.selectEmployee')}
{t('transfer.selectTransferType')}
{t('transfer.reviewTransfer')}
```

3. Replace transfer types:
```javascript
{t('transfer.departmentTransfer')}
{t('transfer.roleChange')}
{t('transfer.managerChange')}
{t('transfer.locationTransfer')}
```

4. Replace form fields:
```javascript
{t('transfer.newDepartment')}
{t('transfer.newJobTitle')}
{t('transfer.newManager')}
{t('transfer.newLocation')}
{t('transfer.effectiveDate')}
{t('transfer.transferNotes')}
```

5. Replace actions:
```javascript
{t('transfer.updatePermissions')}
{t('transfer.notifyStakeholders')}
{t('transfer.transferData')}
{t('transfer.updateGroups')}
```

### 8. ScheduledOffboarding
**File**: `src/components/offboarding/ScheduledOffboarding.js`

**Steps**:
1. Add import and hook

2. Use keys from `offboarding` namespace:
```javascript
{t('offboarding.scheduledOffboarding')}
{t('offboarding.scheduledFor')}
{t('common.edit')}
{t('common.delete')}
{t('common.execute')}
```

### 9. IntuneManagement
**File**: `src/components/intune/IntuneManagement.js`

**Steps**:
1. Add import and hook

2. Use device keys and add new ones as needed:
```javascript
{t('devices.title')}
{t('common.loading')}
// Add more specific keys if needed
```

## 🌐 Adding New Languages

### To add Spanish (es), French (fr), German (de), etc:

1. Copy `src/locales/en.json` to `src/locales/[lang].json`
2. Translate all values (keep keys the same)
3. Import in `src/i18n.js`:
```javascript
import esTranslations from './locales/es.json';
```
4. Add to resources:
```javascript
const resources = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  // ...
};
```

## 🧪 Testing i18n

### Test in browser:
1. Open browser DevTools console
2. Change language:
```javascript
localStorage.setItem('i18nextLng', 'es');
location.reload();
```

### Test missing keys:
- In development, missing keys will show in console
- They'll render as the key path (e.g., "users.someMissingKey")

## 📝 Best Practices

1. **Always use keys, never hardcode text**:
   ```javascript
   // ❌ Bad
   <button>Save</button>
   
   // ✅ Good
   <button>{t('common.save')}</button>
   ```

2. **Use namespaces for organization**:
   - `common.` - Shared UI elements
   - `users.` - User management
   - `devices.` - Device management
   - `errors.` - Error messages

3. **Keep keys semantic**:
   ```javascript
   // ❌ Bad
   "btn1": "Click me"
   
   // ✅ Good
   "saveButton": "Save Changes"
   ```

4. **Use interpolation for dynamic content**:
   ```javascript
   // In translation file:
   "greeting": "Hello, {{name}}!"
   
   // In component:
   {t('greeting', { name: user.displayName })}
   ```

5. **Add plural support when needed**:
   ```javascript
   // In translation file:
   "itemCount": "{{count}} item",
   "itemCount_plural": "{{count}} items"
   
   // In component:
   {t('itemCount', { count: items.length })}
   ```

## 📊 Progress Tracking

### Components Status:
- ✅ Dashboard (8 components done)
- ⬜ UserSearch (HIGH PRIORITY)
- ⬜ UserDetail (HIGH PRIORITY)
- ⬜ UserDetailModal (HIGH PRIORITY)
- ⬜ Settings (HIGH PRIORITY)
- ⬜ DeviceManagement (HIGH PRIORITY)
- ⬜ OffboardingWizard (HIGH PRIORITY)
- ⬜ OnboardingWizard (HIGH PRIORITY)
- ⬜ TransferWizard (HIGH PRIORITY)
- ⬜ ScheduledOffboarding (MEDIUM PRIORITY)
- ⬜ IntuneManagement (MEDIUM PRIORITY)
- ⬜ SignUp (MEDIUM PRIORITY)
- ⬜ OAuthCallback (LOW PRIORITY)
- ⬜ ErrorBoundary (LOW PRIORITY)

### Estimated Time:
- Simple components (NotFound): 10 minutes
- Medium components (Settings, DeviceManagement): 20-30 minutes
- Complex components (Wizards): 30-45 minutes

**Total remaining**: ~4-5 hours for all high priority components

## 🚀 Quick Start for Next Developer

1. Pick a component from the TODO list above
2. Open the component file
3. Add `import { useTranslation } from 'react-i18next';`
4. Add `const { t } = useTranslation();` in component
5. Find all hardcoded strings
6. Replace with `{t('namespace.key')}`
7. Check if key exists in `en.json`, add if missing
8. Test in browser
9. Commit with message: "Add i18n to [ComponentName]"

## 🎯 Priority Order

Follow this order for maximum impact:
1. **UserSearch** - Most used component
2. **Settings** - User-facing configuration
3. **OffboardingWizard** - Core business logic
4. **OnboardingWizard** - Core business logic
5. **DeviceManagement** - Frequently accessed
6. **UserDetail/UserDetailModal** - Detailed views
7. **TransferWizard** - Employee transfers
8. **ScheduledOffboarding** - Scheduling feature
9. **IntuneManagement** - Device policies
10. **Others** - Lower priority
