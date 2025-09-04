const { pool } = require('../config');

// Generate Contract Number
const generateContractNumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM contracts'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `CON-${String(count).padStart(3, '0')}`;
};

// Create Contract
const createContract = async (req, res) => {
  try {
    const {
      projectId,
      contractValue,
      signedDate,
      startDate,
      endDate,
      clientRepresentative,
      paymentTerms,
      terms
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

    // Generate contract number
    const contractNumber = await generateContractNumber();

    // Insert new contract
    const [result] = await connection.execute(
      `INSERT INTO contracts (
        contract_number, project_id, contract_value, signed_date, start_date, end_date,
        client_representative, payment_terms, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [contractNumber, projectId, contractValue, signedDate, startDate, endDate, clientRepresentative, paymentTerms, terms]
    );

    // Get created contract with project details
    const [contracts] = await connection.execute(
      `SELECT c.*, p.name as project_name, p.client 
       FROM contracts c 
       LEFT JOIN projects p ON c.project_id = p.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    connection.release();

    const contract = contracts[0];

    res.status(201).json({
      status: 'success',
      message: 'Contract created successfully',
      data: {
        contract: {
          id: contract.id,
          contractNumber: contract.contract_number,
          projectId: contract.project_id,
          projectName: contract.project_name,
          client: contract.client,
          contractValue: contract.contract_value,
          signedDate: contract.signed_date,
          startDate: contract.start_date,
          endDate: contract.end_date,
          status: contract.status,
          clientRepresentative: contract.client_representative,
          paymentTerms: contract.payment_terms,
          terms: contract.terms,
          createdAt: contract.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create contract'
    });
  }
};

// Get All Contracts
const getAllContracts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT c.*, p.name as project_name, p.client 
      FROM contracts c 
      LEFT JOIN projects p ON c.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM contracts WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND c.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add search filter
    if (search) {
      query += ' AND (c.contract_number LIKE ? OR p.name LIKE ? OR p.client LIKE ?)';
      countQuery += ' AND (contract_number LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ? OR client LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [contracts] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        contracts: contracts.map(contract => ({
          id: contract.id,
          contractNumber: contract.contract_number,
          projectId: contract.project_id,
          projectName: contract.project_name,
          client: contract.client,
          contractValue: contract.contract_value,
          signedDate: contract.signed_date,
          startDate: contract.start_date,
          endDate: contract.end_date,
          status: contract.status,
          clientRepresentative: contract.client_representative,
          paymentTerms: contract.payment_terms,
          terms: contract.terms,
          createdAt: contract.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalContracts: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all contracts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contracts'
    });
  }
};

// Get Contract by ID
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [contracts] = await connection.execute(
      `SELECT c.*, p.name as project_name, p.client 
       FROM contracts c 
       LEFT JOIN projects p ON c.project_id = p.id 
       WHERE c.id = ?`,
      [id]
    );

    connection.release();

    if (contracts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Contract not found'
      });
    }

    const contract = contracts[0];

    res.status(200).json({
      status: 'success',
      data: {
        contract: {
          id: contract.id,
          contractNumber: contract.contract_number,
          projectId: contract.project_id,
          projectName: contract.project_name,
          client: contract.client,
          contractValue: contract.contract_value,
          signedDate: contract.signed_date,
          startDate: contract.start_date,
          endDate: contract.end_date,
          status: contract.status,
          clientRepresentative: contract.client_representative,
          paymentTerms: contract.payment_terms,
          terms: contract.terms,
          createdAt: contract.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get contract by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contract'
    });
  }
};

// Update Contract
const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if contract exists
    const [existingContracts] = await connection.execute(
      'SELECT id FROM contracts WHERE id = ?',
      [id]
    );

    if (existingContracts.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Contract not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'contract_value', 'signed_date', 'start_date', 'end_date', 'status',
      'client_representative', 'payment_terms', 'terms'
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
      `UPDATE contracts SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated contract
    const [updatedContracts] = await connection.execute(
      `SELECT c.*, p.name as project_name, p.client 
       FROM contracts c 
       LEFT JOIN projects p ON c.project_id = p.id 
       WHERE c.id = ?`,
      [id]
    );

    connection.release();

    const contract = updatedContracts[0];

    res.status(200).json({
      status: 'success',
      message: 'Contract updated successfully',
      data: {
        contract: {
          id: contract.id,
          contractNumber: contract.contract_number,
          projectId: contract.project_id,
          projectName: contract.project_name,
          client: contract.client,
          contractValue: contract.contract_value,
          signedDate: contract.signed_date,
          startDate: contract.start_date,
          endDate: contract.end_date,
          status: contract.status,
          clientRepresentative: contract.client_representative,
          paymentTerms: contract.payment_terms,
          terms: contract.terms
        }
      }
    });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update contract'
    });
  }
};

// Delete Contract
const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if contract exists
    const [existingContracts] = await connection.execute(
      'SELECT id FROM contracts WHERE id = ?',
      [id]
    );

    if (existingContracts.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Contract not found'
      });
    }

    // Delete contract
    await connection.execute(
      'DELETE FROM contracts WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Contract deleted successfully'
    });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete contract'
    });
  }
};

module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract
};