const { pool } = require('../config');

// Generate Project Summary Report
const generateProjectSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate, projectId, status } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT p.*, u.first_name, u.last_name,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(t.progress) as avg_task_progress
      FROM projects p 
      LEFT JOIN users u ON p.project_manager_id = u.id 
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (startDate && endDate) {
      query += ' AND p.start_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (projectId) {
      query += ' AND p.id = ?';
      params.push(projectId);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [projects] = await connection.execute(query, params);

    // Get financial summary
    const [financialSummary] = await connection.execute(`
      SELECT 
        SUM(budget) as total_budget,
        SUM(actual_cost) as total_actual_cost,
        COUNT(DISTINCT i.id) as total_invoices,
        SUM(i.amount) as total_invoice_amount,
        SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END) as total_paid
      FROM projects p
      LEFT JOIN invoices i ON p.id = i.project_id
      WHERE 1=1 ${projectId ? 'AND p.id = ?' : ''}
    `, projectId ? [projectId] : []);

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'Project Summary',
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, projectId, status },
        summary: financialSummary[0],
        projects: projects.map(project => ({
          id: project.id,
          projectCode: project.project_code,
          name: project.name,
          client: project.client,
          budget: project.budget,
          actualCost: project.actual_cost,
          status: project.status,
          progress: project.progress,
          projectManager: {
            firstName: project.first_name,
            lastName: project.last_name
          },
          taskSummary: {
            totalTasks: project.total_tasks,
            completedTasks: project.completed_tasks,
            avgProgress: Math.round(project.avg_task_progress || 0)
          },
          startDate: project.start_date,
          endDate: project.end_date
        }))
      }
    });
  } catch (error) {
    console.error('Generate project summary report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate project summary report'
    });
  }
};

// Generate Financial Report
const generateFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;

    const connection = await pool.getConnection();

    let invoiceQuery = `
      SELECT i.*, p.name as project_name, p.client
      FROM invoices i
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE 1=1
    `;
    const invoiceParams = [];

    if (startDate && endDate) {
      invoiceQuery += ' AND i.issue_date BETWEEN ? AND ?';
      invoiceParams.push(startDate, endDate);
    }

    if (projectId) {
      invoiceQuery += ' AND i.project_id = ?';
      invoiceParams.push(projectId);
    }

    invoiceQuery += ' ORDER BY i.issue_date DESC';

    const [invoices] = await connection.execute(invoiceQuery, invoiceParams);

    // Get payment summary
    let paymentQuery = `
      SELECT p.*, i.invoice_number, i.project_id
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const paymentParams = [];

    if (startDate && endDate) {
      paymentQuery += ' AND p.payment_date BETWEEN ? AND ?';
      paymentParams.push(startDate, endDate);
    }

    if (projectId) {
      paymentQuery += ' AND i.project_id = ?';
      paymentParams.push(projectId);
    }

    paymentQuery += ' ORDER BY p.payment_date DESC';

    const [payments] = await connection.execute(paymentQuery, paymentParams);

    // Calculate summary statistics
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const totalPaidAmount = payments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
    const pendingAmount = totalInvoiceAmount - totalPaidAmount;

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'Financial Report',
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, projectId },
        summary: {
          totalInvoices: invoices.length,
          totalInvoiceAmount,
          totalPayments: payments.length,
          totalPaidAmount,
          pendingAmount,
          collectionRate: totalInvoiceAmount > 0 ? ((totalPaidAmount / totalInvoiceAmount) * 100).toFixed(2) : 0
        },
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          projectName: invoice.project_name,
          client: invoice.client,
          amount: invoice.amount,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          status: invoice.status
        })),
        payments: payments.map(payment => ({
          id: payment.id,
          paymentId: payment.payment_id,
          invoiceNumber: payment.invoice_number,
          amount: payment.amount,
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method
        }))
      }
    });
  } catch (error) {
    console.error('Generate financial report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate financial report'
    });
  }
};

// Generate Task Progress Report
const generateTaskProgressReport = async (req, res) => {
  try {
    const { startDate, endDate, projectId, assigneeId, status } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT t.*, p.name as project_name, u.first_name, u.last_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (startDate && endDate) {
      query += ' AND t.start_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (assigneeId) {
      query += ' AND t.assignee_id = ?';
      params.push(assigneeId);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.due_date ASC';

    const [tasks] = await connection.execute(query, params);

    // Calculate summary statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'Completed').length;
    const avgProgress = totalTasks > 0 ? tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks : 0;

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'Task Progress Report',
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, projectId, assigneeId, status },
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          avgProgress: Math.round(avgProgress),
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
        },
        tasks: tasks.map(task => ({
          id: task.id,
          taskNumber: task.task_number,
          title: task.title,
          projectName: task.project_name,
          assignee: {
            firstName: task.first_name,
            lastName: task.last_name
          },
          startDate: task.start_date,
          dueDate: task.due_date,
          status: task.status,
          progress: task.progress,
          priority: task.priority
        }))
      }
    });
  } catch (error) {
    console.error('Generate task progress report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate task progress report'
    });
  }
};

// Generate Quality & HSE Report
const generateQualityReport = async (req, res) => {
  try {
    const { startDate, endDate, projectId, hseIssues } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT qi.*, t.title as task_title, p.name as project_name, u.first_name, u.last_name
      FROM quality_inspections qi
      LEFT JOIN tasks t ON qi.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON qi.inspector_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (startDate && endDate) {
      query += ' AND qi.inspection_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (hseIssues) {
      query += ' AND qi.hse_issues = ?';
      params.push(hseIssues);
    }

    query += ' ORDER BY qi.inspection_date DESC';

    const [inspections] = await connection.execute(query, params);

    // Calculate summary statistics
    const totalInspections = inspections.length;
    const openIssues = inspections.filter(i => i.status === 'Open').length;
    const closedIssues = inspections.filter(i => i.status === 'Closed').length;
    const criticalIssues = inspections.filter(i => i.hse_issues === 'Critical').length;
    const highIssues = inspections.filter(i => i.hse_issues === 'High').length;

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        reportType: 'Quality & HSE Report',
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, projectId, hseIssues },
        summary: {
          totalInspections,
          openIssues,
          closedIssues,
          criticalIssues,
          highIssues,
          resolutionRate: totalInspections > 0 ? ((closedIssues / totalInspections) * 100).toFixed(2) : 0
        },
        inspections: inspections.map(inspection => ({
          id: inspection.id,
          inspectionId: inspection.inspection_id,
          taskTitle: inspection.task_title,
          projectName: inspection.project_name,
          inspector: {
            firstName: inspection.first_name,
            lastName: inspection.last_name
          },
          inspectionDate: inspection.inspection_date,
          snags: inspection.snags,
          status: inspection.status,
          hseIssues: inspection.hse_issues
        }))
      }
    });
  } catch (error) {
    console.error('Generate quality report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate quality report'
    });
  }
};

module.exports = {
  generateProjectSummaryReport,
  generateFinancialReport,
  generateTaskProgressReport,
  generateQualityReport
};