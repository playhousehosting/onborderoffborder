import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ServerIcon,
  CloudIcon,
  UserGroupIcon,
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
  HomeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const FAQ = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openCategory, setOpenCategory] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);

  const toggleCategory = (categoryId) => {
    setOpenCategory(openCategory === categoryId ? null : categoryId);
    setOpenQuestion(null);
  };

  const toggleQuestion = (questionId) => {
    setOpenQuestion(openQuestion === questionId ? null : questionId);
  };

  // Helper function to format FAQ answers with better styling
  const formatAnswer = (answer) => {
    // Split answer into sections
    const sections = answer.split('\n\n');
    
    return sections.map((section, index) => {
      // Check if section is a list (starts with bullet points or numbers)
      const isBulletList = section.trim().match(/^[•✅✓❌]/);
      const isNumberedList = section.trim().match(/^\d+[\.)]/);
      const isHeading = section.trim().match(/^\*\*(.+?)\*\*/);
      
      if (isBulletList || section.includes('•') || section.includes('✅')) {
        // Format as bullet list
        const items = section.split('\n').filter(line => line.trim());
        return (
          <ul key={index} className="space-y-2 my-4">
            {items.map((item, i) => {
              // Remove bullet character and trim
              const cleanItem = item.replace(/^[•✅✓❌]\s*/, '').trim();
              const isBold = cleanItem.startsWith('**');
              
              return (
                <li key={i} className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1 flex-shrink-0">
                    {item.includes('✅') ? '✅' : item.includes('❌') ? '❌' : '•'}
                  </span>
                  <span className={isBold ? 'font-semibold' : ''}>
                    {cleanItem.replace(/\*\*/g, '')}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      } else if (isNumberedList) {
        // Format as numbered list
        const items = section.split('\n').filter(line => line.trim());
        return (
          <ol key={index} className="list-decimal list-inside space-y-2 my-4 ml-2">
            {items.map((item, i) => {
              const cleanItem = item.replace(/^\d+[\.)]\s*/, '').trim();
              return (
                <li key={i} className="text-gray-700">
                  {cleanItem}
                </li>
              );
            })}
          </ol>
        );
      } else if (section.includes('**') && section.split('**').length > 2) {
        // Format text with bold sections
        const parts = section.split('**');
        return (
          <p key={index} className="text-gray-700 leading-relaxed my-3">
            {parts.map((part, i) => 
              i % 2 === 0 ? part : <strong key={i} className="font-semibold text-gray-900">{part}</strong>
            )}
          </p>
        );
      } else if (section.trim().startsWith('OPTION') || section.trim().startsWith('SCENARIO')) {
        // Format as highlighted section
        return (
          <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4 rounded-r">
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{section}</p>
          </div>
        );
      } else if (section.includes(':') && section.split(':')[0].length < 50) {
        // Format as definition/description
        const [term, ...rest] = section.split(':');
        return (
          <div key={index} className="my-3">
            <dt className="font-semibold text-gray-900 mb-1">{term}:</dt>
            <dd className="text-gray-700 ml-4 leading-relaxed">{rest.join(':')}</dd>
          </div>
        );
      } else {
        // Regular paragraph
        return (
          <p key={index} className="text-gray-700 leading-relaxed my-3">
            {section}
          </p>
        );
      }
    });
  };

  const faqCategories = [
    {
      category: 'Getting Started',
      icon: RocketLaunchIcon,
      questions: [
        {
          id: 'what-is-portal',
          question: 'What is the Employee Lifecycle Portal?',
          answer: 'The Employee Lifecycle Portal is a comprehensive web application that automates and streamlines employee onboarding, offboarding, and lifecycle management tasks. It integrates with Microsoft 365, Azure AD, on-premises Active Directory, Exchange (hybrid and cloud), and Intune to provide a unified interface for IT administrators to manage the complete employee lifecycle from hire to termination.'
        },
        {
          id: 'who-uses-portal',
          question: 'Who should use this portal?',
          answer: 'This portal is designed for IT administrators, HR operations teams, and help desk staff who manage employee accounts and resources. It\'s particularly valuable for organizations using Microsoft 365 and Azure AD (with or without on-premises infrastructure) that want to automate repetitive tasks and ensure consistent processes across all employee lifecycle events.'
        },
        {
          id: 'key-features',
          question: 'What are the key features?',
          answer: 'Key features include: Automated user onboarding and offboarding workflows, Microsoft 365 license management, Intune device management and policy deployment, On-premises Active Directory integration via PowerShell, Hybrid Exchange environment support (on-prem + cloud), Email forwarding and auto-reply configuration, Group membership management, SharePoint permissions handling, Batch operations for multiple users, Audit logging and compliance tracking, Role-based access control, Real-time status monitoring, and Comprehensive error handling and reporting.'
        }
      ]
    },
    {
      category: 'Authentication & Access',
      icon: ShieldCheckIcon,
      questions: [
        {
          id: 'auth-methods',
          question: 'What authentication methods are supported?',
          answer: 'The portal supports Microsoft OAuth 2.0 authentication with Azure AD. Users sign in with their Microsoft 365 credentials, and the portal uses delegated permissions to perform operations on their behalf. For backend operations (like PowerShell remoting to on-prem AD or Exchange), service accounts with appropriate permissions are used securely.'
        },
        {
          id: 'required-permissions',
          question: 'What Azure AD permissions are required?',
          answer: 'Required Microsoft Graph API permissions include: User.ReadWrite.All (create/modify users), Group.ReadWrite.All (manage group memberships), Directory.ReadWrite.All (Azure AD management), DeviceManagementManagedDevices.ReadWrite.All (Intune device management), DeviceManagementConfiguration.ReadWrite.All (Intune policy management), Mail.ReadWrite (mailbox operations), and Sites.ReadWrite.All (SharePoint access). Admin consent is required for these application permissions.'
        },
        {
          id: 'security-measures',
          question: 'What security measures are in place?',
          answer: 'Security measures include: OAuth 2.0 with PKCE flow for authentication, Secure session management with encrypted tokens, Environment variables encrypted at rest in Vercel, Service account credentials never exposed to client, Role-based access control (RBAC), Audit logging of all administrative actions, Input validation and sanitization, CORS policies restricting API access, HTTPS-only communication, and Regular security updates and dependency scanning.'
        }
      ]
    },
    {
      category: 'User Onboarding',
      icon: UserGroupIcon,
      questions: [
        {
          id: 'onboarding-process',
          question: 'How does the onboarding process work?',
          answer: 'The onboarding wizard guides you through creating a new employee account: 1) Enter employee details (name, email, department, job title), 2) Select license (M365 E3, E5, Business, etc.), 3) Choose group memberships (security groups, distribution lists), 4) Configure mailbox settings (if hybrid Exchange), 5) Assign Intune device policies, 6) Set SharePoint permissions, 7) Review and confirm. The portal then creates the user in Azure AD (or on-prem AD if configured), assigns licenses, adds to groups, provisions mailbox, and deploys device policies - all automatically.'
        },
        {
          id: 'bulk-onboarding',
          question: 'Can I onboard multiple employees at once?',
          answer: 'Yes! The portal supports bulk onboarding via CSV upload. Create a CSV file with columns for firstName, lastName, email, department, jobTitle, license, groups, and mailboxType. Upload the file, review the preview, and the portal will process all users automatically. You can monitor progress in real-time and download a detailed report when complete.'
        },
        {
          id: 'onboarding-templates',
          question: 'Are there templates for common roles?',
          answer: 'Yes, you can create and save onboarding templates for common roles (e.g., "Sales Representative", "Developer", "Manager"). Templates include pre-configured licenses, group memberships, SharePoint permissions, and Intune policies. When onboarding a new employee, select their role template and the portal applies all settings automatically, ensuring consistency across similar positions.'
        },
        {
          id: 'department-mapping',
          question: 'What is department-to-group mapping?',
          answer: 'Department mapping allows you to configure which Azure AD groups should automatically be assigned when onboarding users to specific departments. For example, you can map "Engineering" to groups like "Engineering-Team", "VPN-Access", and "GitHub-Users". When you onboard a new engineer and select "Engineering" as their department, these groups are automatically pre-selected, saving time and ensuring consistency. Configure mappings in Workflows → Department Mappings tab.'
        },
        {
          id: 'auto-group-assignment',
          question: 'How does automatic group assignment work?',
          answer: 'When you select a department during onboarding, the portal checks if any group mappings exist for that department. If mappings are found, those groups are automatically added to the selected groups list. You\'ll see a notification indicating how many groups were auto-selected. You can still manually add or remove groups after the automatic selection. This feature streamlines onboarding by reducing repetitive group selection for standard department roles. Manage your department mappings in the Workflows section.'
        }
      ]
    },
    {
      category: 'On-Premises Active Directory',
      icon: ServerIcon,
      questions: [
        {
          id: 'onprem-ad-overview',
          question: 'Does the portal support on-premises Active Directory?',
          answer: 'Yes! The portal fully supports on-premises Active Directory integration. You can create users, manage groups, reset passwords, and perform other AD operations directly from the portal. This works alongside Azure AD Connect, which syncs changes to Microsoft 365. The portal uses PowerShell remoting to communicate with your domain controllers securely.'
        },
        {
          id: 'onprem-requirements',
          question: 'What do I need for on-premises AD integration?',
          answer: 'Requirements: 1) Windows Server with Active Directory Domain Services, 2) Domain controller accessible from backend server, 3) PowerShell remoting enabled on DC (WinRM), 4) Service account with AD admin permissions, 5) Network connectivity (port 5985/5986 for WinRM), 6) Azure AD Connect for sync to Microsoft 365. The portal backend must be able to reach your domain controller over the network (VPN, ExpressRoute, or direct connection).'
        },
        {
          id: 'onprem-operations',
          question: 'What AD operations can I perform?',
          answer: 'Available operations: Create new AD users with custom attributes, Modify user properties (name, email, department, etc.), Reset user passwords and unlock accounts, Enable/disable user accounts, Create and manage security groups, Add/remove users from groups, Move users between OUs (organizational units), Set user account expiration dates, Configure password policies per user, Query AD for user and group information, Bulk operations on multiple users, and Full audit trail of all changes.'
        },
        {
          id: 'onprem-hybrid-users',
          question: 'How does on-prem AD work with Azure AD?',
          answer: 'When you create or modify a user in on-premises AD, Azure AD Connect automatically syncs the changes to Azure AD (typically within 30 minutes). The portal handles this gracefully: 1) Create user in on-prem AD via PowerShell, 2) Wait for Azure AD Connect sync (portal monitors status), 3) Once synced to Azure AD, assign M365 licenses, 4) Configure cloud services (mailbox, SharePoint, Intune). You can choose to create users in on-prem AD (synced to cloud) or directly in Azure AD (cloud-only) depending on your architecture.'
        },
        {
          id: 'onprem-security',
          question: 'How is on-premises AD access secured?',
          answer: 'Security measures: Service account with minimum required permissions (least privilege), Credentials stored encrypted in Vercel environment variables, PowerShell remoting over HTTPS (port 5986) with TLS 1.2+, All PowerShell commands logged for audit purposes, Input validation prevents injection attacks, Session tokens expire after inactivity, Network isolation (backend only, never from client browser), Regular credential rotation (quarterly recommended), and Firewall rules restrict access to specific IPs only.'
        }
      ]
    },
    {
      category: 'User Offboarding',
      icon: ExclamationTriangleIcon,
      questions: [
        {
          id: 'offboarding-process',
          question: 'What happens during employee offboarding?',
          answer: 'The offboarding wizard performs these actions: 1) Disable user account (Azure AD and/or on-prem AD), 2) Revoke all active sessions immediately, 3) Convert mailbox to shared (preserves email access), 4) Set email forwarding to manager or replacement, 5) Configure auto-reply message, 6) Remove from all groups and distribution lists, 7) Wipe corporate data from Intune-managed devices, 8) Remove SharePoint permissions, 9) Remove M365 licenses (frees up costs), 10) Export user data for compliance. All actions are logged with timestamps and operator information.'
        },
        {
          id: 'mailbox-preservation',
          question: 'How are mailboxes preserved after offboarding?',
          answer: 'By default, mailboxes are converted to shared mailboxes (not deleted). This: Preserves all email, calendar, and contacts, Allows manager/team to access historical communications, Costs nothing (shared mailboxes up to 50GB are free in M365), Can be accessed by multiple users with permissions, Maintains compliance and legal hold if configured. The mailbox is NOT deleted unless explicitly requested. You can set forwarding to route new emails to a manager and configure auto-reply to inform senders of the employee\'s departure.'
        },
        {
          id: 'device-wipe',
          question: 'What happens to employee devices?',
          answer: 'For Intune-managed devices, the portal can: Wipe corporate data (keeps personal data on BYOD devices), Full factory reset (company-owned devices), Retire devices from Intune management, Remove compliance policies, Disable conditional access, Block device from accessing corporate resources. You choose the action based on device ownership (BYOD vs company-owned). The portal shows all devices assigned to the user and their compliance status before taking action.'
        },
        {
          id: 'offboarding-schedule',
          question: 'Can I schedule offboarding for a future date?',
          answer: 'Yes! You can schedule offboarding to execute automatically on a future date (e.g., employee\'s last day). The portal will: Queue the offboarding request with specified date/time, Send reminder notifications before execution, Automatically run all offboarding steps at scheduled time, Email summary report when complete, Allow cancellation if employee stays. This is useful for planned departures where you want everything to happen precisely at end of business on the last day.'
        }
      ]
    },
    {
      category: 'Lifecycle Workflows',
      icon: ArrowLeftIcon,
      questions: [
        {
          id: 'lifecycle-workflows-overview',
          question: 'What are Lifecycle Workflows?',
          answer: 'Lifecycle Workflows are enterprise automation tools that handle Joiner-Mover-Leaver scenarios. Joiner workflows automate pre-hire and first-day tasks like generating temporary access passes and requesting access packages. Mover workflows handle transfers between departments with automatic notifications to managers. Leaver workflows automate offboarding tasks like removing users from all groups, revoking licenses, and eventually deleting accounts. These workflows use Microsoft Graph Identity Governance APIs to ensure consistent, auditable processes.'
        },
        {
          id: 'workflow-templates',
          question: 'What workflow templates are available?',
          answer: 'Pre-built templates include: **Joiner - Pre-hire:** Generate TAP, send welcome email, request access packages. **Joiner - First Day:** Assign initial groups, provision resources. **Mover - Department Transfer:** Update manager, notify stakeholders, adjust groups. **Leaver - Immediate:** Disable account, remove access immediately. **Leaver - Gradual:** Phase out access over time, convert mailbox. Each template can be customized with specific tasks, triggers, and scoping rules based on your organization\'s needs.'
        },
        {
          id: 'workflow-execution',
          question: 'How do I monitor workflow execution?',
          answer: 'The Workflow Management page shows all workflows with their status (Active, Inactive), execution count, and last run time. Click any workflow to see detailed execution history including which users were processed, task completion status, and any errors encountered. You can activate/deactivate workflows, modify their configuration, and view execution logs. Real-time monitoring helps ensure automation runs smoothly and alerts you to any issues.'
        },
        {
          id: 'workflow-scoping',
          question: 'Can workflows target specific users or departments?',
          answer: 'Yes! Workflows support rule-based scoping using filters like department, office location, employee type, or custom attributes. For example, you can create a leaver workflow that only applies to users in the "Engineering" department or a joiner workflow specific to "Remote" employees. This ensures workflows execute only for relevant users and allows different processes for different organizational groups.'
        }
      ]
    },
    {
      category: 'Device & Policy Management',
      icon: CogIcon,
      questions: [
        {
          id: 'intune-capabilities',
          question: 'What Intune management features are available?',
          answer: 'Intune features include: View all managed devices (Windows, macOS, iOS, Android), Check device compliance status, Deploy configuration policies to devices, Assign app deployment policies, Remote wipe corporate data, Full factory reset devices, Retire devices from management, View device inventory and specs, Force policy sync to devices, View app installation status, Configure conditional access policies, and Monitor device health and compliance.'
        },
        {
          id: 'policy-deployment',
          question: 'How do I deploy policies to new employees?',
          answer: 'During onboarding, you can assign Intune policies: 1) Select from existing configuration policies (device restrictions, Wi-Fi, VPN, etc.), 2) Choose app deployment policies (Office 365, company apps), 3) Assign compliance policies (password requirements, encryption), 4) Set conditional access rules. Policies are automatically deployed when the employee enrolls their device in Intune. The portal shows policy assignment status and any deployment errors.'
        },
        {
          id: 'device-compliance',
          question: 'How is device compliance monitored?',
          answer: 'The portal dashboard shows device compliance in real-time: Compliant devices (meeting all requirements), Non-compliant devices (with specific violations listed), Grace period devices (deadline to fix issues), Not evaluated devices. You can drill down to see: Which policies are violated, When device was last checked in, User assigned to device, OS version and security patches, Encryption status, and Recommended remediation actions. Automated alerts notify admins when devices become non-compliant.'
        }
      ]
    },
    {
      category: 'Hybrid Exchange Environments',
      icon: CloudIcon,
      questions: [
        {
          id: 'hybrid-exchange-overview',
          question: 'What is hybrid Exchange support and how does it work?',
          answer: 'The portal fully supports hybrid Exchange environments where you have BOTH Exchange Server on-premises AND Exchange Online in Microsoft 365 cloud running simultaneously. This is common during migrations or for organizations that keep some mailboxes on-premises for compliance, size, or performance reasons. The portal automatically detects where each user\'s mailbox is located (on-prem vs cloud) and routes operations to the appropriate platform using PowerShell remoting for on-premises Exchange Server and Microsoft Graph API for Exchange Online mailboxes. This provides a unified management experience regardless of mailbox location.'
        },
        {
          id: 'hybrid-exchange-requirements',
          question: 'What are the requirements for hybrid Exchange integration?',
          answer: 'Prerequisites: 1) EXISTING hybrid Exchange deployment (Hybrid Configuration Wizard already run, federation trust established, mail flow working), 2) Exchange Server 2013 or later (2016/2019 recommended with latest updates), 3) PowerShell remoting enabled on Exchange Server (WinRM ports 5985/5986), 4) Service account with Exchange Organization Management role and PowerShell remoting permissions, 5) Network connectivity from backend to Exchange Server, 6) Azure AD Connect actively syncing users, 7) Five environment variables configured in Vercel: EXCHANGE_SERVER (hostname), EXCHANGE_USERNAME (service account), EXCHANGE_PASSWORD (service account password), EXCHANGE_DOMAIN (domain name), EXCHANGE_REMOTE_DOMAIN (tenant.mail.onmicrosoft.com routing domain). The portal uses these to connect to your Exchange Server and manage both on-premises and cloud mailboxes through a single interface.'
        },
        {
          id: 'mailbox-types',
          question: 'What are the different mailbox types in hybrid Exchange?',
          answer: 'There are three mailbox types: ON-PREMISES MAILBOX - Physical mailbox on Exchange Server in your datacenter, managed via Exchange Management Shell PowerShell, user account in on-premises Active Directory, mail flows through your Exchange servers, best for very large mailboxes over 100GB, compliance requirements, or VIP executives. REMOTE MAILBOX - Cloud mailbox in Exchange Online but user account still in on-premises AD synced to Azure AD via Azure AD Connect, mailbox hosted in Microsoft 365, managed via Graph API, best for standard users and post-migration state. CLOUD-ONLY MAILBOX - Both user and mailbox in Azure AD/Exchange Online, never existed on-premises, managed entirely through Graph API, best for new hires in cloud-first organizations. The portal shows visual indicators: building emoji for on-premises, cloud emoji for remote/cloud mailboxes, and automatically routes all operations to the correct platform.'
        },
        {
          id: 'hybrid-onboarding',
          question: 'How do I onboard users with hybrid Exchange mailboxes?',
          answer: 'OPTION 1 - Remote Mailbox (Cloud mailbox for on-prem user): Portal creates user in on-prem AD, waits 30 minutes for Azure AD Connect sync, creates remote mailbox via Enable-RemoteMailbox PowerShell command pointing to Exchange Online, assigns M365 license, mailbox provisioned in Exchange Online in 5-10 minutes, total time about 35-40 minutes. Use for standard users, part of cloud migration, normal mailbox sizes. OPTION 2 - On-Premises Mailbox: Portal creates user in on-prem AD, creates mailbox on Exchange Server using New-Mailbox, mailbox available immediately, no cloud license needed initially, total time under 5 minutes. Use for very large mailboxes over 100GB, regulatory compliance requiring on-prem storage, VIP users, or long-term on-prem presence. The onboarding wizard shows both options and recommends remote mailboxes for most users as part of cloud migration strategy.'
        },
        {
          id: 'hybrid-offboarding',
          question: 'How does offboarding work with hybrid Exchange?',
          answer: 'The portal automatically detects mailbox location and routes operations correctly. For ON-PREMISES mailboxes: Uses PowerShell remoting to Exchange Server, runs Set-Mailbox -Type Shared to convert, Set-Mailbox -ForwardingAddress for email forwarding, Set-MailboxAutoReplyConfiguration for auto-reply, then disables AD account via Disable-ADAccount. For REMOTE/CLOUD mailboxes: Uses Microsoft Graph API to Exchange Online, PATCH requests to convert to shared, configure forwarding and auto-reply, disable account, remove M365 licenses. The offboarding wizard provides ONE unified interface regardless of mailbox type with visual indicators showing location. You can batch offboard users with mixed mailbox types and the portal handles routing automatically. All operations are logged with platform-specific details for audit purposes.'
        },
        {
          id: 'mailbox-migration',
          question: 'How do I migrate mailboxes from on-premises to Exchange Online?',
          answer: 'Mailbox migration process: 1) Create move request via POST /api/exchange/move-to-cloud with identity, targetDeliveryDomain (tenant.mail.onmicrosoft.com), and badItemLimit. 2) Initial synchronization starts (QUEUED status, then INPROGRESS) copying mailbox data while user continues using on-prem mailbox. 3) Monitor progress with GET /api/exchange/move-request showing percentage complete, bytes transferred, items moved, estimated time remaining. 4) Migration reaches AUTOSUSPENDED when 95%+ complete, ready for final cutover. 5) Complete migration (COMPLETING status) with final incremental sync taking 5-15 minutes with brief disruption. 6) Migration COMPLETED, mailbox now in Exchange Online, user can access immediately. TIMELINES: Small mailbox under 5GB takes 4-6 hours, medium 5-20GB takes 8-13 hours, large 20-50GB takes 17-34 hours, very large over 50GB takes 2-8 days. BEST PRACTICES: Migrate test users first (IT department), schedule large mailboxes during off-hours, process 50-100 users per week typically, monitor daily for issues, verify access after completion. The portal supports batch migrations and detailed status tracking for all move requests.'
        },
        {
          id: 'hybrid-troubleshooting',
          question: 'How do I troubleshoot hybrid Exchange issues?',
          answer: 'CANNOT CONNECT TO EXCHANGE SERVER: Test WinRM with Test-WSMan command, check firewall port 5985/5986 open, verify service account credentials correct, confirm PowerShell remoting enabled on Exchange Server. MAILBOX NOT FOUND: Verify user exists in on-prem AD, force Azure AD Connect sync with Start-ADSyncSyncCycle -PolicyType Delta, check if mailbox is on-prem (Get-Mailbox) vs remote (Get-RemoteMailbox), ensure user OU included in sync scope. ACCESS DENIED: Verify service account in Organization Management role group, check PowerShell remoting permissions with Get-User showing RemotePowerShellEnabled true, review RBAC assignments with Get-ManagementRoleAssignment. MIGRATION FAILED: Get detailed report with Get-MoveRequestStatistics -IncludeReport, increase BadItemLimit if corruption found with Set-MoveRequest, resume suspended move with Resume-MoveRequest, check Exchange Online quota available, verify network connectivity stable. HYBRID CONFIGURATION BROKEN: Re-run Hybrid Configuration Wizard, test federation with Test-FederationTrust, verify organization relationship with Get-OrganizationRelationship, test migration endpoint connectivity. The portal includes configuration status endpoint, connection testing, automatic mailbox detection, detailed error logging, and comprehensive troubleshooting in the HYBRID_EXCHANGE_GUIDE.md documentation file.'
        }
      ]
    },
    {
      category: 'Troubleshooting',
      icon: ExclamationTriangleIcon,
      questions: [
        {
          id: 'login-issues',
          question: 'I cannot log in to the portal',
          answer: 'Common login issues: 1) Ensure you are using your Microsoft 365 credentials (same as Outlook/Teams), 2) Clear browser cache and cookies, try incognito/private mode, 3) Verify your account has required permissions (admin role), 4) Check if Azure AD app registration is configured correctly, 5) Confirm admin consent was granted for API permissions, 6) Try different browser (Chrome, Edge, Firefox), 7) Check browser console for JavaScript errors (F12), 8) Verify REACT_APP_CLIENT_ID and REACT_APP_TENANT_ID are correct in environment variables. If issue persists, contact your Azure AD administrator to verify your account status and permissions.'
        },
        {
          id: 'permission-errors',
          question: 'I get permission errors when performing operations',
          answer: 'Permission errors usually mean: Your account lacks required Azure AD role (Global Admin, User Admin, etc.), API permissions not granted admin consent in Azure AD, Service account credentials incorrect for on-prem operations, Token expired (refresh browser or re-login), RBAC restrictions in Azure AD. To fix: 1) Verify your role in Azure AD admin center, 2) Check Azure AD app registration has all required Graph API permissions with admin consent granted, 3) For on-prem errors, verify service account credentials in environment variables, 4) Check audit logs to see specific permission denied, 5) Contact Global Admin to grant necessary permissions.'
        },
        {
          id: 'slow-performance',
          question: 'The portal is slow or operations time out',
          answer: 'Performance issues can be caused by: Large Azure AD tenant (10,000+ users), Complex group memberships, Network latency to on-prem resources, Azure AD Connect sync delays, Rate limiting from Microsoft Graph API, Vercel function timeout limits. Solutions: Use filters and pagination when listing users, Avoid loading all users at once in dropdowns, For on-prem operations, ensure low-latency network connection, Monitor Vercel function execution time in dashboard, Implement caching for frequently accessed data, Use batch operations instead of sequential API calls, Consider increasing Vercel function timeout limits in vercel.json.'
        },
        {
          id: 'sync-delays',
          question: 'Changes to on-premises AD are not appearing in Azure AD',
          answer: 'Azure AD Connect sync typically runs every 30 minutes by default. To force immediate sync: On Azure AD Connect server, open PowerShell as Administrator, run: Start-ADSyncSyncCycle -PolicyType Delta. Check sync status with: Get-ADSyncScheduler. If still not syncing: Verify Azure AD Connect service is running, Check for sync errors in Synchronization Service Manager, Ensure user OU is in sync scope, Verify no attribute conflicts, Check network connectivity to Azure AD, Review Azure AD Connect health in Azure portal. The portal monitors sync status and shows when users are pending sync before allowing cloud operations like license assignment.'
        }
      ]
    },
    {
      category: 'Deployment & Configuration',
      icon: DocumentTextIcon,
      questions: [
        {
          id: 'deployment-platforms',
          question: 'Where can I deploy the portal?',
          answer: 'The portal can be deployed on: VERCEL (recommended): Automatic deployments from GitHub, Serverless functions for backend, Built-in SSL/HTTPS, Global CDN, Easy environment variable management, Free tier available. AZURE APP SERVICE: Native Microsoft integration, VNet integration for on-prem connectivity, Managed identity support, Auto-scaling. AWS (Amplify/Lambda): Scalable serverless architecture, API Gateway integration, CloudFront CDN. SELF-HOSTED: Docker container support, Full control over infrastructure, Can be deployed behind corporate firewall for on-prem access. Each platform requires environment variables to be configured for Azure AD app registration, Graph API access, and on-prem integration credentials.'
        },
        {
          id: 'environment-setup',
          question: 'What environment variables need to be configured?',
          answer: 'Required environment variables: AZURE AD: REACT_APP_CLIENT_ID (app registration client ID), REACT_APP_TENANT_ID (Azure AD tenant ID), REACT_APP_REDIRECT_URI (OAuth callback URL). BACKEND: SESSION_SECRET (random string for session encryption), NODE_ENV (production). ON-PREMISES AD: AD_DOMAIN (domain FQDN), AD_USERNAME (service account with admin rights), AD_PASSWORD (service account password), AD_SERVER (domain controller hostname). HYBRID EXCHANGE: EXCHANGE_SERVER (Exchange Server hostname), EXCHANGE_USERNAME (Exchange admin account), EXCHANGE_PASSWORD (Exchange admin password), EXCHANGE_DOMAIN (domain name), EXCHANGE_REMOTE_DOMAIN (tenant.mail.onmicrosoft.com). All credentials are encrypted at rest in deployment platform and never exposed to client.'
        },
        {
          id: 'azure-app-registration',
          question: 'How do I create the Azure AD app registration?',
          answer: 'Steps to create app registration: 1) Go to Azure Portal > Azure Active Directory > App Registrations > New Registration, 2) Name: Employee Lifecycle Portal, 3) Supported account types: Single tenant, 4) Redirect URI: Web > https://your-domain.vercel.app/auth/callback, 5) Click Register. Then configure: AUTHENTICATION: Add redirect URI for local dev (http://localhost:3000/auth/callback), Enable implicit grant: ID tokens and Access tokens, Allow public client flows: No. API PERMISSIONS: Add Microsoft Graph permissions (User.ReadWrite.All, Group.ReadWrite.All, Directory.ReadWrite.All, etc.), Click Grant admin consent. CERTIFICATES & SECRETS: Create new client secret, copy value immediately (shown once), save as REACT_APP_CLIENT_SECRET. Copy Application (client) ID and Directory (tenant) ID to environment variables.'
        },
        {
          id: 'update-deployment',
          question: 'How do I update the portal to the latest version?',
          answer: 'For Vercel deployments connected to GitHub: 1) Pull latest changes: git pull origin main, 2) Review CHANGELOG.md for breaking changes, 3) Update environment variables if new ones added, 4) Git push triggers automatic deployment, 5) Vercel builds and deploys automatically, 6) Test in preview deployment before promoting to production. For manual deployments: 1) Download latest release from GitHub, 2) Run: npm install (update dependencies), 3) Run: npm run build, 4) Deploy build folder to hosting platform, 5) Update environment variables as needed, 6) Restart application. Always test in non-production environment first, backup database/configuration before updating, review migration notes for version-specific changes.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {t('common.backToDashboard')}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <QuestionMarkCircleIcon className="mx-auto h-16 w-16 text-blue-600 dark:text-blue-400 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {t('faq.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('faq.subtitle')}
          </p>
        </div>

        {/* FAQ Categories */}
        {Array.isArray(faqCategories) && faqCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isCategoryOpen = openCategory === category.category;

          return (
            <div key={category.category} className="mb-6">
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center justify-between hover:shadow-lg transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <CategoryIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {category.category}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.questions.length} {t('faq.questions')}
                    </span>
                  </div>
                </div>
                {isCategoryOpen ? (
                  <ChevronUpIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                )}
              </button>

              {isCategoryOpen && category.questions && Array.isArray(category.questions) && (
                <div className="mt-4 space-y-3">
                  {category.questions.map((q) => {
                    const isQuestionOpen = openQuestion === q.id;

                    return (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200"
                      >
                        <button
                          onClick={() => toggleQuestion(q.id)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8 flex items-start">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold mr-3 flex-shrink-0 mt-0.5">
                              {t('faq.question')}
                            </span>
                            <span className="flex-1">{q.question}</span>
                          </h3>
                          {isQuestionOpen ? (
                            <ChevronUpIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>

                        {isQuestionOpen && (
                          <div className="px-6 py-6 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200">
                            <div className="prose prose-blue max-w-none">
                              {formatAnswer(q.answer)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FAQ;
