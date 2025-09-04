const { pool } = require('../config');

// Generate RFQ Number
const generateRFQNumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM rfqs'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `RFQ-${String(count).padStart(3, '0')}`;
};

// Create RFQ
const createRFQ = async (req, res) => {
  try {
    const {
      client,
      project,
      location,
      value,
      scopeSummary,
      contactPerson,
      contactEmail,
      contactPhone,
      deadline,
      notes
    } = req.body;

    const connection = await pool.getConnection();

    // Generate RFQ number
    const rfqNumber = await generateRFQNumber();

    // Insert new RFQ
    const [result] = await connection.execute(
      `INSERT INTO rfqs (
        rfq_number, client, project, location, value, scope_summary,
        contact_person, contact_email, contact_phone, deadline, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rfqNumber, client, project, location, value, scopeSummary, contactPerson, contactEmail, contactPhone, deadline, notes]
    );

    // Get created RFQ
    const [rfqs] = await connection.execute(
      'SELECT * FROM rfqs WHERE id = ?',
      [result.insertId]
    );

    connection.release();

    const rfq = rfqs[0];

    res.status(201).json({
      status: 'success',
      message: 'RFQ created successfully',
      data: {
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfq_number,
          client: rfq.client,
          project: rfq.project,
          location: rfq.location,
          value: rfq.value,
          scopeSummary: rfq.scope_summary,
          contactPerson: rfq.contact_person,
          contactEmail: rfq.contact_email,
          contactPhone: rfq.contact_phone,
          deadline: rfq.deadline,
          notes: rfq.notes,
          status: rfq.status,
          createdAt: rfq.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create RFQ error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create RFQ'
    });
  }
};

// Get All RFQs
const getAllRFQs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = 'SELECT * FROM rfqs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM rfqs WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add search filter
    if (search) {
      query += ' AND (client LIKE ? OR project LIKE ? OR rfq_number LIKE ?)';
      countQuery += ' AND (client LIKE ? OR project LIKE ? OR rfq_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rfqs] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        rfqs: rfqs.map(rfq => ({
          id: rfq.id,
          rfqNumber: rfq.rfq_number,
          client: rfq.client,
          project: rfq.project,
          location: rfq.location,
          value: rfq.value,
          scopeSummary: rfq.scope_summary,
          contactPerson: rfq.contact_person,
          contactEmail: rfq.contact_email,
          contactPhone: rfq.contact_phone,
          deadline: rfq.deadline,
          notes: rfq.notes,
          status: rfq.status,
          createdAt: rfq.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRFQs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all RFQs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch RFQs'
    });
  }
};

// Get RFQ by ID
const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [rfqs] = await connection.execute(
      'SELECT * FROM rfqs WHERE id = ?',
      [id]
    );

    connection.release();

    if (rfqs.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    const rfq = rfqs[0];

    res.status(200).json({
      status: 'success',
      data: {
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfq_number,
          client: rfq.client,
          project: rfq.project,
          location: rfq.location,
          value: rfq.value,
          scopeSummary: rfq.scope_summary,
          contactPerson: rfq.contact_person,
          contactEmail: rfq.contact_email,
          contactPhone: rfq.contact_phone,
          deadline: rfq.deadline,
          notes: rfq.notes,
          status: rfq.status,
          createdAt: rfq.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get RFQ by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch RFQ'
    });
  }
};

// Update RFQ
const updateRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if RFQ exists
    const [existingRFQs] = await connection.execute(
      'SELECT id FROM rfqs WHERE id = ?',
      [id]
    );

    if (existingRFQs.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'client', 'project', 'location', 'value', 'scope_summary',
      'contact_person', 'contact_email', 'contact_phone', 'deadline', 'notes', 'status'
    ];

    Object.keys(updateData).forEach(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      connection.release();
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    updateValues.push(id);

    await connection.execute(
      `UPDATE rfqs SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated RFQ
    const [updatedRFQs] = await connection.execute(
      'SELECT * FROM rfqs WHERE id = ?',
      [id]
    );

    connection.release();

    const rfq = updatedRFQs[0];

    res.status(200).json({
      status: 'success',
      message: 'RFQ updated successfully',
      data: {
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfq_number,
          client: rfq.client,
          project: rfq.project,
          location: rfq.location,
          value: rfq.value,
          scopeSummary: rfq.scope_summary,
          contactPerson: rfq.contact_person,
          contactEmail: rfq.contact_email,
          contactPhone: rfq.contact_phone,
          deadline: rfq.deadline,
          notes: rfq.notes,
          status: rfq.status
        }
      }
    });
  } catch (error) {
    console.error('Update RFQ error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update RFQ'
    });
  }
};

// Delete RFQ
const deleteRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if RFQ exists
    const [existingRFQs] = await connection.execute(
      'SELECT id FROM rfqs WHERE id = ?',
      [id]
    );

    if (existingRFQs.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'RFQ not found'
      });
    }

    // Delete RFQ
    await connection.execute(
      'DELETE FROM rfqs WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'RFQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete RFQ error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete RFQ'
    });
  }
};

module.exports = {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ
};