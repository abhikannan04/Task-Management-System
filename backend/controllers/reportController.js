import PDFDocument from 'pdfkit';
import { getAllProjects, getProjectById } from '../models/Project.js';
import { getTeamDailyUpdates, getProjectDailyUpdates, getMostRecentActionPlanStatuses, getAllMostRecentActionPlanStatuses, getAllActionPlansForProject } from '../models/DailyStatus.js';
import { logReportGeneration, getReportLogs } from '../models/ReportLog.js';
import { findUserById } from '../models/User.js';
import logger from '../utils/logger.js';
import db from '../db.js';

// Helper function to capitalize first letter of status
const capitalizeStatus = (status) => {
  if (!status) return 'N/A';

  // Handle special cases for project status display
  if (status === 'active') return 'In Progress';
  if (status === 'planning') return 'Started';

  // Replace underscores with spaces and capitalize first letter of each word
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Modified getAllProjects function to support department filtering
const getAllProjectsForReports = async (userId, userRole, department = null) => {
  // First, update any delayed projects
  try {
    // Update projects that are past their end date but are not completed to delayed status
    // Use date comparison that accounts for timezone
    await db('projects')
      .whereNot('status', 'completed')
      .where('end_date', '<', new Date().toISOString().split('T')[0]) // Compare only date part
      .where('is_deleted', false)
      .where('created_by', userId) // Only update projects created by this user
      .update({ status: 'delayed', updated_at: db.fn.now() });
  } catch (error) {
    console.error('Error updating delayed projects:', error);
  }

  let query = db('projects')
    .leftJoin(
      db('project_assignments')
        .where('project_assignments.is_active', true)
        .groupBy('project_assignments.project_id')
        .select('project_assignments.project_id', db.raw('COUNT(*) as assignment_count'))
        .as('assignments'),
      'projects.id',
      'assignments.project_id'
    )
    .where('projects.is_deleted', false)
    .select(
      'projects.*',
      'assignments.assignment_count'
    );

  if (userRole === 'employee') {
    // Employees only see projects they're assigned to
    query = query
      .join('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'))
          .andOn('project_assignments.employee_id', '=', db.raw('?', [userId]));
      });
  } else if (userRole === 'manager') {
    // Managers only see projects they created
    query = query.where('projects.created_by', userId);
  } else if (userRole === 'admin') {
    // Admins see all, but can filter by department name
    if (department) {
      query = query.where('projects.department', department);
    }
  }

  const projects = await query;

  // Ensure assignment_count is properly set for all projects
  return projects.map(project => ({
    ...project,
    assignment_count: project.assignment_count ? parseInt(project.assignment_count) : 0
  }));
};

