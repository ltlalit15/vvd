const { pool } = require('../config');

// Generate Invoice Number
const generateInvoiceNumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM invoices'
  );
  connection.release();
  
  const count = result[0].count + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(3, '0')}`;
};

// Generate Payment ID
const generatePaymentId = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM payments'
  );
  connection.release();
  
  const count = result[0].count + 1;
  const year = new Date().getFullYear();
  return `PAY-${year}-${String(count).padStart(3, '0')}`;
};

// Create Invoice
const createInvoice = async (req, res) => {
  try {
    const {
      projectId,
      amount,
      dueDate,
      description,
      grnReference,
      items
    } = req.body;

    const connection = await pool.getConnection();

    // Check if project exists
    const [projects] = await connection.execute(
      'SELECT id, name, client FROM projects WHERE id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    const issueDate = new Date().toISOString().split('T')[0];

    // Start transaction
    await connection.beginTransaction();

    try {
      // Insert invoice
      const [invoiceResult] = await connection.execute(
        `INSERT INTO invoices (
          invoice_number, project_id, amount, issue_date, due_date, description, grn_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNumber, projectId, amount, issueDate, dueDate, description, grnReference]
      );

      const invoiceId = invoiceResult.insertId;

      // Insert invoice items
      if (items && items.length > 0) {
        for (const item of items) {
          await connection.execute(
            'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
            [invoiceId, item.description, item.quantity, item.rate, item.amount]
          );
        }
      }

      await connection.commit();

      // Get created invoice with project details
      const [invoices] = await connection.execute(
        `SELECT i.*, p.name as project_name, p.client 
         FROM invoices i 
         LEFT JOIN projects p ON i.project_id = p.id 
         WHERE i.id = ?`,
        [invoiceId]
      );

      // Get invoice items
      const [invoiceItems] = await connection.execute(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );

      connection.release();

      const invoice = invoices[0];

      res.status(201).json({
        status: 'success',
        message: 'Invoice created successfully',
        data: {
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            projectId: invoice.project_id,
            projectName: invoice.project_name,
            client: invoice.client,
            amount: invoice.amount,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            status: invoice.status,
            description: invoice.description,
            grnReference: invoice.grn_reference,
            items: invoiceItems.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount
            })),
            createdAt: invoice.created_at
          }
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create invoice'
    });
  }
};

// Get All Invoices
const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT i.*, p.name as project_name, p.client 
      FROM invoices i 
      LEFT JOIN projects p ON i.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM invoices WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND i.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add project filter
    if (projectId) {
      query += ' AND i.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    // Add search filter
    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR p.name LIKE ? OR p.client LIKE ?)';
      countQuery += ' AND (invoice_number LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ? OR client LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [invoices] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          projectId: invoice.project_id,
          projectName: invoice.project_name,
          client: invoice.client,
          amount: invoice.amount,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          status: invoice.status,
          description: invoice.description,
          grnReference: invoice.grn_reference,
          createdAt: invoice.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalInvoices: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch invoices'
    });
  }
};

// Record Payment
const recordPayment = async (req, res) => {
  try {
    const {
      invoiceId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes
    } = req.body;

    const connection = await pool.getConnection();

    // Check if invoice exists
    const [invoices] = await connection.execute(
      'SELECT id, amount, status FROM invoices WHERE id = ?',
      [invoiceId]
    );

    if (invoices.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];

    // Check if invoice is already paid
    if (invoice.status === 'Paid') {
      connection.release();
      return res.status(400).json({
        status: 'error',
        message: 'Invoice is already paid'
      });
    }

    // Generate payment ID
    const paymentId = await generatePaymentId();

    // Start transaction
    await connection.beginTransaction();

    try {
      // Insert payment
      const [result] = await connection.execute(
        `INSERT INTO payments (
          payment_id, invoice_id, amount, payment_date, payment_method, reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, invoiceId, amount, paymentDate, paymentMethod, reference, notes]
      );

      // Get total payments for this invoice
      const [totalPayments] = await connection.execute(
        'SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?',
        [invoiceId]
      );

      const totalPaid = totalPayments[0].total_paid || 0;

      // Update invoice status based on payment
      let newStatus = 'Pending';
      if (totalPaid >= invoice.amount) {
        newStatus = 'Paid';
      } else if (new Date(invoice.due_date) < new Date()) {
        newStatus = 'Overdue';
      }

      await connection.execute(
        'UPDATE invoices SET status = ? WHERE id = ?',
        [newStatus, invoiceId]
      );

      await connection.commit();

      // Get created payment
      const [payments] = await connection.execute(
        'SELECT * FROM payments WHERE id = ?',
        [result.insertId]
      );

      connection.release();

      const payment = payments[0];

      res.status(201).json({
        status: 'success',
        message: 'Payment recorded successfully',
        data: {
          payment: {
            id: payment.id,
            paymentId: payment.payment_id,
            invoiceId: payment.invoice_id,
            amount: payment.amount,
            paymentDate: payment.payment_date,
            paymentMethod: payment.payment_method,
            reference: payment.reference,
            notes: payment.notes,
            createdAt: payment.created_at
          }
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record payment'
    });
  }
};

// Get Financial Summary
const getFinancialSummary = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Get invoice statistics
    const [invoiceStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'Overdue' THEN amount ELSE 0 END) as overdue_amount
      FROM invoices
    `);

    // Get payment statistics
    const [paymentStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_payments_amount
      FROM payments
    `);

    // Get project financial summary
    const [projectStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(budget) as total_budget,
        SUM(actual_cost) as total_actual_cost,
        SUM(contract_value) as total_contract_value
      FROM projects
    `);

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          invoices: invoiceStats[0],
          payments: paymentStats[0],
          projects: projectStats[0]
        }
      }
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch financial summary'
    });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  recordPayment,
  getFinancialSummary
};