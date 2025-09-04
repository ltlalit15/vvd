const { pool } = require('../config');

// Create Risk
const createRisk = async (req, res) => {
  try {
    const {
      projectId,
      description,
      level = 'Medium',
      impact,
      mitigationPlan,
      owner
    } = req.body;

    const connection = await pool.getConnection();

    // Check if project exists
    const [projects] = await connection.execute(
      'SELECT id, name FROM projects WHERE id = ?',
      [projectId]
    );

    if (projects.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Insert new risk
    const [result] = await connection.execute(
      `INSERT INTO risks (
        project_id, description, level, impact, mitigation_plan, owner
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, description, level, impact, mitigationPlan, owner]
    );

    // Get created risk with project details
    const [risks] = await connection.execute(
      `SELECT r.*, p.name as project_name 
       FROM risks r 
       LEFT JOIN projects p ON r.project_id = p.id 
       WHERE r.id = ?`,
      [result.insertId]
    );

    connection.release();

    const risk = risks[0];

    res.status(201).json({
      status: 'success',
      message: 'Risk created successfully',
      data: {
        risk: {
          id: risk.id,
          projectId: risk.project_id,
          projectName: risk.project_name,
          description: risk.description,
          level: risk.level,
          impact: risk.impact,
          mitigationPlan: risk.mitigation_plan,
          owner: risk.owner,
          status: risk.status,
          createdAt: risk.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create risk error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create risk'
    });
  }
};

// Get All Risks
const getAllRisks = async (req, res) => {
  try {
    const { page = 1, limit = 10, level, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT r.*, p.name as project_name 
      FROM risks r 
      LEFT JOIN projects p ON r.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM risks WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add level filter
    if (level) {
      query += ' AND r.level = ?';
      countQuery += ' AND level = ?';
      params.push(level);
      countParams.push(level);
    }

    // Add status filter
    if (status) {
      query += ' AND r.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add project filter
    if (projectId) {
      query += ' AND r.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    // Add search filter
    if (search) {
      query += ' AND (r.description LIKE ? OR r.owner LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (description LIKE ? OR owner LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [risks] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        risks: risks.map(risk => ({
          id: risk.id,
          projectId: risk.project_id,
          projectName: risk.project_name,
          description: risk.description,
          level: risk.level,
          impact: risk.impact,
          mitigationPlan: risk.mitigation_plan,
          owner: risk.owner,
          status: risk.status,
          createdAt: risk.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRisks: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all risks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch risks'
    });
  }
};

// Update Risk
const updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if risk exists
    const [existingRisks] = await connection.execute(
      'SELECT id FROM risks WHERE id = ?',
      [id]
    );

    if (existingRisks.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Risk not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'description', 'level', 'impact', 'mitigation_plan', 'owner', 'status'
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
      `UPDATE risks SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated risk
    const [updatedRisks] = await connection.execute(
      `SELECT r.*, p.name as project_name 
       FROM risks r 
       LEFT JOIN projects p ON r.project_id = p.id 
       WHERE r.id = ?`,
      [id]
    );

    connection.release();

    const risk = updatedRisks[0];

    res.status(200).json({
      status: 'success',
      message: 'Risk updated successfully',
      data: {
        risk: {
          id: risk.id,
          projectId: risk.project_id,
          projectName: risk.project_name,
          description: risk.description,
          level: risk.level,
          impact: risk.impact,
          mitigationPlan: risk.mitigation_plan,
          owner: risk.owner,
          status: risk.status
        }
      }
    });
  } catch (error) {
    console.error('Update risk error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update risk'
    });
  }
};

// Delete Risk
const deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if risk exists
    const [existingRisks] = await connection.execute(
      'SELECT id FROM risks WHERE id = ?',
      [id]
    );

    if (existingRisks.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Risk not found'
      });
    }

    // Delete risk
    await connection.execute(
      'DELETE FROM risks WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Risk deleted successfully'
    });
  } catch (error) {
    console.error('Delete risk error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete risk'
    });
  }
};

module.exports = {
  createRisk,
  getAllRisks,
  updateRisk,
  deleteRisk
};