import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QuestionMarkCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

const Help = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpenIcon,
      color: 'blue',
      topics: [
        {
          question: 'How do I sign in?',
          answer: (
            <div className="space-y-2">
              <p>The Employee Offboarding Portal supports two authentication methods:</p>
              <div className="ml-4 space-y-2">
                <div>
                  <p className="font-semibold">1. Clerk Authentication (Recommended for development/testing)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Click "Sign In" on the login page</li>
                    <li>Enter your email and password</li>
                    <li>Or use social sign-in options (Google, Microsoft, etc.)</li>
                    <li>New users can create an account via "Sign Up"</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">2. Azure AD SSO (For enterprise deployment)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Click "Sign in with Microsoft" on the login page</li>
                    <li>Enter your organization email address</li>
                    <li>Complete Microsoft authentication</li>
                    <li>Your Azure AD roles determine your permissions</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        {
          question: 'What permissions do I need?',
          answer: (
            <div className="space-y-2">
              <p>Different features require different Azure AD permissions:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>User Management:</strong> User.ReadWrite.All, Group.ReadWrite.All</li>
                <li><strong>Device Management:</strong> DeviceManagementManagedDevices.ReadWrite.All</li>
                <li><strong>Email/Mailbox:</strong> Mail.ReadWrite, MailboxSettings.ReadWrite</li>
                <li><strong>Authentication Methods:</strong> UserAuthenticationMethod.ReadWrite.All</li>
                <li><strong>Lifecycle Workflows:</strong> LifecycleWorkflows.ReadWrite.All</li>
                <li><strong>Audit Logs:</strong> AuditLog.Read.All</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">Contact your administrator if you need additional permissions.</p>
            </div>
          ),
        },
        {
          question: 'How do I navigate the interface?',
          answer: (
            <div className="space-y-2">
              <p>The portal has a main navigation menu on the left side:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Dashboard:</strong> Overview of recent activity and statistics</li>
                <li><strong>Users:</strong> Search and manage users in your organization</li>
                <li><strong>Onboarding:</strong> Create new user accounts and configure access</li>
                <li><strong>Offboarding:</strong> Remove users and revoke their access</li>
                <li><strong>Transfer:</strong> Transfer data and permissions between users</li>
                <li><strong>Scheduled Tasks:</strong> View and manage scheduled offboarding</li>
                <li><strong>Workflows:</strong> Automate repetitive tasks</li>
                <li><strong>Devices:</strong> Manage Intune-enrolled devices</li>
                <li><strong>Settings:</strong> Configure portal preferences</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: QuestionMarkCircleIcon,
      color: 'purple',
      topics: [
        {
          question: 'What information does the dashboard show?',
          answer: (
            <div className="space-y-2">
              <p>The dashboard provides an at-a-glance view of your organization:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Statistics Cards:</strong> Total users, active licenses, devices, pending tasks</li>
                <li><strong>Recent Users:</strong> Recently modified user accounts</li>
                <li><strong>Device Compliance:</strong> Overview of compliant vs. non-compliant devices</li>
                <li><strong>Activity Timeline:</strong> Recent actions taken in the portal</li>
                <li><strong>Quick Actions:</strong> Shortcuts to common tasks</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">The dashboard auto-refreshes every 5 minutes to show the latest data.</p>
            </div>
          ),
        },
        {
          question: 'How do I use quick actions?',
          answer: (
            <div className="space-y-2">
              <p>Quick action buttons provide fast access to common tasks:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Search Users:</strong> Navigate to user search page</li>
                <li><strong>New Offboarding:</strong> Start the offboarding wizard</li>
                <li><strong>Schedule Task:</strong> Create a scheduled offboarding</li>
                <li><strong>View Devices:</strong> Go to device management</li>
              </ul>
              <p className="mt-2">Click any quick action button to navigate directly to that feature.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'user-management',
      title: 'User Management',
      icon: UserGroupIcon,
      color: 'green',
      topics: [
        {
          question: 'How do I search for users?',
          answer: (
            <div className="space-y-2">
              <p>To search for users in your organization:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Navigate to <strong>Users</strong> in the left menu</li>
                <li>Enter search criteria in the search box (name, email, or department)</li>
                <li>Use filters to narrow results (active/inactive, licensed, etc.)</li>
                <li>Click on a user to view their detailed profile</li>
              </ol>
              <p className="mt-2 text-sm bg-blue-50 p-2 rounded">
                💡 <strong>Tip:</strong> You can search by partial names or email addresses. The search is case-insensitive.
              </p>
            </div>
          ),
        },
        {
          question: 'What user information can I view?',
          answer: (
            <div className="space-y-2">
              <p>The user detail page shows comprehensive information:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Basic Info:</strong> Name, email, job title, department, manager</li>
                <li><strong>Account Status:</strong> Enabled/disabled, sign-in activity</li>
                <li><strong>Licenses:</strong> Assigned Microsoft 365 licenses</li>
                <li><strong>Groups:</strong> Azure AD and Microsoft 365 group memberships</li>
                <li><strong>Devices:</strong> Enrolled devices and compliance status</li>
                <li><strong>Mailbox:</strong> Email forwarding, automatic replies, storage usage</li>
                <li><strong>Authentication:</strong> MFA status, sign-in methods</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'How do I modify user settings?',
          answer: (
            <div className="space-y-2">
              <p>From the user detail page, you can:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Click <strong>Edit User</strong> to update basic information</li>
                <li>Click <strong>Manage Licenses</strong> to add/remove licenses</li>
                <li>Click <strong>Reset Password</strong> to generate a new password</li>
                <li>Click <strong>Block Sign-In</strong> to disable the account</li>
                <li>Use action buttons for quick tasks (offboard, transfer, etc.)</li>
              </ul>
              <p className="mt-2 text-sm text-amber-600">⚠️ Some actions require specific Azure AD permissions.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'onboarding',
      title: 'User Onboarding',
      icon: UserPlusIcon,
      color: 'emerald',
      topics: [
        {
          question: 'How do I onboard a new user?',
          answer: (
            <div className="space-y-2">
              <p>The onboarding wizard guides you through creating a new user account:</p>
              <ol className="list-decimal ml-6 space-y-2">
                <li>
                  <strong>Step 1: User Information</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Enter first name, last name, and job title</li>
                    <li>Specify department and manager</li>
                    <li>Choose username format or enter custom</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 2: Account Settings</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Set initial password (or auto-generate)</li>
                    <li>Configure password change requirements</li>
                    <li>Set account usage location</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 3: Licenses & Groups</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Assign Microsoft 365 licenses</li>
                    <li>Add to security and distribution groups</li>
                    <li>Grant application access</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 4: Review & Create</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Review all settings</li>
                    <li>Click "Create User" to finalize</li>
                    <li>Copy or email credentials to user</li>
                  </ul>
                </li>
              </ol>
            </div>
          ),
        },
        {
          question: 'Can I clone an existing user?',
          answer: (
            <div className="space-y-2">
              <p>Yes! Cloning is the fastest way to onboard users with similar roles:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Go to the user you want to clone</li>
                <li>Click <strong>Actions → Clone User</strong></li>
                <li>The wizard pre-fills licenses, groups, and settings</li>
                <li>Update the new user's name and email</li>
                <li>Review and create</li>
              </ol>
              <p className="mt-2 text-sm bg-blue-50 p-2 rounded">
                💡 <strong>Tip:</strong> Cloning copies all licenses, group memberships, and mailbox settings but not personal data.
              </p>
            </div>
          ),
        },
        {
          question: 'What happens after I create a user?',
          answer: (
            <div className="space-y-2">
              <p>After clicking "Create User", the portal will:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Create the user account in Azure AD</li>
                <li>Assign selected licenses (takes 5-10 minutes to activate)</li>
                <li>Add user to specified groups</li>
                <li>Create an Exchange mailbox (if licensed)</li>
                <li>Generate a temporary password</li>
                <li>Send a welcome email (if configured)</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">You can track progress on the dashboard's activity timeline.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'offboarding',
      title: 'User Offboarding',
      icon: UserMinusIcon,
      color: 'red',
      topics: [
        {
          question: 'How do I offboard a user?',
          answer: (
            <div className="space-y-2">
              <p>The offboarding wizard helps you securely remove users:</p>
              <ol className="list-decimal ml-6 space-y-2">
                <li>
                  <strong>Step 1: Select User</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Search for the user to offboard</li>
                    <li>Verify you have the correct user</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 2: Choose Actions</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Block sign-in (prevent account access)</li>
                    <li>Revoke sessions (log out from all devices)</li>
                    <li>Remove licenses (free up licenses)</li>
                    <li>Remove from groups</li>
                    <li>Remove authentication methods (MFA, FIDO keys)</li>
                    <li>Convert mailbox to shared</li>
                    <li>Set automatic reply (out-of-office message)</li>
                    <li>Forward email to manager</li>
                    <li>Hide from address lists</li>
                    <li>Wipe or retire devices</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 3: Data Handling</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Transfer OneDrive ownership</li>
                    <li>Grant mailbox access to manager</li>
                    <li>Backup important files</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 4: Timing</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Execute immediately</li>
                    <li>Or schedule for specific date/time</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 5: Review & Execute</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Review all selected actions</li>
                    <li>Click "Start Offboarding" to begin</li>
                    <li>Monitor progress in real-time</li>
                  </ul>
                </li>
              </ol>
            </div>
          ),
        },
        {
          question: 'What is the recommended offboarding checklist?',
          answer: (
            <div className="space-y-2">
              <p>Follow this best-practice checklist for secure offboarding:</p>
              <div className="ml-4 space-y-3">
                <div>
                  <p className="font-semibold">✅ Immediate Actions (Day 1)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Block sign-in to prevent access</li>
                    <li>Revoke all active sessions</li>
                    <li>Remove authentication methods</li>
                    <li>Change or reset password</li>
                    <li>Wipe personal devices (BYOD)</li>
                    <li>Retire corporate devices</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">📧 Email Handling (Within 24 hours)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Set automatic reply with contact info</li>
                    <li>Forward email to manager</li>
                    <li>Convert to shared mailbox (retain emails)</li>
                    <li>Hide from global address list</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">📂 Data Retention (Within 1 week)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Transfer OneDrive ownership</li>
                    <li>Grant mailbox delegation to manager</li>
                    <li>Remove from Teams channels</li>
                    <li>Transfer document ownership</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">🗑️ Final Cleanup (After 30-90 days)</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Remove from all groups</li>
                    <li>Remove licenses</li>
                    <li>Delete user account (if legal allows)</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        {
          question: 'Can I schedule an offboarding in advance?',
          answer: (
            <div className="space-y-2">
              <p>Yes! Schedule offboarding for future dates:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Complete the offboarding wizard normally</li>
                <li>On Step 4 (Timing), choose "Schedule for later"</li>
                <li>Select the date and time</li>
                <li>Choose your timezone</li>
                <li>The actions will execute automatically at that time</li>
              </ol>
              <p className="mt-2">View scheduled tasks at <strong>Scheduled Offboarding</strong> in the left menu.</p>
              <p className="text-sm bg-blue-50 p-2 rounded mt-2">
                💡 <strong>Tip:</strong> You can cancel or modify scheduled tasks anytime before they execute.
              </p>
            </div>
          ),
        },
        {
          question: 'What happens to the user\'s data?',
          answer: (
            <div className="space-y-2">
              <p>Data handling depends on your selected actions:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Mailbox:</strong> Converted to shared mailbox (retains emails for 30-90 days) or deleted with account</li>
                <li><strong>OneDrive:</strong> Remains accessible for 30 days after account deletion, can be transferred to another user</li>
                <li><strong>Teams Files:</strong> Stay in team channels (not deleted)</li>
                <li><strong>SharePoint:</strong> Documents remain in site, user removed from permissions</li>
                <li><strong>Devices:</strong> Wiped (personal) or retired (corporate) - data is removed</li>
              </ul>
              <p className="mt-2 text-sm text-amber-600">⚠️ Consult your legal/compliance team for data retention policies before offboarding.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'transfer',
      title: 'Data Transfer',
      icon: ArrowPathIcon,
      color: 'indigo',
      topics: [
        {
          question: 'How do I transfer data between users?',
          answer: (
            <div className="space-y-2">
              <p>The transfer wizard helps move data and permissions:</p>
              <ol className="list-decimal ml-6 space-y-2">
                <li>
                  <strong>Step 1: Select Users</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Choose source user (data from)</li>
                    <li>Choose destination user (data to)</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 2: Choose What to Transfer</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Mailbox delegation (read/send as permissions)</li>
                    <li>OneDrive files and folders</li>
                    <li>SharePoint permissions</li>
                    <li>Teams memberships</li>
                    <li>Group memberships</li>
                    <li>Application access</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 3: Transfer Options</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Copy (keeps original) or Move (removes from source)</li>
                    <li>Notify affected users</li>
                    <li>Preserve permissions or reset</li>
                  </ul>
                </li>
                <li>
                  <strong>Step 4: Review & Execute</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Verify selections</li>
                    <li>Click "Start Transfer"</li>
                    <li>Monitor progress</li>
                  </ul>
                </li>
              </ol>
            </div>
          ),
        },
        {
          question: 'When should I use data transfer?',
          answer: (
            <div className="space-y-2">
              <p>Use the transfer wizard in these scenarios:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Employee Departure:</strong> Transfer work to manager or replacement</li>
                <li><strong>Role Change:</strong> Move responsibilities to new role owner</li>
                <li><strong>Team Reorganization:</strong> Shift projects to new team members</li>
                <li><strong>Temporary Coverage:</strong> Grant temporary access during leave</li>
                <li><strong>Succession Planning:</strong> Prepare for planned transitions</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'How long does data transfer take?',
          answer: (
            <div className="space-y-2">
              <p>Transfer time depends on the amount of data:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Permissions:</strong> 1-5 minutes (instant via API)</li>
                <li><strong>Small OneDrive:</strong> 5-15 minutes (under 1 GB)</li>
                <li><strong>Medium OneDrive:</strong> 30-60 minutes (1-10 GB)</li>
                <li><strong>Large OneDrive:</strong> Several hours (over 10 GB)</li>
                <li><strong>Mailbox Delegation:</strong> 1-2 minutes</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">Large transfers run in the background. You'll receive a notification when complete.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'devices',
      title: 'Device Management',
      icon: DevicePhoneMobileIcon,
      color: 'cyan',
      topics: [
        {
          question: 'What devices can I manage?',
          answer: (
            <div className="space-y-2">
              <p>The portal manages devices enrolled in Microsoft Intune:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Windows PCs:</strong> Company laptops and desktops</li>
                <li><strong>iOS Devices:</strong> iPhones and iPads</li>
                <li><strong>Android Devices:</strong> Phones and tablets</li>
                <li><strong>macOS Devices:</strong> MacBooks and iMacs</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">Only devices enrolled in Intune appear in the portal.</p>
            </div>
          ),
        },
        {
          question: 'How do I manage devices?',
          answer: (
            <div className="space-y-2">
              <p>From the <strong>Devices</strong> page, you can:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>View All Devices:</strong> See compliance status, OS, last sync</li>
                <li><strong>Search Devices:</strong> Find by name, user, or type</li>
                <li><strong>Sync Device:</strong> Force check-in with Intune</li>
                <li><strong>Retire Device:</strong> Remove company data, keep personal (BYOD)</li>
                <li><strong>Wipe Device:</strong> Factory reset, remove all data (corporate)</li>
                <li><strong>Lock Device:</strong> Remotely lock the device</li>
                <li><strong>View Details:</strong> Hardware info, installed apps, compliance</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'What\'s the difference between Retire and Wipe?',
          answer: (
            <div className="space-y-2">
              <p>Choose the appropriate action based on device ownership:</p>
              <div className="ml-4 space-y-2">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-semibold">🔵 Retire (Recommended for BYOD)</p>
                  <ul className="list-disc ml-6 space-y-1 mt-1">
                    <li>Removes company data (emails, files, apps)</li>
                    <li>Removes Intune management</li>
                    <li>Keeps personal data intact</li>
                    <li>User keeps the device</li>
                    <li>Less disruptive</li>
                  </ul>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <p className="font-semibold">🔴 Wipe (For corporate devices)</p>
                  <ul className="list-disc ml-6 space-y-1 mt-1">
                    <li>Factory resets the device</li>
                    <li>Removes ALL data (company + personal)</li>
                    <li>Device must be returned or reconfigured</li>
                    <li>Cannot be undone</li>
                    <li>Use when device is lost/stolen or being returned</li>
                  </ul>
                </div>
              </div>
            </div>
          ),
        },
        {
          question: 'How do I check device compliance?',
          answer: (
            <div className="space-y-2">
              <p>View compliance status on the Devices page:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Compliant:</strong> ✅ Green - Meets all policies</li>
                <li><strong>Non-Compliant:</strong> ❌ Red - Violates one or more policies</li>
                <li><strong>Grace Period:</strong> ⏳ Yellow - Time to fix before enforcement</li>
                <li><strong>Not Evaluated:</strong> ⚪ Gray - Pending first check</li>
              </ul>
              <p className="mt-2">Click a device to see which specific policies failed.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'workflows',
      title: 'Automated Workflows',
      icon: CalendarIcon,
      color: 'violet',
      topics: [
        {
          question: 'What are automated workflows?',
          answer: (
            <div className="space-y-2">
              <p>Workflows automate repetitive tasks and enforce consistent processes:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Pre-defined Templates:</strong> Ready-to-use workflows for common scenarios</li>
                <li><strong>Scheduled Execution:</strong> Run tasks at specific times</li>
                <li><strong>Conditional Logic:</strong> Execute actions based on criteria</li>
                <li><strong>Multi-step Processes:</strong> Chain multiple actions together</li>
                <li><strong>Notifications:</strong> Alert stakeholders of progress</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'What workflow templates are available?',
          answer: (
            <div className="space-y-2">
              <p>The portal includes these pre-built workflows:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>New Employee Onboarding:</strong> Create account, assign licenses, add to groups, send welcome email</li>
                <li><strong>Employee Offboarding:</strong> Block sign-in, revoke sessions, convert mailbox, transfer data</li>
                <li><strong>Guest User Expiration:</strong> Automatically remove guest access after X days</li>
                <li><strong>License Optimization:</strong> Remove licenses from inactive users</li>
                <li><strong>Device Compliance:</strong> Notify users of non-compliant devices</li>
                <li><strong>Password Expiry Reminder:</strong> Alert users before password expires</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'How do I create a custom workflow?',
          answer: (
            <div className="space-y-2">
              <p>To create a custom workflow:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Go to <strong>Workflows</strong> in the left menu</li>
                <li>Click <strong>Create Workflow</strong></li>
                <li>Choose "Start from scratch" or select a template to modify</li>
                <li>Add workflow steps (actions to perform)</li>
                <li>Configure conditions (when to run each step)</li>
                <li>Set schedule (immediate, recurring, or event-triggered)</li>
                <li>Add notifications (who to alert)</li>
                <li>Test the workflow</li>
                <li>Activate it</li>
              </ol>
            </div>
          ),
        },
        {
          question: 'How do I monitor workflow execution?',
          answer: (
            <div className="space-y-2">
              <p>Track workflow status and history:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Workflow List:</strong> Shows active, paused, and completed workflows</li>
                <li><strong>Execution History:</strong> View past runs with timestamps</li>
                <li><strong>Success/Failure Status:</strong> See which steps succeeded or failed</li>
                <li><strong>Logs:</strong> Detailed logs for troubleshooting</li>
                <li><strong>Notifications:</strong> Email alerts for failures</li>
              </ul>
              <p className="mt-2">Failed workflows can be retried or modified to fix issues.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'scheduled-tasks',
      title: 'Scheduled Tasks',
      icon: CalendarIcon,
      color: 'amber',
      topics: [
        {
          question: 'How do I view scheduled tasks?',
          answer: (
            <div className="space-y-2">
              <p>Navigate to <strong>Scheduled Offboarding</strong> to see all upcoming tasks:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>View list of scheduled offboarding tasks</li>
                <li>See user name, scheduled date/time, and actions</li>
                <li>Filter by date range or user</li>
                <li>Sort by execution time</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'Can I cancel or modify a scheduled task?',
          answer: (
            <div className="space-y-2">
              <p>Yes, scheduled tasks can be managed before execution:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Cancel:</strong> Click "Cancel" to remove the scheduled task entirely</li>
                <li><strong>Modify:</strong> Click "Edit" to change the date/time or selected actions</li>
                <li><strong>Execute Now:</strong> Click "Run Now" to execute immediately instead of waiting</li>
              </ul>
              <p className="mt-2 text-sm text-amber-600">⚠️ Once a task starts executing, it cannot be stopped mid-process.</p>
            </div>
          ),
        },
        {
          question: 'What happens when a scheduled task executes?',
          answer: (
            <div className="space-y-2">
              <p>When the scheduled time arrives:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Task moves from "Scheduled" to "In Progress" status</li>
                <li>Each configured action executes sequentially</li>
                <li>Progress is logged in real-time</li>
                <li>Notifications sent to specified recipients</li>
                <li>Task moves to "Completed" or "Failed" status</li>
                <li>Results are saved in execution history</li>
              </ol>
            </div>
          ),
        },
      ],
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      icon: Cog6ToothIcon,
      color: 'gray',
      topics: [
        {
          question: 'What can I configure in Settings?',
          answer: (
            <div className="space-y-2">
              <p>The Settings page lets you customize portal behavior:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Profile Settings:</strong> Your name, email, profile picture</li>
                <li><strong>Notification Preferences:</strong> Email, in-app, and push notifications</li>
                <li><strong>Theme:</strong> Light mode, dark mode, or auto (system)</li>
                <li><strong>Language:</strong> Interface language (English, Spanish, French, etc.)</li>
                <li><strong>Default Actions:</strong> Pre-select common offboarding actions</li>
                <li><strong>Retention Policies:</strong> Default data retention periods</li>
                <li><strong>Approval Workflows:</strong> Require approval for certain actions</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'How do I enable dark mode?',
          answer: (
            <div className="space-y-2">
              <p>To enable dark mode:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Go to <strong>Settings</strong></li>
                <li>Click on <strong>Appearance</strong></li>
                <li>Select <strong>Dark</strong> theme</li>
                <li>Or choose <strong>Auto</strong> to match your system settings</li>
              </ol>
              <p className="mt-2 text-sm bg-blue-50 p-2 rounded">
                💡 <strong>Tip:</strong> Auto mode switches between light and dark based on your OS preference.
              </p>
            </div>
          ),
        },
        {
          question: 'How do I configure Azure AD integration?',
          answer: (
            <div className="space-y-2">
              <p>Azure AD configuration requires administrator access:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>In Azure Portal, register the app</li>
                <li>Configure redirect URIs</li>
                <li>Add required API permissions (see AZURE_PERMISSIONS_REQUIRED.md)</li>
                <li>Grant admin consent</li>
                <li>Copy Client ID and Tenant ID</li>
                <li>In portal Settings → Azure AD, enter credentials</li>
                <li>Test connection</li>
              </ol>
              <p className="mt-2 text-sm text-gray-600">See AZURE_AD_PERMISSIONS_SETUP.md for detailed instructions.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: ShieldCheckIcon,
      color: 'red',
      topics: [
        {
          question: 'Is my data secure?',
          answer: (
            <div className="space-y-2">
              <p>The portal implements enterprise-grade security:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Authentication:</strong> Azure AD SSO or Clerk (OAuth 2.0)</li>
                <li><strong>Authorization:</strong> Role-based access control (RBAC)</li>
                <li><strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest</li>
                <li><strong>API Security:</strong> JWT tokens with short expiration</li>
                <li><strong>Audit Logs:</strong> All actions logged with timestamps</li>
                <li><strong>Multi-Factor Auth:</strong> Supports MFA via Azure AD</li>
                <li><strong>Session Management:</strong> Auto-logout after inactivity</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'What permissions do I have?',
          answer: (
            <div className="space-y-2">
              <p>Your permissions are determined by your role:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Global Administrator:</strong> Full access to all features</li>
                <li><strong>User Administrator:</strong> Manage users, groups, licenses</li>
                <li><strong>Intune Administrator:</strong> Manage devices only</li>
                <li><strong>Helpdesk Administrator:</strong> View-only access, password resets</li>
                <li><strong>Custom Roles:</strong> Specific permissions assigned by admin</li>
              </ul>
              <p className="mt-2">Check Settings → Profile to see your assigned permissions.</p>
            </div>
          ),
        },
        {
          question: 'How long are audit logs retained?',
          answer: (
            <div className="space-y-2">
              <p>Audit log retention varies by plan:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Azure AD Free:</strong> 7 days</li>
                <li><strong>Azure AD Premium P1:</strong> 30 days</li>
                <li><strong>Azure AD Premium P2:</strong> 90 days</li>
                <li><strong>With archival:</strong> Up to 2 years (export to storage)</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">The portal displays logs based on your Azure AD license level.</p>
            </div>
          ),
        },
        {
          question: 'Can I export audit logs?',
          answer: (
            <div className="space-y-2">
              <p>Yes, export logs for compliance and archival:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Go to <strong>Dashboard → Activity Timeline</strong></li>
                <li>Click <strong>Export</strong> button</li>
                <li>Select date range</li>
                <li>Choose format (CSV, JSON, or PDF)</li>
                <li>Click <strong>Download</strong></li>
              </ol>
              <p className="mt-2">Exported logs include user, action, timestamp, IP address, and result.</p>
            </div>
          ),
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: LightBulbIcon,
      color: 'yellow',
      topics: [
        {
          question: 'I can\'t sign in',
          answer: (
            <div className="space-y-2">
              <p>Try these troubleshooting steps:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Verify you're using the correct email address</li>
                <li>Check if your password is correct (try reset if forgotten)</li>
                <li>Clear browser cache and cookies</li>
                <li>Try a different browser or incognito mode</li>
                <li>Verify your account isn't disabled in Azure AD</li>
                <li>Check if MFA is required and working</li>
                <li>Contact your administrator if issues persist</li>
              </ol>
            </div>
          ),
        },
        {
          question: 'I see "Insufficient permissions" errors',
          answer: (
            <div className="space-y-2">
              <p>This means your account lacks required Azure AD permissions:</p>
              <ol className="list-decimal ml-6 space-y-1">
                <li>Go to Settings → Profile to view your permissions</li>
                <li>Identify which permission is needed for the action</li>
                <li>Contact your Azure AD administrator</li>
                <li>Request the specific permission or role</li>
                <li>Wait 5-10 minutes after permissions are granted</li>
                <li>Sign out and sign back in to refresh your token</li>
              </ol>
            </div>
          ),
        },
        {
          question: 'Actions are failing or timing out',
          answer: (
            <div className="space-y-2">
              <p>If operations fail or take too long:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Check Internet:</strong> Ensure stable connection</li>
                <li><strong>Azure Status:</strong> Check status.azure.com for outages</li>
                <li><strong>Retry:</strong> Most failed actions can be retried safely</li>
                <li><strong>Smaller Batches:</strong> Try processing fewer users at once</li>
                <li><strong>Off-Peak Hours:</strong> Large operations during low-usage times</li>
                <li><strong>Logs:</strong> Check error details in activity logs</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'Data isn\'t appearing or is outdated',
          answer: (
            <div className="space-y-2">
              <p>If you see stale or missing data:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Refresh:</strong> Click the refresh button or reload page</li>
                <li><strong>Cache:</strong> Clear browser cache (Ctrl+Shift+Delete)</li>
                <li><strong>Sync Delay:</strong> Azure AD sync takes 5-15 minutes</li>
                <li><strong>Permissions:</strong> Verify you can access that data type</li>
                <li><strong>Filters:</strong> Check if filters are hiding data</li>
              </ul>
            </div>
          ),
        },
        {
          question: 'Where can I get more help?',
          answer: (
            <div className="space-y-2">
              <p>Additional support resources:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>FAQ:</strong> Check the FAQ page for common questions</li>
                <li><strong>Documentation:</strong> Read README.md and setup guides in the project</li>
                <li><strong>Administrator:</strong> Contact your IT administrator</li>
                <li><strong>Support Team:</strong> Email support@yourcompany.com</li>
                <li><strong>Microsoft Docs:</strong> docs.microsoft.com for Azure AD help</li>
              </ul>
            </div>
          ),
        },
      ],
    },
  ];

  // Filter sections based on search query
  const filteredSections = searchQuery
    ? helpSections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.topics.some(topic =>
          topic.question.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : helpSections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <QuestionMarkCircleIcon className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Help Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Learn how to use the Employee Offboarding Portal
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <QuestionMarkCircleIcon className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Dashboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">View overview</p>
          </button>
          <button
            onClick={() => navigate('/faq')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">FAQ</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Common questions</p>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <Cog6ToothIcon className="h-6 w-6 text-gray-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Configure portal</p>
          </button>
        </div>

        {/* Help Sections */}
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const colorClasses = {
              blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
              purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
              green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
              emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
              red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
              indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
              cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300',
              violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
              amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
              gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
              yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
            };

            return (
              <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${colorClasses[section.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({section.topics.length} topics)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6">
                    {section.topics.map((topic, idx) => (
                      <div key={idx} className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          {topic.question}
                        </h3>
                        <div className="text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none">
                          {topic.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Try searching with different keywords or browse all topics above.
            </p>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 text-center">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Still need help?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Contact your administrator or support team for additional assistance.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/faq')}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              View FAQ
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
