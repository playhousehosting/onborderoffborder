import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ensure autoTable is attached to jsPDF prototype
if (typeof jsPDF.API.autoTable !== 'function') {
  // If not automatically attached, we'll use the function directly
  console.log('📄 jspdf-autotable: using direct function call');
}

/**
 * Export offboarding results to a comprehensive PDF report
 * @param {Object} params - Report parameters
 * @param {Object} params.user - User information
 * @param {Array} params.results - Execution results
 * @param {Object} params.options - Offboarding options selected
 * @param {string} params.executedBy - User who executed the offboarding
 * @param {Date} params.executionDate - Date of execution
 */
export const exportOffboardingResultsToPDF = ({
  user,
  results,
  options,
  executedBy,
  executionDate = new Date(),
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper to call autoTable - works whether it's on prototype or imported
  const callAutoTable = (options) => {
    if (typeof doc.autoTable === 'function') {
      doc.autoTable(options);
    } else {
      autoTable(doc, options);
    }
  };

  // Helper function to add new page if needed
  const checkAddPage = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper function to add section header
  const addSectionHeader = (title) => {
    checkAddPage(15);
    doc.setFillColor(37, 99, 235); // Primary blue
    doc.rect(14, yPosition, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(title, 16, yPosition + 5.5);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  };

  // Calculate statistics
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const totalTasks = results.length;
  const completedTasks = totalTasks - skippedCount;
  const successRate = completedTasks > 0 ? ((successCount / completedTasks) * 100).toFixed(1) : 0;

  // ===== HEADER =====
  doc.setFillColor(241, 245, 249); // Light gray background
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42); // Dark gray
  doc.text('Employee Offboarding Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139); // Medium gray
  doc.text(`Generated: ${executionDate.toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Executed by: ${executedBy}`, pageWidth / 2, 35, { align: 'center' });

  yPosition = 50;

  // ===== EMPLOYEE INFORMATION =====
  addSectionHeader('Employee Information');
  
  const employeeInfo = [
    ['Display Name', user.displayName || 'N/A'],
    ['Email', user.mail || user.userPrincipalName || 'N/A'],
    ['User Principal Name', user.userPrincipalName || 'N/A'],
    ['User ID', user.id || 'N/A'],
    ['Job Title', user.jobTitle || 'N/A'],
    ['Department', user.department || 'N/A'],
  ];

  callAutoTable({
    startY: yPosition,
    head: [['Field', 'Value']],
    body: employeeInfo,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== EXECUTIVE SUMMARY =====
  addSectionHeader('Executive Summary');

  // Overall status indicator
  checkAddPage(40);
  const overallStatus = errorCount === 0 && skippedCount === 0 
    ? 'COMPLETED SUCCESSFULLY' 
    : successCount > 0 && errorCount > 0 
    ? 'COMPLETED WITH ISSUES' 
    : errorCount > 0 
    ? 'COMPLETED WITH ERRORS' 
    : 'PARTIALLY COMPLETED';
  
  const statusColor = errorCount === 0 && skippedCount === 0 
    ? [34, 197, 94] 
    : successCount > 0 && errorCount > 0 
    ? [234, 179, 8] 
    : [239, 68, 68];

  doc.setFillColor(...statusColor);
  doc.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(overallStatus, pageWidth / 2, yPosition + 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${successCount} of ${completedTasks} tasks completed successfully (${successRate}%)`, 
    pageWidth / 2, yPosition + 18, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPosition += 30;

  // Summary statistics
  checkAddPage(30);
  const summaryData = [
    ['Total Tasks', totalTasks.toString()],
    ['Successful', successCount.toString()],
    ['Failed', errorCount.toString()],
    ['Skipped', skippedCount.toString()],
    ['Success Rate', `${successRate}%`],
  ];

  callAutoTable({
    startY: yPosition,
    body: summaryData,
    theme: 'plain',
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== OFFBOARDING CONFIGURATION =====
  addSectionHeader('Offboarding Configuration');

  const configData = [
    ['Disable Account', options.disableAccount ? 'Yes' : 'No'],
    ['Reset Password', options.resetPassword ? 'Yes' : 'No'],
    ['Revoke Licenses', options.revokeLicenses ? 'Yes' : 'No'],
    ['Convert to Shared Mailbox', options.convertMailbox ? 'Yes' : 'No'],
    ['Set Email Forwarding', options.setEmailForwarding ? `Yes → ${options.forwardingAddress}` : 'No'],
    ['Set Auto-Reply', options.setAutoReply ? 'Yes' : 'No'],
    ['Backup User Data', options.backupData ? 'Yes' : 'No'],
    ['Remove from Groups', options.removeFromGroups ? 'Yes' : 'No'],
    ['Remove from Teams', options.removeFromTeams ? 'Yes' : 'No'],
    ['Remove from Apps', options.removeFromApps ? 'Yes' : 'No'],
    ['Remove Auth Methods', options.removeAuthMethods ? 'Yes' : 'No'],
    ['Transfer Files', options.transferFiles ? `Yes → ${options.newFileOwner}` : 'No'],
    ['Wipe Devices', options.wipeDevices ? 'Yes' : 'No'],
    ['Retire Devices', options.retireDevices ? 'Yes' : 'No'],
  ];

  callAutoTable({
    startY: yPosition,
    head: [['Action', 'Configured']],
    body: configData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== DETAILED EXECUTION RESULTS =====
  addSectionHeader('Detailed Execution Results');

  // Group results by status
  const successResults = results.filter(r => r.status === 'success');
  const errorResults = results.filter(r => r.status === 'error');
  const skippedResults = results.filter(r => r.status === 'skipped');

  // Successful tasks
  if (successResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 197, 94); // Green
    doc.text('✓ Successful Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const successData = successResults.map(r => [
      r.action,
      r.message || 'Completed successfully',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Result']],
      body: successData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Failed tasks
  if (errorResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(239, 68, 68); // Red
    doc.text('✗ Failed Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const errorData = errorResults.map(r => [
      r.action,
      r.message || 'Task failed',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Error Message']],
      body: errorData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Skipped tasks
  if (skippedResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(107, 114, 128); // Gray
    doc.text('— Skipped Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const skippedData = skippedResults.map(r => [
      r.action,
      r.message || 'Not selected',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Reason']],
      body: skippedData,
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // ===== RECOMMENDATIONS =====
  if (errorResults.length > 0) {
    addSectionHeader('Recommendations');
    
    checkAddPage(40);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const recommendations = [
      '• Review failed tasks and determine if manual intervention is required',
      '• Verify that all critical offboarding steps were completed successfully',
      '• Check Azure AD admin portal for any remaining user access or permissions',
      '• Ensure all company data has been backed up or transferred appropriately',
      '• Document any issues encountered for future offboarding improvements',
    ];

    recommendations.forEach(rec => {
      checkAddPage(8);
      doc.text(rec, 16, yPosition);
      yPosition += 6;
    });
    
    yPosition += 5;
  }

  // ===== FOOTER ON ALL PAGES =====
  const totalPages = doc.internal.pages.length - 1; // Subtract 1 for internal counter page
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Employee Offboarding Portal | Confidential`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const sanitizedUserName = user.displayName?.replace(/[^a-z0-9]/gi, '_') || 'user';
  const dateStr = executionDate.toISOString().split('T')[0];
  const filename = `Offboarding_Report_${sanitizedUserName}_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
};

/**
 * Export onboarding results to a comprehensive PDF report
 * @param {Object} params - Report parameters
 * @param {Object} params.user - User information (new user created)
 * @param {Array} params.results - Execution results
 * @param {Object} params.options - Onboarding options selected
 * @param {string} params.executedBy - User who executed the onboarding
 * @param {Date} params.executionDate - Date of execution
 */
export const exportOnboardingResultsToPDF = ({
  user,
  results,
  options,
  executedBy,
  executionDate = new Date(),
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper to call autoTable - works whether it's on prototype or imported
  const callAutoTable = (tableOptions) => {
    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableOptions);
    } else {
      autoTable(doc, tableOptions);
    }
  };

  // Helper function to add new page if needed
  const checkAddPage = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper function to add section header
  const addSectionHeader = (title) => {
    checkAddPage(15);
    doc.setFillColor(34, 197, 94); // Green for onboarding
    doc.rect(14, yPosition, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(title, 16, yPosition + 5.5);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  };

  // Calculate statistics
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const totalTasks = results.length;
  const completedTasks = totalTasks - skippedCount;
  const successRate = completedTasks > 0 ? ((successCount / completedTasks) * 100).toFixed(1) : 0;

  // ===== HEADER =====
  doc.setFillColor(240, 253, 244); // Light green background
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42); // Dark gray
  doc.text('Employee Onboarding Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139); // Medium gray
  doc.text(`Generated: ${executionDate.toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Executed by: ${executedBy}`, pageWidth / 2, 35, { align: 'center' });

  yPosition = 50;

  // ===== NEW EMPLOYEE INFORMATION =====
  addSectionHeader('New Employee Information');
  
  const employeeInfo = [
    ['Display Name', user.displayName || 'N/A'],
    ['First Name', user.firstName || 'N/A'],
    ['Last Name', user.lastName || 'N/A'],
    ['Email / UPN', user.userPrincipalName || user.email || 'N/A'],
    ['Job Title', options.jobTitle || user.jobTitle || 'N/A'],
    ['Department', options.department || user.department || 'N/A'],
    ['Office Location', options.officeLocation || 'N/A'],
    ['Business Phone', options.businessPhone || 'N/A'],
    ['Manager', options.managerEmail || 'N/A'],
    ['Created In', user.createInOnPremAD ? 'On-Premises AD' : 'Azure AD'],
  ];

  callAutoTable({
    startY: yPosition,
    head: [['Field', 'Value']],
    body: employeeInfo,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== EXECUTIVE SUMMARY =====
  addSectionHeader('Executive Summary');

  // Overall status indicator
  checkAddPage(40);
  const overallStatus = errorCount === 0 
    ? 'ONBOARDING COMPLETED SUCCESSFULLY' 
    : successCount > 0 && errorCount > 0 
    ? 'ONBOARDING COMPLETED WITH ISSUES' 
    : 'ONBOARDING FAILED';
  
  const statusColor = errorCount === 0 
    ? [34, 197, 94] // Green
    : successCount > 0 && errorCount > 0 
    ? [234, 179, 8] // Yellow
    : [239, 68, 68]; // Red

  doc.setFillColor(...statusColor);
  doc.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(overallStatus, pageWidth / 2, yPosition + 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${successCount} of ${completedTasks} tasks completed successfully (${successRate}%)`, 
    pageWidth / 2, yPosition + 18, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPosition += 30;

  // Summary statistics
  checkAddPage(30);
  const summaryData = [
    ['Total Tasks', totalTasks.toString()],
    ['Successful', successCount.toString()],
    ['Failed', errorCount.toString()],
    ['Skipped', skippedCount.toString()],
    ['Success Rate', `${successRate}%`],
  ];

  callAutoTable({
    startY: yPosition,
    body: summaryData,
    theme: 'plain',
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== ONBOARDING CONFIGURATION =====
  addSectionHeader('Onboarding Configuration');

  const configData = [
    ['Assign Licenses', options.assignLicenses ? 'Yes' : 'No'],
    ['Selected Licenses', options.selectedLicenses?.length > 0 ? options.selectedLicenses.map(l => l.skuPartNumber || l.name || l).join(', ') : 'None'],
    ['Add to Groups', options.addToGroups ? 'Yes' : 'No'],
    ['Selected Groups', options.selectedGroups?.length > 0 ? options.selectedGroups.map(g => g.displayName || g.name || g).join(', ') : 'None'],
    ['Create Mailbox', options.createMailbox ? 'Yes' : 'No'],
    ['Email Alias', options.emailAlias || 'N/A'],
    ['Set Up Devices', options.setUpDevices ? 'Yes' : 'No'],
    ['Device Configuration', options.deviceConfiguration || 'Standard'],
    ['Share Welcome Kit', options.shareWelcomeKit ? 'Yes' : 'No'],
    ['Schedule Training', options.scheduleTraining ? `Yes - ${options.trainingDate}` : 'No'],
  ];

  callAutoTable({
    startY: yPosition,
    head: [['Configuration', 'Value']],
    body: configData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // ===== DETAILED EXECUTION RESULTS =====
  addSectionHeader('Detailed Execution Results');

  // Group results by status
  const successResults = results.filter(r => r.status === 'success');
  const errorResults = results.filter(r => r.status === 'error');
  const skippedResults = results.filter(r => r.status === 'skipped');

  // Successful tasks
  if (successResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 197, 94); // Green
    doc.text('✓ Successful Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const successData = successResults.map(r => [
      r.action,
      r.message || 'Completed successfully',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Result']],
      body: successData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Failed tasks
  if (errorResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(239, 68, 68); // Red
    doc.text('✗ Failed Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const errorData = errorResults.map(r => [
      r.action,
      r.message || 'Task failed',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Error Message']],
      body: errorData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Skipped tasks
  if (skippedResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(107, 114, 128); // Gray
    doc.text('— Skipped Tasks', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const skippedData = skippedResults.map(r => [
      r.action,
      r.message || 'Not selected',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Reason']],
      body: skippedData,
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // ===== NEXT STEPS =====
  addSectionHeader('Next Steps for New Employee');
  
  checkAddPage(60);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const nextSteps = [
    '• Share login credentials with the new employee securely',
    '• Verify email/mailbox access is working properly',
    '• Confirm all assigned licenses are active',
    '• Ensure group memberships provide correct access to resources',
    '• Schedule orientation and training sessions',
    '• Set up workstation/devices if applicable',
    '• Introduce the employee to their team and manager',
    '• Review company policies and compliance requirements',
  ];

  nextSteps.forEach(step => {
    checkAddPage(8);
    doc.text(step, 16, yPosition);
    yPosition += 6;
  });
  
  yPosition += 5;

  // ===== ISSUES & RECOMMENDATIONS =====
  if (errorResults.length > 0) {
    addSectionHeader('Issues & Recommendations');
    
    checkAddPage(40);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const recommendations = [
      '• Review failed tasks and retry manually if needed',
      '• Check Azure AD/M365 admin portal for any configuration issues',
      '• Verify the user account was created correctly',
      '• Ensure licenses are available in your tenant',
      '• Contact IT support if issues persist',
    ];

    recommendations.forEach(rec => {
      checkAddPage(8);
      doc.text(rec, 16, yPosition);
      yPosition += 6;
    });
    
    yPosition += 5;
  }

  // ===== FOOTER ON ALL PAGES =====
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Employee Onboarding Portal | Confidential`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const sanitizedUserName = user.displayName?.replace(/[^a-z0-9]/gi, '_') || 'new_employee';
  const dateStr = executionDate.toISOString().split('T')[0];
  const filename = `Onboarding_Report_${sanitizedUserName}_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
};
