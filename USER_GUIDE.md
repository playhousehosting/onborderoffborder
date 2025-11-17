# Employee Offboarding Portal - Complete User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Onboarding](#onboarding)
5. [Offboarding](#offboarding)
6. [Data Transfer](#data-transfer)
7. [Device Management](#device-management)
8. [Workflows & Automation](#workflows--automation)
9. [Scheduled Tasks](#scheduled-tasks)
10. [Settings & Configuration](#settings--configuration)
11. [Security & Permissions](#security--permissions)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Authentication Methods

The portal supports two authentication methods:

#### 1. Clerk Authentication (Development/Testing)
- **Use Case:** Development environments, testing, and smaller deployments
- **Sign In Process:**
  1. Click "Sign In" on the login page
  2. Enter your email and password
  3. Or use social sign-in (Google, Microsoft, GitHub)
- **New Users:** Click "Sign Up" to create an account

#### 2. Azure AD SSO (Enterprise Production)
- **Use Case:** Production deployments with Azure Active Directory
- **Sign In Process:**
  1. Click "Sign in with Microsoft"
  2. Enter your organization email (@yourcompany.com)
  3. Complete Microsoft authentication
  4. Your Azure AD roles determine your permissions

### Required Permissions

Different features require different Azure AD permissions:

| Feature | Required Permission |
|---------|---------------------|
| User Management | `User.ReadWrite.All`, `Group.ReadWrite.All` |
| Device Management | `DeviceManagementManagedDevices.ReadWrite.All` |
| Email/Mailbox | `Mail.ReadWrite`, `MailboxSettings.ReadWrite` |
| Authentication Methods | `UserAuthenticationMethod.ReadWrite.All` |
| Lifecycle Workflows | `LifecycleWorkflows.ReadWrite.All` |
| Audit Logs | `AuditLog.Read.All` |

### First-Time Setup

1. **Configure Azure AD** (for production):
   - Register the application in Azure Portal
   - Configure redirect URIs
   - Add required API permissions
   - Grant admin consent
   - See `AZURE_AD_PERMISSIONS_SETUP.md` for details

2. **Set Up Clerk** (for development):
   - Configure JWT template (see `CLERK_JWT_SETUP.md`)
   - Set environment variables
   - Configure authentication providers

3. **Configure Portal Settings**:
   - Navigate to Settings
   - Set default preferences
   - Configure notification options
   - Customize theme

---

## Dashboard Overview

### What the Dashboard Shows

The dashboard provides an at-a-glance view of your organization:

#### Statistics Cards
- **Total Users:** Active user accounts in Azure AD
- **Active Licenses:** Currently assigned Microsoft 365 licenses
- **Managed Devices:** Devices enrolled in Intune
- **Pending Tasks:** Scheduled offboarding and workflows

#### Recent Activity
- Recently modified users
- Recent offboarding actions
- Scheduled tasks
- Workflow executions

#### Device Compliance Overview
- Compliant devices (green)
- Non-compliant devices (red)
- Grace period devices (yellow)
- Not evaluated (gray)

#### Quick Actions
Shortcut buttons to common tasks:
- Search Users
- New Offboarding
- Schedule Task
- View Devices

### Auto-Refresh

The dashboard auto-refreshes every 5 minutes to show the latest data. You can also manually refresh by clicking the refresh icon.

---

## User Management

### Searching for Users

**Navigation:** Users (left sidebar)

#### Search Options
- By name (first, last, or display name)
- By email address (full or partial)
- By department
- By job title

#### Filters
- Account status (enabled/disabled)
- License status (licensed/unlicensed)
- Sign-in activity (active/inactive)
- Account type (member/guest)

#### Example Searches
```
John Smith          → Finds users with that name
john@company.com    → Finds specific email
Sales               → Finds users in Sales department
john                → Finds all Johns or @john emails
```

### User Detail Page

Click any user to view comprehensive information:

#### Basic Information
- Display name, email, job title
- Department, manager
- Office location, phone number
- Employee ID, hire date

#### Account Status
- Enabled/disabled
- Last sign-in date/time
- Sign-in activity logs
- Account creation date

#### Licenses & Services
- Assigned Microsoft 365 licenses
- Enabled service plans
- License assignment date
- Available to assign

#### Group Memberships
- Azure AD security groups
- Microsoft 365 groups
- Distribution lists
- Dynamic groups

#### Devices
- Enrolled devices
- Compliance status
- Last sync time
- Device type and OS

#### Mailbox Settings
- Mailbox type (user/shared/room)
- Storage usage
- Forwarding rules
- Automatic replies
- Delegation permissions

#### Authentication Methods
- Password status
- MFA methods (app, phone, SMS)
- FIDO2 security keys
- Temporary Access Pass

### User Actions

From the user detail page:

- **Edit User:** Update basic information
- **Manage Licenses:** Add/remove Microsoft 365 licenses
- **Reset Password:** Generate new temporary password
- **Block Sign-In:** Disable account immediately
- **Offboard:** Start offboarding wizard
- **Clone User:** Create similar user account
- **Transfer Data:** Transfer to another user
- **View Devices:** See all enrolled devices

---

## Onboarding

### The Onboarding Wizard

**Navigation:** Onboarding (left sidebar)

The wizard guides you through creating a new user account.

#### Step 1: User Information

**Required Fields:**
- First name
- Last name
- Job title
- Department

**Optional Fields:**
- Manager (search and select)
- Office location
- Phone number
- Employee ID
- Hire date

**Username Generation:**
- Automatic: Based on name (e.g., john.smith@company.com)
- Custom: Manually enter username

**Password Options:**
- Auto-generate: Secure random password
- Manual: Enter custom password
- Requirements:
  - Minimum 8 characters
  - At least 1 uppercase, 1 lowercase, 1 number
  - No common passwords

#### Step 2: Account Settings

**Usage Location:**
- Required for license assignment
- Determines available services
- Select country/region

**Password Policies:**
- Force change at next sign-in (recommended)
- Password never expires (not recommended)
- Account enabled immediately

**Email Settings:**
- Create Exchange mailbox (if licensed)
- Set mailbox quota
- Configure automatic reply (optional)

#### Step 3: Licenses & Groups

**License Assignment:**
- View available licenses
- Assign multiple licenses
- Enable/disable service plans
- See cost per user

**Group Membership:**
- Add to security groups
- Add to Microsoft 365 groups
- Add to distribution lists
- Set primary group (optional)

**Application Access:**
- Grant access to specific apps
- Assign app roles
- Configure SSO settings

#### Step 4: Review & Create

**Review All Settings:**
- User information summary
- License assignments
- Group memberships
- Cost breakdown

**Final Actions:**
- Click "Create User" to finalize
- Copy temporary password
- Send welcome email (optional)
- Print credentials (optional)

### Post-Creation Actions

After creating a user:
- **License Activation:** Takes 5-10 minutes
- **Mailbox Creation:** Takes 10-20 minutes
- **Group Sync:** Takes 5-15 minutes
- **Azure AD Sync:** Takes 5-10 minutes

### Cloning Users

**When to Clone:**
- Hiring multiple users with same role
- Replacing a departing employee
- Standardizing user configurations

**Cloning Process:**
1. Navigate to existing user's detail page
2. Click **Actions → Clone User**
3. Wizard pre-fills:
   - Licenses
   - Group memberships
   - Mailbox settings
   - Application access
4. Update name and email
5. Review and create

**What Gets Cloned:**
- License assignments
- Group memberships
- Mailbox settings (quota, retention)
- Application permissions

**What Doesn't Get Cloned:**
- Personal data (emails, files)
- Authentication methods
- Password
- Sign-in history

---

## Offboarding

### The Offboarding Wizard

**Navigation:** Offboarding (left sidebar)

The wizard helps you securely remove users from your organization.

#### Step 1: Select User

**Search Options:**
- Search by name or email
- Recently active users
- Users by department

**User Verification:**
- Confirm correct user
- Review current status
- Check for active devices

#### Step 2: Choose Actions

##### Immediate Security Actions
- ☑️ **Block Sign-In:** Prevent account access (CRITICAL)
- ☑️ **Revoke Sessions:** Log out from all devices
- ☑️ **Reset Password:** Change password immediately
- ☑️ **Remove Authentication Methods:** Remove MFA, FIDO keys

##### License Management
- ☑️ **Remove Licenses:** Free up assigned licenses
- ☑️ **Remove from Groups:** Security and M365 groups
- ☑️ **Remove App Access:** Revoke application permissions

##### Email Handling
- ☑️ **Convert to Shared Mailbox:** Retain emails (free)
- ☑️ **Set Automatic Reply:** Out-of-office message
- ☑️ **Forward Email:** Forward to manager/replacement
- ☑️ **Hide from Address Lists:** Remove from GAL
- ☑️ **Grant Mailbox Access:** Delegate to manager

##### Device Management
- ☑️ **Retire Devices:** Remove company data (BYOD)
- ☑️ **Wipe Devices:** Factory reset (corporate devices)
- ☑️ **Lock Devices:** Remote lock
- ☑️ **Remove from Intune:** Unenroll devices

#### Step 3: Data Handling

**OneDrive Data:**
- Transfer ownership to manager
- Transfer to specific user
- Retain for 30/60/90 days
- Archive to external storage

**Mailbox Access:**
- Grant Full Access to manager
- Grant Send As permission
- Grant Send on Behalf permission
- Duration: Temporary or permanent

**SharePoint/Teams:**
- Remove from all sites
- Transfer document ownership
- Maintain team file access (optional)

#### Step 4: Timing

**Execute Immediately:**
- Actions start within 1 minute
- Complete within 5-10 minutes
- Real-time progress tracking

**Schedule for Later:**
- Select specific date and time
- Choose timezone
- Add reminder (optional)
- Notify stakeholders

#### Step 5: Review & Execute

**Pre-Execution Checklist:**
- Review all selected actions
- Verify user information
- Check scheduled time (if applicable)
- Confirm data transfer recipients

**Execution:**
- Click "Start Offboarding"
- Monitor progress in real-time
- View success/failure for each step
- Download execution log

### Offboarding Best Practices

#### Recommended Checklist

**Day 1 (Immediate):**
1. ✅ Block sign-in
2. ✅ Revoke all sessions
3. ✅ Reset password
4. ✅ Remove authentication methods
5. ✅ Wipe/retire devices
6. ✅ Set automatic reply
7. ✅ Forward email to manager

**Within 24 Hours:**
1. ✅ Convert mailbox to shared
2. ✅ Grant mailbox access to manager
3. ✅ Hide from address lists
4. ✅ Document offboarding actions

**Within 1 Week:**
1. ✅ Transfer OneDrive ownership
2. ✅ Remove from Teams channels
3. ✅ Transfer document ownership
4. ✅ Backup critical data

**After 30-90 Days:**
1. ✅ Remove from all groups
2. ✅ Remove licenses
3. ✅ Delete user account (if legal allows)

### Data Retention Policies

**What Happens to Data:**

| Data Type | Default Retention | Options |
|-----------|------------------|---------|
| Mailbox | 30 days after deletion | Convert to shared (indefinite) |
| OneDrive | 30 days after deletion | Transfer ownership |
| Teams Files | Remains in channels | User removed from permissions |
| SharePoint | Remains in sites | User removed from permissions |
| Devices | Data wiped immediately | Retire or Wipe |

**Legal Hold Considerations:**
- Check for litigation holds
- Verify compliance requirements
- Consult legal before deletion
- Export data if needed

---

## Data Transfer

### The Transfer Wizard

**Navigation:** Transfer (left sidebar) or User Detail → Actions → Transfer

#### Step 1: Select Users

**Source User (From):**
- Departing employee
- User changing roles
- Temporary coverage

**Destination User (To):**
- Manager
- Replacement employee
- Team member
- Multiple users (split transfer)

#### Step 2: Choose Data to Transfer

**Mailbox Options:**
- ☑️ **Full Access:** Read all emails
- ☑️ **Send As:** Send email as user
- ☑️ **Send on Behalf:** Send on behalf of user
- Duration: Temporary (30/60/90 days) or permanent

**OneDrive Options:**
- ☑️ **All Files:** Transfer entire OneDrive
- ☑️ **Specific Folders:** Select folders
- ☑️ **Ownership:** Change owner or grant access
- ☑️ **Permissions:** Copy or reset

**SharePoint Options:**
- ☑️ **Site Permissions:** Transfer site access
- ☑️ **Document Ownership:** Change document owner
- ☑️ **List Permissions:** Transfer list access

**Teams Options:**
- ☑️ **Channel Memberships:** Add to channels
- ☑️ **Owner Roles:** Transfer team ownership
- ☑️ **Private Channels:** Grant access

**Groups & Applications:**
- ☑️ **Group Memberships:** Add to same groups
- ☑️ **Application Access:** Grant same app permissions
- ☑️ **Roles:** Transfer role assignments

#### Step 3: Transfer Options

**Copy vs. Move:**
- **Copy:** Source keeps data, destination gets copy
- **Move:** Data removed from source, moved to destination

**Permissions:**
- **Preserve:** Keep original permissions
- **Reset:** Apply destination user's default permissions

**Notifications:**
- ☑️ Notify source user
- ☑️ Notify destination user
- ☑️ Notify manager
- ☑️ Send summary email

#### Step 4: Review & Execute

**Review:**
- Source and destination users
- Data types selected
- Copy or move operation
- Estimated transfer time

**Execute:**
- Click "Start Transfer"
- Monitor progress
- View transfer logs
- Receive completion notification

### Transfer Time Estimates

| Data Type | Small | Medium | Large |
|-----------|-------|--------|-------|
| Permissions | 1-5 min | 1-5 min | 1-5 min |
| OneDrive (< 1 GB) | 5-15 min | - | - |
| OneDrive (1-10 GB) | - | 30-60 min | - |
| OneDrive (> 10 GB) | - | - | Several hours |
| Mailbox Delegation | 1-2 min | 1-2 min | 1-2 min |

### Use Cases for Data Transfer

1. **Employee Departure:**
   - Transfer work to manager during notice period
   - Move critical files to replacement
   - Grant temporary mailbox access

2. **Role Change:**
   - Move responsibilities to new role
   - Transfer project ownership
   - Update team access

3. **Temporary Coverage:**
   - Grant access during leave
   - Set expiration date
   - Auto-revoke after return

4. **Team Reorganization:**
   - Shift projects to new team
   - Update site permissions
   - Redistribute workload

---

## Device Management

### Viewing Devices

**Navigation:** Devices (left sidebar)

#### Device List
- All Intune-enrolled devices
- Search by device name or user
- Filter by:
  - Platform (Windows, iOS, Android, macOS)
  - Compliance status
  - Ownership (corporate/personal)
  - Enrollment type

#### Device Information
- Device name
- User (primary user)
- Operating system and version
- Compliance status
- Last sync time
- Enrollment date
- Serial number
- Model and manufacturer

### Device Actions

#### Sync Device
- **Purpose:** Force immediate check-in with Intune
- **When to Use:** After policy changes, troubleshooting
- **Duration:** 1-5 minutes

#### Retire Device
- **Purpose:** Remove company data, keep personal
- **Best For:** BYOD (personal) devices
- **What Gets Removed:**
  - Company emails
  - OneDrive files
  - Company apps
  - Intune management
- **What Stays:**
  - Personal photos/contacts
  - Personal apps
  - Device functionality

#### Wipe Device
- **Purpose:** Factory reset device
- **Best For:** Corporate-owned devices, lost/stolen devices
- **What Happens:**
  - Complete factory reset
  - ALL data removed (company + personal)
  - Cannot be undone
  - Device requires reconfiguration

#### Lock Device
- **Purpose:** Remotely lock device screen
- **When to Use:**
  - Lost device
  - Suspected theft
  - Emergency security measure
- **Duration:** Until unlock code entered

#### Delete Device
- **Purpose:** Remove from Intune management
- **When to Use:**
  - Device no longer in use
  - Cleanup old records
- **Note:** Doesn't affect physical device

### Compliance Status

#### Compliant ✅ (Green)
- Meets all compliance policies
- Can access company resources
- No action required

#### Non-Compliant ❌ (Red)
- Violates one or more policies
- May have restricted access
- User notified to remediate

**Common Non-Compliance Reasons:**
- Password not complex enough
- Device not encrypted
- OS out of date
- Jailbroken/rooted device
- Required app not installed

#### Grace Period ⏳ (Yellow)
- Recently became non-compliant
- User has time to fix issues
- Access still allowed temporarily
- Will be blocked after grace period

#### Not Evaluated ⚪ (Gray)
- Pending first compliance check
- Just enrolled
- Check scheduled

### Device Compliance Policies

**Example Policies:**
- Require password (min 8 characters)
- Require device encryption
- Require OS version (e.g., Windows 10+)
- Block jailbroken devices
- Require antivirus
- Block unauthorized apps

### Bulk Device Actions

**Select Multiple Devices:**
1. Check boxes next to devices
2. Click "Bulk Actions"
3. Choose action:
   - Sync all
   - Retire all
   - Export list

---

## Workflows & Automation

### What Are Workflows?

Workflows automate repetitive tasks and enforce consistent processes across your organization.

**Benefits:**
- Save time on routine tasks
- Ensure consistent execution
- Reduce human error
- Enforce compliance
- Scale operations

### Pre-Built Workflow Templates

#### 1. New Employee Onboarding
**Triggers:** Manual or scheduled
**Actions:**
1. Create user account
2. Assign licenses
3. Add to groups
4. Create mailbox
5. Send welcome email
6. Notify IT and manager

**Customizable:**
- License selection
- Group memberships
- Email template
- Notification recipients

#### 2. Employee Offboarding
**Triggers:** Manual, scheduled, or automated
**Actions:**
1. Block sign-in
2. Revoke sessions
3. Reset password
4. Convert mailbox to shared
5. Transfer OneDrive
6. Wipe devices
7. Remove licenses
8. Notify stakeholders

**Customizable:**
- Data retention period
- Transfer recipients
- Device actions
- Notification list

#### 3. Guest User Expiration
**Triggers:** Time-based (e.g., 90 days after creation)
**Actions:**
1. Send expiration warning (7 days before)
2. Notify sponsor
3. Block access on expiration
4. Remove from groups
5. Delete account (after 30 days)

**Customizable:**
- Expiration period
- Warning days
- Auto-delete option

#### 4. License Optimization
**Triggers:** Weekly/monthly scheduled
**Actions:**
1. Identify inactive users (no sign-in for X days)
2. Send notification to user and manager
3. Remove license if still inactive
4. Generate report

**Customizable:**
- Inactivity threshold
- Notification frequency
- Auto-remove option

#### 5. Device Compliance Enforcement
**Triggers:** Daily check
**Actions:**
1. Identify non-compliant devices
2. Send warning to user
3. Block access after grace period
4. Notify IT admin
5. Generate compliance report

**Customizable:**
- Grace period
- Warning frequency
- Access restrictions

#### 6. Password Expiry Reminder
**Triggers:** Daily check
**Actions:**
1. Identify users with passwords expiring soon
2. Send reminder email
3. Escalate if password expires
4. Force password reset

**Customizable:**
- Days before expiry
- Reminder frequency
- Email template

### Creating Custom Workflows

#### Workflow Builder

**Step 1: Configure Trigger**
- **Manual:** Start on-demand
- **Scheduled:** Run at specific time
  - Once
  - Daily
  - Weekly
  - Monthly
  - Custom schedule
- **Event-Based:** Triggered by event
  - User created
  - User disabled
  - License assigned
  - Device enrolled
  - Group membership changed

**Step 2: Add Actions**

**Available Actions:**
- **User Management:**
  - Create/update/delete user
  - Enable/disable account
  - Reset password
  - Add/remove from groups
  - Assign/remove licenses

- **Device Management:**
  - Sync device
  - Retire device
  - Wipe device
  - Lock device

- **Email/Mailbox:**
  - Convert to shared
  - Set automatic reply
  - Grant delegation
  - Forward email

- **Data Transfer:**
  - Transfer OneDrive
  - Grant mailbox access
  - Transfer permissions

- **Notifications:**
  - Send email
  - Send Teams message
  - Create service ticket
  - Webhook/API call

**Step 3: Add Conditions**
- **If/Then Logic:** Execute action only if condition met
- **Conditions:**
  - User property equals value
  - License assigned
  - Group membership
  - Compliance status
  - Last sign-in date

**Example:**
```
IF user.department == "Sales"
THEN assign license "Microsoft 365 E3"
```

**Step 4: Configure Notifications**
- Email recipients
- Message template
- Success/failure alerts
- Summary reports

**Step 5: Test & Activate**
- Test run with sample data
- Review execution log
- Fix any errors
- Activate workflow

### Monitoring Workflows

#### Workflow Dashboard
- **Active Workflows:** Currently enabled
- **Paused Workflows:** Temporarily disabled
- **Failed Workflows:** Errors need attention
- **Completed Runs:** Historical executions

#### Execution History
- Start time and duration
- Success/failure status
- Actions performed
- Errors encountered
- Affected users/devices

#### Logs & Troubleshooting
- Detailed step-by-step log
- Error messages
- Stack traces (for technical issues)
- Retry options

---

## Scheduled Tasks

### Viewing Scheduled Tasks

**Navigation:** Scheduled Offboarding (left sidebar)

#### Task List
- All upcoming scheduled tasks
- Sort by execution date
- Filter by user or action type
- Status: Scheduled, In Progress, Completed, Failed

#### Task Details
- User information
- Scheduled date and time
- Timezone
- Actions to perform
- Who created the task
- Notification recipients

### Managing Scheduled Tasks

#### Cancel Task
- Click "Cancel" button
- Confirm cancellation
- Task removed from queue
- No actions will execute

#### Modify Task
- Click "Edit" button
- Change date/time
- Add/remove actions
- Update notifications
- Save changes

#### Execute Immediately
- Click "Run Now"
- Confirm immediate execution
- Task starts within 1 minute
- Real-time progress tracking

### Task Execution

**When Scheduled Time Arrives:**
1. Task status changes to "In Progress"
2. Actions execute sequentially
3. Progress logged in real-time
4. Notifications sent
5. Status updated to "Completed" or "Failed"
6. Results saved in history

**Error Handling:**
- Failed actions logged with details
- Subsequent actions may continue or stop (configurable)
- Admin notified of failures
- Retry option available

### Notifications

**Before Execution:**
- Reminder 24 hours before
- Reminder 1 hour before
- Final confirmation (optional)

**During Execution:**
- Real-time progress updates
- Success/failure per action

**After Execution:**
- Completion summary
- Any errors encountered
- Download execution log

---

## Settings & Configuration

### Profile Settings

**Personal Information:**
- Display name
- Email address
- Profile picture
- Phone number
- Job title
- Department

**Change Password:**
- Current password
- New password
- Confirm new password

### Notification Preferences

**Email Notifications:**
- ☑️ Workflow completions
- ☑️ Scheduled task reminders
- ☑️ Failed actions
- ☑️ Weekly summary

**In-App Notifications:**
- ☑️ Real-time alerts
- ☑️ Task updates
- ☑️ System messages

**Push Notifications:**
- ☑️ Critical alerts only
- ☑️ All notifications

### Appearance

**Theme:**
- Light mode
- Dark mode
- Auto (system preference)

**Color Scheme:**
- Default (blue)
- Professional (gray)
- Vibrant (multi-color)

**Font Size:**
- Small
- Medium (default)
- Large
- Extra Large

### Language & Region

**Interface Language:**
- English
- Spanish
- French
- German
- Portuguese
- (More languages available)

**Date Format:**
- MM/DD/YYYY (US)
- DD/MM/YYYY (EU)
- YYYY-MM-DD (ISO)

**Time Format:**
- 12-hour (AM/PM)
- 24-hour

**Timezone:**
- Auto-detect
- Manual selection

### Default Settings

**Offboarding Defaults:**
Pre-select common actions:
- ☑️ Block sign-in
- ☑️ Revoke sessions
- ☑️ Convert mailbox to shared
- ☑️ Forward email to manager
- ☑️ Retire devices

**Data Retention:**
- OneDrive retention: 30/60/90 days
- Mailbox retention: 30/60/90 days
- Default transfer recipient: Manager

### Approval Workflows

**Require Approval For:**
- ☑️ User deletion
- ☑️ License removal
- ☑️ Device wipe
- ☑️ Data transfer

**Approvers:**
- Manager
- IT Admin
- Security Team
- Custom list

---

## Security & Permissions

### Authentication

**Clerk (Development):**
- Email/password
- Social sign-in (Google, Microsoft, GitHub)
- Passwordless (magic links)
- Multi-factor authentication

**Azure AD (Production):**
- Single Sign-On (SSO)
- Multi-factor authentication (MFA)
- Conditional access policies
- Device-based authentication

### Authorization (RBAC)

**Role-Based Access Control:**

| Role | Permissions |
|------|-------------|
| **Global Administrator** | Full access to all features |
| **User Administrator** | Manage users, groups, licenses |
| **Intune Administrator** | Manage devices only |
| **Helpdesk Administrator** | View-only, password resets |
| **Custom Roles** | Specific permissions assigned by admin |

### Permission Scopes

**User Management:**
- `User.ReadWrite.All` - Create, update, delete users
- `Group.ReadWrite.All` - Manage group memberships

**Device Management:**
- `DeviceManagementManagedDevices.ReadWrite.All` - Manage Intune devices
- `DeviceManagementApps.ReadWrite.All` - Manage apps

**Email/Mailbox:**
- `Mail.ReadWrite` - Access mailboxes
- `MailboxSettings.ReadWrite` - Configure mailbox settings

**Security:**
- `UserAuthenticationMethod.ReadWrite.All` - Manage MFA
- `AuditLog.Read.All` - Read audit logs

### Data Security

**Encryption:**
- **In Transit:** TLS 1.3
- **At Rest:** AES-256

**Authentication Tokens:**
- JWT with short expiration (1 hour)
- Refresh tokens for extended sessions
- Secure cookie storage
- CSRF protection

**Session Management:**
- Auto-logout after 30 minutes inactivity
- Force logout on password change
- Concurrent session limits

### Audit Logs

**What's Logged:**
- User actions (create, update, delete)
- Sign-in activity
- Permission changes
- Device actions
- Data transfers
- Failed login attempts

**Log Details:**
- Timestamp
- User (who performed action)
- Action type
- Target (affected user/device)
- IP address
- Result (success/failure)

**Retention:**
- Azure AD Free: 7 days
- Azure AD Premium P1: 30 days
- Azure AD Premium P2: 90 days
- With archival: Up to 2 years

**Export Options:**
- CSV
- JSON
- PDF report

### Compliance

**Standards:**
- GDPR compliance
- HIPAA compliance (with proper Azure AD plan)
- SOC 2 Type II
- ISO 27001

**Data Retention:**
- Configurable retention policies
- Legal hold support
- Data deletion on request
- Audit trail maintenance

---

## Best Practices

### Offboarding Best Practices

#### Pre-Offboarding Checklist
1. ✅ Verify correct user
2. ✅ Document reason for offboarding
3. ✅ Identify data transfer recipients
4. ✅ Check for legal holds
5. ✅ Notify manager and IT
6. ✅ Schedule during business hours

#### Security First
- Always block sign-in immediately
- Revoke sessions from all devices
- Remove authentication methods
- Change/reset password
- Wipe/retire devices promptly

#### Data Preservation
- Convert mailbox to shared (free)
- Transfer OneDrive before deletion
- Grant manager mailbox access
- Document data locations
- Backup critical information

#### Communication
- Set automatic reply with contact info
- Forward email to manager/replacement
- Notify team members
- Update documentation
- Close service tickets

#### Timeline
- **Immediate (Day 1):** Security actions
- **24 Hours:** Email handling
- **1 Week:** Data transfer
- **30-90 Days:** Final cleanup and deletion

### License Management

#### Optimization
- Remove licenses from inactive users
- Use workflows to identify unused licenses
- Right-size license assignments
- Monitor license costs

#### Assignment
- Assign only needed licenses
- Enable only required services
- Use group-based licensing
- Document license allocations

### Device Management

#### Enrollment
- Corporate devices: Company-owned mode
- Personal devices: BYOD mode
- Enforce compliance before access
- Regular sync checks

#### Compliance
- Set appropriate policies
- Grace periods for remediation
- Automated notifications
- Regular compliance audits

#### Security
- Require encryption
- Enforce password policies
- Keep OS updated
- Monitor for threats

### Workflow Design

#### Keep It Simple
- One workflow = one purpose
- Clear naming conventions
- Document workflow logic
- Regular testing

#### Error Handling
- Include condition checks
- Add error notifications
- Implement retry logic
- Log all actions

#### Maintenance
- Review workflows quarterly
- Update for new requirements
- Remove unused workflows
- Monitor execution metrics

---

## Troubleshooting

### Cannot Sign In

**Symptoms:**
- Login fails
- "Invalid credentials" error
- Redirects to login page

**Solutions:**
1. Verify correct email address
2. Check password (try reset)
3. Clear browser cache and cookies
4. Try different browser or incognito
5. Verify account not disabled
6. Check MFA is working
7. Contact administrator

### Insufficient Permissions

**Symptoms:**
- "Insufficient permissions" error
- Features grayed out or hidden
- API calls fail with 403

**Solutions:**
1. Check Settings → Profile for permissions
2. Identify required permission
3. Request from Azure AD admin
4. Wait 5-10 minutes after grant
5. Sign out and sign back in
6. Verify admin consent granted

### Actions Failing

**Symptoms:**
- Operations timeout
- "Request failed" errors
- Partial completion

**Solutions:**
1. Check internet connection
2. Verify Azure service status (status.azure.com)
3. Retry the action
4. Try smaller batches
5. Perform during off-peak hours
6. Check error logs for details

### Stale or Missing Data

**Symptoms:**
- Data not appearing
- Outdated information
- Empty lists

**Solutions:**
1. Click refresh button
2. Clear browser cache
3. Wait for Azure AD sync (5-15 min)
4. Verify permissions for data type
5. Check applied filters
6. Reload page

### Slow Performance

**Symptoms:**
- Page loads slowly
- Actions take long time
- Timeouts

**Solutions:**
1. Check internet speed
2. Close unused browser tabs
3. Clear browser cache
4. Try different browser
5. Check Azure service health
6. Reduce batch sizes

### Device Not Syncing

**Symptoms:**
- Last sync time old
- Compliance status not updated
- Policies not applied

**Solutions:**
1. Force sync from portal
2. Manually sync from device
3. Check internet on device
4. Verify Intune enrollment
5. Restart device
6. Re-enroll if needed

### Scheduled Tasks Not Executing

**Symptoms:**
- Task status still "Scheduled" after time
- No execution log
- No notifications

**Solutions:**
1. Verify correct timezone
2. Check task status for errors
3. Verify permissions still valid
4. Check user still exists
5. Review workflow logs
6. Manually execute to test

### Getting Help

**Resources:**
1. **Help Center:** Click "Help Center" in navigation
2. **FAQ:** Click "FAQ" for common questions
3. **Documentation:** Review README.md and guides
4. **Administrator:** Contact your IT admin
5. **Support:** Email support team
6. **Microsoft Docs:** docs.microsoft.com for Azure AD

**When Contacting Support:**
- Describe the issue clearly
- Include error messages (screenshots)
- Note date/time of issue
- List steps to reproduce
- Attach relevant logs

---

## Quick Reference

### Common Tasks

| Task | Navigation | Key Action |
|------|-----------|------------|
| Search users | Users | Enter name/email in search box |
| Offboard user | Offboarding | Select user → Choose actions → Execute |
| Schedule offboarding | Offboarding | Complete wizard → Choose "Schedule for later" |
| Transfer data | Transfer | Select source/destination → Choose data → Execute |
| Manage device | Devices | Click device → Choose action |
| View scheduled tasks | Scheduled Offboarding | View list → Edit/Cancel as needed |
| Create workflow | Workflows | Create Workflow → Configure → Activate |
| Change settings | Settings | Update preferences → Save |

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `Ctrl + K` |
| Dashboard | `Alt + D` |
| Users | `Alt + U` |
| Settings | `Alt + S` |
| Help | `F1` |
| Logout | `Ctrl + Shift + L` |

### Status Indicators

| Icon | Meaning |
|------|---------|
| ✅ Green | Compliant, Success, Active |
| ❌ Red | Non-compliant, Failed, Blocked |
| ⏳ Yellow | Grace Period, In Progress, Warning |
| ⚪ Gray | Not Evaluated, Pending, Inactive |
| 🔵 Blue | Information, Notice |

---

## Appendix

### Related Documentation

- `README.md` - Project overview and setup
- `AZURE_AD_PERMISSIONS_SETUP.md` - Azure AD configuration
- `CLERK_JWT_SETUP.md` - Clerk JWT configuration
- `TESTING_CLERK_JWT.md` - Testing authentication
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `SECURITY_ARCHITECTURE.md` - Security details

### API Permissions Reference

See `AZURE_PERMISSIONS_REQUIRED.md` for complete list of required Azure AD permissions.

### Support Contacts

- **IT Administrator:** [Your IT admin contact]
- **Support Team:** support@yourcompany.com
- **Emergency:** [Emergency contact]

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Next Review:** February 17, 2026
