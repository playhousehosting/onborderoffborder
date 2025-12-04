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
  const warningCount = results.filter(r => r.status === 'warning').length;
  const infoCount = results.filter(r => r.status === 'info').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const totalTasks = results.length;
  const completedTasks = totalTasks - skippedCount - infoCount; // Don't count info as tasks
  const successfulTasks = successCount + warningCount; // Warnings are partial success
  const successRate = completedTasks > 0 ? ((successfulTasks / completedTasks) * 100).toFixed(1) : 0;

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
  doc.text(`${successfulTasks} of ${completedTasks} tasks completed successfully (${successRate}%)`, 
    pageWidth / 2, yPosition + 18, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPosition += 30;

  // Summary statistics
  checkAddPage(30);
  const summaryData = [
    ['Total Tasks', totalTasks.toString()],
    ['Successful', successCount.toString()],
    ['With Warnings', warningCount.toString()],
    ['Failed', errorCount.toString()],
    ['Information', infoCount.toString()],
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
  const warningResults = results.filter(r => r.status === 'warning');
  const infoResults = results.filter(r => r.status === 'info');
  const errorResults = results.filter(r => r.status === 'error');
  const skippedResults = results.filter(r => r.status === 'skipped');

  // Helper to render group details in a table
  const renderGroupDetails = (result) => {
    if (!result.details) return;
    
    const details = result.details;
    
    // Added groups
    if (details.added && details.added.length > 0) {
      checkAddPage(15);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`    Added to ${details.added.length} group(s):`, 18, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
      
      const addedData = details.added.map(g => [g.displayName || g.name || 'Unknown']);
      callAutoTable({
        startY: yPosition,
        body: addedData,
        theme: 'plain',
        bodyStyles: { fontSize: 8, textColor: [34, 197, 94] },
        margin: { left: 24, right: 14 },
        tableWidth: 'auto',
      });
      yPosition = doc.lastAutoTable.finalY + 3;
    }
    
    // Failed groups
    if (details.failed && details.failed.length > 0) {
      checkAddPage(15);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(`    Failed to add to ${details.failed.length} group(s):`, 18, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
      
      const failedData = details.failed.map(g => [
        g.displayName || g.name || 'Unknown',
        g.error || 'Unknown error'
      ]);
      callAutoTable({
        startY: yPosition,
        head: [['Group', 'Error']],
        body: failedData,
        theme: 'plain',
        headStyles: { fontSize: 8, fontStyle: 'bold', textColor: [239, 68, 68] },
        bodyStyles: { fontSize: 8 },
        margin: { left: 24, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 'auto' },
        },
      });
      yPosition = doc.lastAutoTable.finalY + 3;
    }
    
    // Skipped dynamic groups
    if (details.skippedDynamic && details.skippedDynamic.length > 0) {
      checkAddPage(15);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(234, 179, 8);
      doc.text(`    Skipped ${details.skippedDynamic.length} dynamic group(s):`, 18, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
      
      const dynamicData = details.skippedDynamic.map(g => [
        g.displayName || g.name || 'Unknown',
        g.reason || 'Dynamic membership - members determined by rules'
      ]);
      callAutoTable({
        startY: yPosition,
        head: [['Group', 'Reason']],
        body: dynamicData,
        theme: 'plain',
        headStyles: { fontSize: 8, fontStyle: 'bold', textColor: [234, 179, 8] },
        bodyStyles: { fontSize: 8 },
        margin: { left: 24, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 'auto' },
        },
      });
      yPosition = doc.lastAutoTable.finalY + 3;
    }
    
    // Skipped on-prem groups
    if (details.skippedOnPrem && details.skippedOnPrem.length > 0) {
      checkAddPage(15);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(234, 179, 8);
      doc.text(`    Skipped ${details.skippedOnPrem.length} on-premises group(s):`, 18, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 4;
      
      const onPremData = details.skippedOnPrem.map(g => [
        g.displayName || g.name || 'Unknown',
        g.reason || 'Must be managed in on-premises Active Directory'
      ]);
      callAutoTable({
        startY: yPosition,
        head: [['Group', 'Reason']],
        body: onPremData,
        theme: 'plain',
        headStyles: { fontSize: 8, fontStyle: 'bold', textColor: [234, 179, 8] },
        bodyStyles: { fontSize: 8 },
        margin: { left: 24, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 'auto' },
        },
      });
      yPosition = doc.lastAutoTable.finalY + 3;
    }
  };

  // Successful tasks
  if (successResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 197, 94); // Green
    doc.text('Successful Tasks', 14, yPosition);
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

    yPosition = doc.lastAutoTable.finalY + 5;
    
    // Render group details for successful Group Membership tasks
    successResults.forEach(r => {
      if ((r.action === 'Group Membership' || r.action === 'Groups Skipped') && r.details) {
        renderGroupDetails(r);
      }
    });
    
    yPosition += 5;
  }

  // Warning tasks (partial success)
  if (warningResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(234, 179, 8); // Amber
    doc.text('Tasks with Warnings', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const warningData = warningResults.map(r => [
      r.action,
      r.message || 'Completed with warnings',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Result']],
      body: warningData,
      theme: 'striped',
      headStyles: { fillColor: [234, 179, 8], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [254, 252, 232] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 5;
    
    // Render group details for warning tasks
    warningResults.forEach(r => {
      if ((r.action === 'Group Membership' || r.action === 'Groups Skipped') && r.details) {
        renderGroupDetails(r);
      }
    });
    
    yPosition += 5;
  }

  // Info tasks (skipped groups info)
  if (infoResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246); // Blue
    doc.text('Information', 14, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const infoData = infoResults.map(r => [
      r.action,
      r.message || 'Information',
    ]);

    callAutoTable({
      startY: yPosition,
      head: [['Task', 'Details']],
      body: infoData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 5;
    
    // Render group details for info tasks
    infoResults.forEach(r => {
      if ((r.action === 'Group Membership' || r.action === 'Groups Skipped') && r.details) {
        renderGroupDetails(r);
      }
    });
    
    yPosition += 5;
  }

  // Failed tasks
  if (errorResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(239, 68, 68); // Red
    doc.text('Failed Tasks', 14, yPosition);
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

    yPosition = doc.lastAutoTable.finalY + 5;
    
    // Render group details for failed Group Membership tasks
    errorResults.forEach(r => {
      if ((r.action === 'Group Membership' || r.action === 'Groups Skipped') && r.details) {
        renderGroupDetails(r);
      }
    });
    
    yPosition += 5;
  }

  // Skipped tasks
  if (skippedResults.length > 0) {
    checkAddPage(20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(107, 114, 128); // Gray
    doc.text('Skipped Tasks', 14, yPosition);
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

/**
 * Export scheduled offboarding execution results to PDF
 * @param {Object} params - Report parameters
 * @param {Object} params.executionLog - The execution log from Convex
 * @param {Object} params.schedule - The scheduled offboarding record
 */
export const exportScheduledOffboardingResultsToPDF = ({
  executionLog,
  schedule,
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper to call autoTable
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
  const successCount = executionLog.successfulActions || 0;
  const errorCount = executionLog.failedActions || 0;
  const skippedCount = executionLog.skippedActions || 0;
  const totalTasks = executionLog.totalActions || 0;
  const completedTasks = totalTasks - skippedCount;
  const successRate = completedTasks > 0 ? ((successCount / completedTasks) * 100).toFixed(1) : 0;

  const executionDate = new Date(executionLog.startTime);
  const endDate = executionLog.endTime ? new Date(executionLog.endTime) : null;

  // ===== HEADER =====
  doc.setFillColor(241, 245, 249); // Light gray background
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42); // Dark gray
  doc.text('Scheduled Offboarding Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139); // Medium gray
  doc.text(`Executed: ${executionDate.toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Execution Type: ${executionLog.executionType === 'scheduled' ? 'Automated (Scheduled)' : 'Manual'}`, pageWidth / 2, 35, { align: 'center' });
  doc.text(`Executed by: ${executionLog.executedBy || 'System'}`, pageWidth / 2, 42, { align: 'center' });

  yPosition = 55;

  // ===== EMPLOYEE INFORMATION =====
  addSectionHeader('Offboarded Employee');
  
  const employeeInfo = [
    ['Display Name', executionLog.targetUserName || 'N/A'],
    ['Email', executionLog.targetUserEmail || 'N/A'],
    ['User ID', executionLog.targetUserId || 'N/A'],
    ['Scheduled Date', schedule?.scheduledDate ? `${schedule.scheduledDate} ${schedule.scheduledTime || ''}` : 'N/A'],
    ['Template', schedule?.template || 'Standard'],
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

  // ===== EXECUTION SUMMARY =====
  addSectionHeader('Execution Summary');

  // Overall status indicator
  checkAddPage(40);
  const overallStatus = executionLog.status === 'completed' 
    ? 'OFFBOARDING COMPLETED SUCCESSFULLY' 
    : executionLog.status === 'partial' 
    ? 'OFFBOARDING COMPLETED WITH ISSUES' 
    : 'OFFBOARDING FAILED';
  
  const statusColor = executionLog.status === 'completed' 
    ? [34, 197, 94] // Green
    : executionLog.status === 'partial' 
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
  const duration = endDate && executionLog.startTime 
    ? Math.round((endDate.getTime() - executionLog.startTime) / 1000) 
    : 'N/A';
  
  const summaryData = [
    ['Total Actions', totalTasks.toString()],
    ['Successful', successCount.toString()],
    ['Failed', errorCount.toString()],
    ['Skipped', skippedCount.toString()],
    ['Success Rate', `${successRate}%`],
    ['Duration', typeof duration === 'number' ? `${duration} seconds` : duration],
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

  // ===== ACTION DETAILS =====
  addSectionHeader('Action Details');

  const actions = executionLog.actions || [];
  
  if (actions.length > 0) {
    const actionData = actions.map(action => {
      const statusEmoji = action.status === 'success' ? '✓' 
        : action.status === 'error' ? '✗' 
        : action.status === 'warning' ? '⚠' 
        : '○';
      
      const actionName = action.action
        ? action.action.replace(/([A-Z])/g, ' $1').trim()
        : 'Unknown Action';
      
      return [
        statusEmoji,
        actionName,
        action.status?.charAt(0).toUpperCase() + action.status?.slice(1) || 'Unknown',
        action.message || '',
        action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : '',
      ];
    });

    callAutoTable({
      startY: yPosition,
      head: [['', 'Action', 'Status', 'Message', 'Time']],
      body: actionData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25 },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // ===== ACTION DETAILS (Groups Removed/Skipped) =====
    // Find the removeFromGroups action that has details
    const removeGroupsAction = actions.find(a => a.action === 'removeFromGroups' && a.details);
    if (removeGroupsAction && removeGroupsAction.details) {
      addSectionHeader('Group Removal Details');
      
      // Parse the details format: "Removed: Group1, Group2 | Skipped: GroupA (reason), GroupB (reason)"
      const details = removeGroupsAction.details;
      const parts = details.split(' | ');
      
      let removedGroups = [];
      let skippedGroups = [];
      
      parts.forEach(part => {
        if (part.startsWith('Removed:')) {
          const groupsStr = part.replace('Removed:', '').trim();
          removedGroups = groupsStr.split(', ').filter(g => g.trim());
        } else if (part.startsWith('Skipped:')) {
          const groupsStr = part.replace('Skipped:', '').trim();
          // Parse format: "GroupName (reason), GroupName2 (reason2)"
          const groupMatches = groupsStr.match(/([^(,]+)\s*\(([^)]+)\)/g) || [];
          skippedGroups = groupMatches.map(match => {
            const parsed = match.match(/([^(]+)\s*\(([^)]+)\)/);
            return parsed ? { name: parsed[1].trim(), reason: parsed[2].trim() } : null;
          }).filter(Boolean);
        }
      });
      
      // Show removed groups section
      if (removedGroups.length > 0) {
        checkAddPage(20);
        doc.setFillColor(220, 252, 231); // Light green
        doc.rect(14, yPosition, pageWidth - 28, 8, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(22, 101, 52); // Dark green
        doc.text('Groups Successfully Removed', 16, yPosition + 5.5);
        doc.setTextColor(0, 0, 0);
        yPosition += 12;
        
        const removedData = removedGroups.map((group, idx) => [idx + 1, group, '✓ Removed']);
        
        callAutoTable({
          startY: yPosition,
          head: [['#', 'Group Name', 'Status']],
          body: removedData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
          },
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }
      
      // Show skipped groups section
      if (skippedGroups.length > 0) {
        checkAddPage(20);
        doc.setFillColor(254, 249, 195); // Light yellow
        doc.rect(14, yPosition, pageWidth - 28, 8, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(161, 98, 7); // Dark yellow
        doc.text('Groups Skipped (Not Cloud-Only Assigned Membership)', 16, yPosition + 5.5);
        doc.setTextColor(0, 0, 0);
        yPosition += 12;
        
        const skippedData = skippedGroups.map((group, idx) => [
          idx + 1, 
          group.name, 
          group.reason
        ]);
        
        callAutoTable({
          startY: yPosition,
          head: [['#', 'Group Name', 'Reason Skipped']],
          body: skippedData,
          theme: 'striped',
          headStyles: { fillColor: [234, 179, 8], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [254, 252, 232] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 55 },
          },
        });
        yPosition = doc.lastAutoTable.finalY + 10;
      }
      
      yPosition += 5;
    }
  } else {
    doc.setFontSize(10);
    doc.text('No detailed action logs available.', 16, yPosition);
    yPosition += 15;
  }

  // ===== ERROR DETAILS =====
  const errorActions = actions.filter(a => a.status === 'error');
  if (errorActions.length > 0) {
    addSectionHeader('Error Details');

    errorActions.forEach((action, index) => {
      checkAddPage(25);
      
      doc.setFillColor(254, 242, 242); // Light red
      doc.rect(14, yPosition, pageWidth - 28, 20, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(185, 28, 28); // Dark red
      const actionName = action.action
        ? action.action.replace(/([A-Z])/g, ' $1').trim()
        : 'Unknown Action';
      doc.text(`${index + 1}. ${actionName}`, 16, yPosition + 7);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const message = action.message || 'No error message available';
      const wrappedMessage = doc.splitTextToSize(message, pageWidth - 36);
      doc.text(wrappedMessage, 16, yPosition + 14);
      
      yPosition += 25 + (wrappedMessage.length - 1) * 4;
    });

    yPosition += 10;
  }

  // ===== CONFIGURED ACTIONS =====
  if (schedule?.actions) {
    addSectionHeader('Configured Offboarding Actions');

    const configData = [
      ['Disable Account', schedule.actions.disableAccount ? 'Yes' : 'No'],
      ['Revoke Access (Sign-in Sessions)', schedule.actions.revokeAccess ? 'Yes' : 'No'],
      ['Remove from Groups', schedule.actions.removeFromGroups ? 'Yes' : 'No'],
      ['Convert to Shared Mailbox', schedule.actions.convertToSharedMailbox ? 'Yes' : 'No'],
      ['Backup Data', schedule.actions.backupData ? 'Yes' : 'No'],
      ['Remove Devices', schedule.actions.removeDevices ? 'Yes' : 'No'],
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
  }

  // ===== RECOMMENDATIONS =====
  if (errorCount > 0) {
    addSectionHeader('Recommendations');
    
    checkAddPage(40);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const recommendations = [
      '• Review failed actions and determine if manual intervention is required',
      '• Check Azure AD admin portal to verify user status and permissions',
      '• Verify that all critical offboarding steps were completed successfully',
      '• Consider retrying the failed offboarding after resolving any issues',
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
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages} | Scheduled Offboarding Report | Confidential`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const sanitizedUserName = executionLog.targetUserName?.replace(/[^a-z0-9]/gi, '_') || 'user';
  const dateStr = executionDate.toISOString().split('T')[0];
  const filename = `Scheduled_Offboarding_Report_${sanitizedUserName}_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
};