const generatePDFReport = (res, reportData, projects, report_type = 'summary') => {
  let streamStarted = false;

  try {
    // Define color palette
    const colors = {
      primary: '#2563eb',
      secondary: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      dark: '#1f2937',
      gray: '#6b7280',
      light: '#f3f4f6',
      lightGray: '#e5e7eb'
    };

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    // For summary reports, use a descriptive filename
    const fileName = report_type === 'summary' ? `Summary Report-${Date.now()}` : `Project Report-${Date.now()}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Cover Page
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1e3a8a');

    // Company logo placeholder
    doc.fillColor('white')
      .fontSize(36)
      .font('Helvetica-Bold')
      .text('PROJECT STATUS', 0, 200, { align: 'center' });

    doc.fontSize(28)
      .text('REPORT', 0, 250, { align: 'center' });

    doc.fontSize(14)
      .font('Helvetica')
      .text('Comprehensive Project Analysis', 0, 320, { align: 'center' });

    // Add only one page after cover page
    doc.addPage();

    // Combined Page: Executive Summary, Project Status Distribution, and Project Status Overview
    // Header
    doc.fillColor(colors.dark)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Executive Summary', 50, 50, { align: 'center' });

    // Summary Cards (excluding total projects from charts)
    doc.moveDown(2);

    const summaryStats = [
      { label: 'In-Progress Projects', value: reportData.activeProjects, color: '#3b82f6' },
      { label: 'Completed Projects', value: reportData.completedProjects, color: '#10b981' },
      { label: 'Delayed Projects', value: reportData.delayedProjects, color: '#ef4444' },
      { label: 'Pending Approval', value: reportData.pendingApprovalProjects, color: '#f59e0b' }
    ];

    // Calculate positions for summary cards
    const cardWidth = 110;
    const cardHeight = 70;
    const cardSpacing = 25;
    const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
    const startX = (doc.page.width - totalCardsWidth) / 2;
    const startY = 120; // Reduced from 180 to move cards up and reduce empty space

    summaryStats.forEach((stat, index) => {
      const x = startX + (index * (cardWidth + cardSpacing));
      const y = startY;

      // Card background
      doc.fillColor(stat.color)
        .rect(x, y, cardWidth, cardHeight)
        .fill();

      // Value
      doc.fillColor('white')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(stat.value.toString(), x, y + 20, { width: cardWidth, align: 'center' });

      // Label
      doc.fontSize(8)
        .font('Helvetica')
        .text(stat.label, x, y + 45, { width: cardWidth, align: 'center' });
    });

    // Summary card for total projects (display only, not in charts) - moved to appear after other stats
    const totalCardX = (doc.page.width - 110) / 2;
    const totalCardY = startY + 100; // Position below other cards
    doc.fillColor('#8b5cf6')  // Violet color for total projects
      .rect(totalCardX, totalCardY, 110, 70)
      .fill();

    doc.fillColor('white')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(reportData.totalProjects.toString(), totalCardX, totalCardY + 20, { width: 110, align: 'center' });

    doc.fontSize(8)
      .font('Helvetica')
      .text('Total Projects', totalCardX, totalCardY + 45, { width: 110, align: 'center' });

    // Project Status Distribution (Pie Chart) - excluding total
    doc.fillColor(colors.dark)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Project Status Distribution', 50, 320, { align: 'center' }); // Moved down to prevent overlap with Total Projects card

    // Pie Chart
    const pieCenterX = 200;
    const pieCenterY = 420; // Moved down to prevent overlap with Total Projects card
    const pieRadius = 70;
    const total = summaryStats.reduce((sum, stat) => sum + stat.value, 0) || 1;

    let currentAngle = -Math.PI / 2; // Start from top

    summaryStats.forEach((stat, index) => {
      if (stat.value > 0) {
        const angle = (stat.value / total) * 2 * Math.PI;

        // Draw pie slice
        doc.fillColor(stat.color)
          .moveTo(pieCenterX, pieCenterY)
          .lineTo(
            pieCenterX + pieRadius * Math.cos(currentAngle),
            pieCenterY + pieRadius * Math.sin(currentAngle)
          )
          .arc(pieCenterX, pieCenterY, pieRadius, currentAngle, currentAngle + angle)
          .lineTo(pieCenterX, pieCenterY)
          .fill();

        // Draw percentage label inside slice
        if (angle > 0.3) { // Only show label for significant slices
          const labelAngle = currentAngle + angle / 2;
          const labelRadius = pieRadius * 0.6;
          const labelX = pieCenterX + labelRadius * Math.cos(labelAngle);
          const labelY = pieCenterY + labelRadius * Math.sin(labelAngle);

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(
              `${Math.round((stat.value / total) * 100)}%`,
              labelX - 12,
              labelY - 5,
              { width: 24, align: 'center' }
            );
        }

        currentAngle += angle;
      }
    });

    // Legend
    const legendX = 320;
    const legendY = 370; // Moved down to prevent overlap with Total Projects card

    summaryStats.forEach((stat, index) => {
      const y = legendY + (index * 25);

      // Color box
      doc.fillColor(stat.color)
        .rect(legendX, y, 12, 12)
        .fill();

      // Label and value
      doc.fillColor(colors.dark)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(stat.label, legendX + 20, y);

      doc.fillColor(colors.gray)
        .font('Helvetica')
        .text(stat.value.toString(), legendX + 20, y + 12);
    });

    // Project Status Overview (Bar Chart) - excluding total
    doc.fillColor(colors.dark)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Project Status Overview', 50, 520, { align: 'center' }); // Moved down to prevent overlap with Total Projects card

    // Bar Chart
    const barChartX = 50;
    const barChartY = 570; // Moved down to prevent overlap with Total Projects card
    const barChartWidth = doc.page.width - 100;
    const barChartHeight = 150;
    const maxValue = Math.max(...summaryStats.map(stat => stat.value), 1);

    // Draw axes
    doc.strokeColor(colors.lightGray)
      .lineWidth(1)
      .moveTo(barChartX, barChartY + barChartHeight)
      .lineTo(barChartX + barChartWidth, barChartY + barChartHeight)
      .stroke();

    // Draw bars
    const barWidth = (barChartWidth / summaryStats.length) - 15;

    summaryStats.forEach((stat, index) => {
      const barHeight = (stat.value / maxValue) * barChartHeight;
      const x = barChartX + (index * (barChartWidth / summaryStats.length)) + 10;
      const y = barChartY + barChartHeight - barHeight;

      // Solid color bars
      doc.fillColor(stat.color)
        .rect(x, y, barWidth, barHeight)
        .fill();

      // Value on top of bar
      doc.fillColor(colors.dark)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(stat.value.toString(), x, y - 15, {
          width: barWidth,
          align: 'center'
        });

      // Label below bar
      doc.fillColor(colors.gray)
        .fontSize(8)
        .font('Helvetica')
        .text(stat.label, x, barChartY + barChartHeight + 5, {
          width: barWidth,
          align: 'center'
        });
    });

    // Add a new page only if we have projects to display
    if (projects && projects.length > 0) {
      doc.addPage();

      // Project Details Pages
      let currentY = 50;
      let currentPage = 1;
      let headerAdded = false; // Track if header has been added

      // Header for Project Details (only add once)
      doc.fillColor(colors.dark)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Project Details', 50, currentY, { align: 'center' });

      headerAdded = true;
      currentY += 50;

      // Table Header with Description column
      const projectHeaders = ['Project Name', 'Description', 'Status'];
      // Make table occupy full page width
      const pageWidth = doc.page.width - 60; // 30px margin on each side
      const projectColumnWidths = [
        pageWidth * 0.25, // Project Name - 25% of page width
        pageWidth * 0.5,  // Description - 50% of page width
        pageWidth * 0.25  // Status - 25% of page width
      ];
      const projectTableX = 30; // Keep 30px margin from left

      // Draw header
      doc.fillColor(colors.primary)
        .rect(projectTableX, currentY, pageWidth, 30)
        .fill();

      doc.fillColor('white')
        .fontSize(11)
        .font('Helvetica-Bold');

      let currentX = projectTableX;
      projectHeaders.forEach((header, index) => {
        doc.text(header, currentX, currentY + 10, {
          width: projectColumnWidths[index],
          align: 'center'
        });
        currentX += projectColumnWidths[index];
      });

      currentY += 40;
      doc.fontSize(9)
        .font('Helvetica');

      // Table Rows
      projects.forEach((project, index) => {
        // Calculate row height based on text content, especially for description
        const description = project.description || 'N/A';
        // Estimate height needed for description (assuming ~25 chars per line at font size 9)
        const descriptionLines = Math.ceil(description.length / 25);
        const rowHeight = Math.max(40, 25 + (descriptionLines * 15)); // Minimum 40, more for longer descriptions

        // Check if we need a new page (only based on space, not fixed count)
        if (currentY + rowHeight > doc.page.height - 100) {
          doc.addPage();
          currentPage++;
          currentY = 50;

          // Only add header on new page if it hasn't been added yet
          // Since we want a single header for the entire project list, we don't add it again

          currentY += 20; // Add some space at the top of new page
          doc.fontSize(9)
            .font('Helvetica')
            .fillColor(colors.dark);
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.fillColor(colors.light)
            .rect(projectTableX, currentY, projectColumnWidths.reduce((a, b) => a + b, 0), rowHeight)
            .fill();
        }

        // Project data with description and capitalized status
        const rowData = [
          project.name || 'N/A',
          project.description || 'N/A',
          capitalizeStatus(project.status) || 'N/A' // Capitalize status
        ];

        doc.fillColor(colors.dark);
        currentX = projectTableX;

        // Handle text wrapping for all columns
        rowData.forEach((data, colIndex) => {
          const yPos = currentY + 15;
          const width = projectColumnWidths[colIndex] - 10;

          // Center all columns including description
          doc.text(data, currentX + 5, yPos, {
            width: width,
            align: 'center',
            lineBreak: true
          });
          currentX += projectColumnWidths[colIndex];
        });

        currentY += rowHeight + 5; // Add extra spacing between rows
      });

      // No footer added to comply with double-sided printing requirements
    }

    // Finalize the PDF
    doc.end();
  } catch (error) {
    logger.error('PDF generation error:', error);
    if (!streamStarted) {
      res.status(500).json({ error: 'Failed to generate PDF report' });
    }
  }
};

// Generate PDF for project summary - function removed as per requirements

// Helper to escape CSV fields
const escapeCsvField = (field) => {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

// Export the generate function for the route
export const generate = async (req, res) => {
  try {
    const { report_type = 'summary', export_format = 'pdf', project_id, department } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Log the report generation
    await logReportGeneration({
      user_id: userId,
      report_type,
      export_format,
      generated_at: new Date()
    });

    // Handle project summary report
    if (report_type === 'project_summary') {
      if (!project_id) {
        return res.status(400).json({ error: 'Project ID is required for project summary report' });
      }

      // Get project details
      const project = await getProjectById(project_id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get daily updates for the project
      const dailyUpdates = await getProjectDailyUpdates(project_id);

      // Return JSON data for UI display
      if (export_format === 'json') {
        return res.json({
          success: true,
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            status: capitalizeStatus(project.status),
            start_date: project.start_date,
            end_date: project.end_date
          },
          dailyUpdates: dailyUpdates.map(update => ({
            id: update.id,
            date: update.date,
            employee_name: update.employee_name,
            status_text: update.status_text,
            action_plan: update.status_text, // Action plan is the same as status text in this context
            action_plan_status: update.action_plan_status
          }))
        });
      }

      // Generate PDF for project summary - disabled as per requirements
      if (export_format === 'pdf') {
        return res.status(400).json({ error: 'PDF generation is not available for project summary reports. Please use CSV format instead.' });
      }

      // For other formats (CSV), return a simple CSV with project details and updates
      res.setHeader('Content-Type', 'text/csv');
      // For project summary reports, include the project name in the filename
      const fileName = `Project Report-${project.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);

      // Add UTF-8 BOM for proper encoding and Excel compatibility
      let csvContent = '\uFEFF';

      // Include project details as the first row
      csvContent += `${escapeCsvField(project.name || 'N/A')},${escapeCsvField(project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A')},${escapeCsvField(project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A')}\n`;

      // Add header row
      csvContent += 'Employee,Action Plan,Action Plan Status\n';

      // Add action plan data
      // Show all action plans that are marked as completed (submitted for review)
      // Remove restrictive filtering to show all action plans
      const validUpdates = dailyUpdates;
      validUpdates.forEach(update => {
        // Add action plan status to the CSV
        const actionPlanStatus = capitalizeStatus(update.action_plan_status) || 'Started';

        csvContent += `${escapeCsvField(update.employee_name || 'N/A')},${escapeCsvField(update.status_text || 'N/A')},${escapeCsvField(actionPlanStatus)}\n`;
      });

      res.send(csvContent);
      return;
    }

    // Handle summary report (existing functionality)
    // Get all projects for the user based on their role and department filter
    const projects = await getAllProjectsForReports(userId, userRole, department);

    // Calculate report data
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const delayedProjects = projects.filter(p => p.status === 'delayed').length;
    const pendingApprovalProjects = projects.filter(p => p.status === 'pending_approval').length;

    const reportData = {
      totalProjects,
      activeProjects,
      completedProjects,
      delayedProjects,
      pendingApprovalProjects
    };

    // Return JSON data for UI display
    if (export_format === 'json') {
      return res.json({
        success: true,
        data: reportData,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: capitalizeStatus(p.status), // Capitalize status
          start_date: p.start_date,
          end_date: p.end_date
        }))
      });
    }

    // Generate PDF report
    if (export_format === 'pdf') {
      generatePDFReport(res, reportData, projects, report_type);
    } else {
      // For other formats (CSV), return a custom CSV with the requested headers
      res.setHeader('Content-Type', 'text/csv');
      // For summary reports, use a descriptive filename
      const fileName = report_type === 'summary' ? `Summary Report-${Date.now()}` : `Project Report-${Date.now()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);

      // Add UTF-8 BOM for proper encoding and Excel compatibility
      let csvContent = '\uFEFF';

      // Custom headers as requested: OSTA No, OSTA Name, Department Name, FSTA No, FSTA Name, Goal No, Goal, Action Plan Code, Action Plan, Responsibility, Employee Code, Status
      csvContent += 'OSTA No,OSTA,Department,FSTA No,FSTA,Goal No,Goal,Action Plan Code,Action Plan,Responsibility,Employee Code,Status\n';

      // Group projects by OSTA to assign FSTA numbers correctly
      const ostaGroups = {};
      projects.forEach((project, index) => {
        const ostaName = project.osta_name || `OSTA-${index + 1}`;
        if (!ostaGroups[ostaName]) {
          ostaGroups[ostaName] = [];
        }
        ostaGroups[ostaName].push({
          ...project,
          osta_no: project.osta_no || index + 1,
          department: project.department || 'Systems'
        });
      });

      // Process projects to match the requested format
      let rowIndex = 1;

      for (const ostaName of Object.keys(ostaGroups)) {
        const ostaProjects = ostaGroups[ostaName];

        // Group projects by FSTA name within each OSTA
        const fstaGroups = {};
        ostaProjects.forEach((project, index) => {
          const fstaName = project.fsta_name || `FSTA`;
          if (!fstaGroups[fstaName]) {
            fstaGroups[fstaName] = [];
          }
          fstaGroups[fstaName].push(project);
        });

        // Keep track of FSTA names and their assigned numbers per OSTA
        const fstaNumberMap = {};
        let nextFstaNumber = 1;
        // Keep track of goal numbers within each FSTA
        const fstaGoalCount = {};

        // Process each FSTA group
        for (const fstaName in fstaGroups) {
          const fstaProjects = fstaGroups[fstaName];

          // For FSTA No, use the same number for projects with the same FSTA name within this OSTA
          let fstaNo;
          if (fstaNumberMap[fstaName]) {
            fstaNo = fstaNumberMap[fstaName];
          } else {
            fstaNo = nextFstaNumber;
            fstaNumberMap[fstaName] = nextFstaNumber;
            nextFstaNumber++;
          }

          // Initialize goal count for this FSTA if not already done
          if (!fstaGoalCount[fstaNo]) {
            fstaGoalCount[fstaNo] = 0;
          }

          // Process each project within this FSTA
          for (let goalIndex = 0; goalIndex < fstaProjects.length; goalIndex++) {
            const project = fstaProjects[goalIndex];

            // Increment goal count for this FSTA
            fstaGoalCount[fstaNo]++;
            const goalNo = fstaGoalCount[fstaNo];

            // Using actual data from the project
            const ostaNo = project.osta_no;
            const currentOstaName = project.osta_name || `OSTA-${rowIndex}`;
            const departmentName = project.department || 'Systems'; // Using department name from project
            const displayFstaName = project.fsta_name || fstaName + '-' + fstaNo; // Using fsta_name from project or default
            const goal = project.name || 'N/A';  // Project Name as "Goal"

            try {
              // Use the new function to get all action plans for the project
              const actionPlans = await getAllActionPlansForProject(project.id);

              if (actionPlans.length > 0) {
                // Add a row for each action plan
                for (let actionPlanIndex = 0; actionPlanIndex < actionPlans.length; actionPlanIndex++) {
                  const actionPlan = actionPlans[actionPlanIndex];
                  const actionPlanCode = `${goalNo}.${actionPlanIndex + 1}`; // Action plan code (GoalNo.ActionPlanNo)
                  const actionPlanText = actionPlan.status_text || 'N/A';
                  const responsibility = actionPlan.employee_name || 'N/A';
                  const empCode = actionPlan.employee_code || 'N/A';
                  // Use action plan status
                  const status = capitalizeStatus(actionPlan.action_plan_status) || 'Started';

                  csvContent += `${escapeCsvField(ostaNo)},${escapeCsvField(currentOstaName)},${escapeCsvField(departmentName)},${escapeCsvField(fstaNo)},${escapeCsvField(displayFstaName)},${escapeCsvField(goalNo)},${escapeCsvField(goal)},${escapeCsvField(actionPlanCode)},${escapeCsvField(actionPlanText)},${escapeCsvField(responsibility)},${escapeCsvField(empCode)},${escapeCsvField(status)}\n`;
                }
              } else {
                // No completed action plans, add a single row with default values
                const actionPlanCode = `${goalNo}.1`; // Default action plan code
                // Use "Started" as default status for action plans
                csvContent += `${escapeCsvField(ostaNo)},${escapeCsvField(currentOstaName)},${escapeCsvField(departmentName)},${escapeCsvField(fstaNo)},${escapeCsvField(displayFstaName)},${escapeCsvField(goalNo)},${escapeCsvField(goal)},${escapeCsvField(actionPlanCode)},"N/A","N/A","N/A","Started"\n`;
              }
            } catch (actionPlanError) {
              logger.error('Error fetching action plan data:', actionPlanError);
              // Add a row with error values
              const actionPlanCode = `${goalNo}.1`; // Default action plan code
              csvContent += `${escapeCsvField(ostaNo)},${escapeCsvField(currentOstaName)},${escapeCsvField(departmentName)},${escapeCsvField(fstaNo)},${escapeCsvField(displayFstaName)},${escapeCsvField(goalNo)},${escapeCsvField(goal)},${escapeCsvField(actionPlanCode)},"Error","Error","Error","Error"\n`;
            }
            rowIndex++;
          }
        }
      }

      res.send(csvContent);
    }
  } catch (error) {
    logger.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Export the getLogs function for the route
export const getLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await getReportLogs(userId);
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Get report logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve report logs' });
  }
};