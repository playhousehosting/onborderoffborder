import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  doc.autoTable({
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

  doc.autoTable({
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

  doc.autoTable({
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

    doc.autoTable({
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

    doc.autoTable({
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

    doc.autoTable({
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
