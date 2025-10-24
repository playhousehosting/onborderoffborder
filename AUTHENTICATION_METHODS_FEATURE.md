# Authentication Methods Removal Feature

## Overview
Added comprehensive authentication method removal capability to the offboarding workflow. This feature removes all registered authentication methods (MFA devices, phone numbers, email addresses, FIDO2 keys, etc.) when offboarding users for enhanced security.

## Implementation Details

### 1. Graph Service Methods (`src/services/graphService.js`)

#### `getUserAuthenticationMethods(userId)`
Retrieves all authentication methods registered for a user across multiple method types:
- **Phone Methods**: Mobile, office, and alternate phone numbers for SMS/voice MFA
- **Email Methods**: Registered email addresses for authentication
- **FIDO2 Methods**: Security keys and hardware tokens
- **Microsoft Authenticator**: Registered authenticator app instances
- **Windows Hello for Business**: Biometric and PIN-based methods

Returns a unified array with `methodType`, `id`, and `displayName` for each method.

**API Endpoints Used:**
- `GET /users/{userId}/authentication/phoneMethods`
- `GET /users/{userId}/authentication/emailMethods`
- `GET /users/{userId}/authentication/fido2Methods`
- `GET /users/{userId}/authentication/microsoftAuthenticatorMethods`
- `GET /users/{userId}/authentication/windowsHelloForBusinessMethods`

**Error Handling**: Gracefully handles missing method types (some users may not have all types registered).

#### `removeAuthenticationMethod(userId, methodId, methodType)`
Removes a specific authentication method based on its type.

**API Endpoints Used:**
- `DELETE /users/{userId}/authentication/phoneMethods/{methodId}`
- `DELETE /users/{userId}/authentication/emailMethods/{methodId}`
- `DELETE /users/{userId}/authentication/fido2Methods/{methodId}`
- `DELETE /users/{userId}/authentication/microsoftAuthenticatorMethods/{methodId}`
- `DELETE /users/{userId}/authentication/windowsHelloForBusinessMethods/{methodId}`

**Required Permission**: `UserAuthenticationMethod.ReadWrite.All`

### 2. Offboarding Workflow Integration (`src/components/offboarding/OffboardingWizard.js`)

#### State Management
- Added `removeAuthMethods: true` to default offboarding options
- Updated all 4 offboarding templates with appropriate defaults:
  - **Standard**: `true` (remove for clean separation)
  - **Executive**: `false` (preserve for transition period)
  - **Contractor**: `true` (remove for security)
  - **Security**: `true` (critical security requirement)

#### Workflow Step 11: Remove Authentication Methods
- Executes after enterprise application removal (Step 10)
- Retrieves all user authentication methods
- Iterates through each method and attempts removal
- Tracks success/failure counts
- Provides detailed feedback with counts
- Handles errors gracefully (continues if some methods fail)

#### UI Component
- Added checkbox in security/access section: "Remove all authentication methods (MFA, phone, email)"
- Positioned after enterprise applications checkbox
- Updates `removeAuthMethods` state on toggle
- Respects template defaults when template is selected

## Security Benefits

### Why Remove Authentication Methods?
1. **Prevent Unauthorized Access**: Ex-employees often retain registered phones, security keys, or authenticator apps
2. **Block Recovery Methods**: Removes phone/email recovery options that could bypass some controls
3. **MFA Device Cleanup**: Ensures hardware tokens and FIDO2 keys are deregistered
4. **Compliance**: Required by many security frameworks (SOC 2, ISO 27001)
5. **Defense in Depth**: Adds another layer to prevent account compromise

### Use Cases by Template
- **Standard Offboarding**: Remove methods for clean account closure
- **Executive Offboarding**: Preserve methods temporarily for transition/handoff period
- **Contractor Offboarding**: Immediate removal (high priority - external access)
- **Security Critical**: Immediate removal (highest priority - potential threat)

## Testing Recommendations

### Test Scenarios
1. **User with Multiple Method Types**: Verify all types are discovered and removed
2. **User with No Methods**: Ensure graceful handling (no errors)
3. **Partial Failure**: Test when some methods fail to remove (e.g., permission issues)
4. **Permission Denied**: Verify proper error handling when permission is missing
5. **Each Template**: Verify default checkbox state matches template expectations

### Manual Test Steps
1. Select a test user with known authentication methods
2. Navigate to Offboarding Wizard
3. Select "Security Critical" template (removeAuthMethods defaults to true)
4. Verify checkbox is checked
5. Proceed through wizard and execute
6. Verify Step 11 results show correct count of removed methods
7. Check user's authentication methods in Azure AD to confirm removal

### API Permissions Required
Ensure the following Graph API permission is granted to your app:
- **UserAuthenticationMethod.ReadWrite.All** (Application or Delegated)

## Implementation Pattern

This feature follows the established pattern used for enterprise application removal:
1. **Service Layer**: Add methods to `graphService.js` for API operations
2. **State Management**: Add option to offboarding state with sensible defaults
3. **Workflow Integration**: Add numbered step in `executeOffboarding()` with permission check
4. **UI Component**: Add checkbox in appropriate section of options step
5. **Template Defaults**: Configure defaults for each template type based on security requirements

## Files Modified

### `src/services/graphService.js`
- Added `getUserAuthenticationMethods()` method (lines ~892-982)
- Added `removeAuthenticationMethod()` method (lines ~984-1005)

### `src/components/offboarding/OffboardingWizard.js`
- Added `removeAuthMethods` to state (line ~79)
- Updated all 4 templates with `removeAuthMethods` property
- Added Step 11: Remove Authentication Methods (lines ~673-720)
- Added UI checkbox (lines ~1106-1118)

## Related Documentation
- [Microsoft Graph Authentication Methods API](https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethods-overview)
- [Microsoft Identity Platform Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference#userauthenticationmethod-permissions)
- [Azure AD Authentication Methods](https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-authentication-methods)

## Future Enhancements
1. Display preview of authentication methods before removal
2. Add audit logging for method removals
3. Support selective removal (e.g., keep email, remove phones)
4. Backup authentication method details before removal
5. Add bulk authentication method management in Users component
