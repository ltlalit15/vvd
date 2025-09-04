const { pool } = require('../config');

// Create Project Closeout
const createCloseout = async (req, res) => {
  try {
    const {
      projectId,
      finalInspectionDate,
      snagListResolved,
      asBuiltDrawingsSubmitted,
      handoverDate,
      warrantyPeriod,
      closureStatus = 'Pending',
      notes
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

    // Check if closeout already exists for this project
    const [existingCloseouts] = await connection.execute(
      'SELECT id FROM project_closeouts WHERE project_id = ?',
      [projectId]
    );

    if (existingCloseouts.length > 0) {
      connection.release();
      return res.status(400).json({
        status: 'error',
        message: 'Closeout already exists for this project'
      });
    }

    // Insert new closeout
    const [result] = await connection.execute(
      `INSERT INTO project_closeouts (
        project_id, final_inspection_date, snag_list_resolved, as_built_drawings_submitted,
        handover_date, warranty_period, closure_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, finalInspectionDate, snagListResolved, asBuiltDrawingsSubmitted, handoverDate, warrantyPeriod, closureStatus, notes]
    );

    // Get created closeout with project details
    const [closeouts] = await connection.execute(
      `SELECT pc.*, p.name as project_name 
       FROM project_closeouts pc 
       LEFT JOIN projects p ON pc.project_id = p.id 
       WHERE pc.id = ?`,
      [result.insertId]
    );

    connection.release();

    const closeout = closeouts[0];

    res.status(201).json({
      status: 'success',
      message: 'Project closeout created successfully',
      data: {
        closeout: {
          id: closeout.id,
          projectId: closeout.project_id,
          projectName: closeout.project_name,
          finalInspectionDate: closeout.final_inspection_date,
          snagListResolved: closeout.snag_list_resolved,
          asBuiltDrawingsSubmitted: closeout.as_built_drawings_submitted,
          handoverDate: closeout.handover_date,
          warrantyPeriod: closeout.warranty_period,
          closureStatus: closeout.closure_status,
          notes: closeout.notes,
          createdAt: closeout.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create closeout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create project closeout'
    });
  }
};

// Get All Closeouts
const getAllCloseouts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT pc.*, p.name as project_name 
      FROM project_closeouts pc 
      LEFT JOIN projects p ON pc.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM project_closeouts WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND pc.closure_status = ?';
      countQuery += ' AND closure_status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add search filter
    if (search) {
      query += ' AND p.name LIKE ?';
      countQuery += ' AND project_id IN (SELECT id FROM projects WHERE name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      countParams.push(searchTerm);
    }

    query += ' ORDER BY pc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [closeouts] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        closeouts: closeouts.map(closeout => ({
          id: closeout.id,
          projectId: closeout.project_id,
          projectName: closeout.project_name,
          finalInspectionDate: closeout.final_inspection_date,
          snagListResolved: closeout.snag_list_resolved,
          asBuiltDrawingsSubmitted: closeout.as_built_drawings_submitted,
          handoverDate: closeout.handover_date,
          warrantyPeriod: closeout.warranty_period,
          closureStatus: closeout.closure_status,
          notes: closeout.notes,
          createdAt: closeout.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCloseouts: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all closeouts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch closeouts'
    });
  }
};

// Update Closeout
const updateCloseout = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if closeout exists
    const [existingCloseouts] = await connection.execute(
      'SELECT id FROM project_closeouts WHERE id = ?',
      [id]
    );

    if (existingCloseouts.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Closeout not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'final_inspection_date', 'snag_list_resolved', 'as_built_drawings_submitted',
      'handover_date', 'warranty_period', 'closure_status', 'notes'
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
      `UPDATE project_closeouts SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated closeout
    const [updatedCloseouts] = await connection.execute(
      `SELECT pc.*, p.name as project_name 
       FROM project_closeouts pc 
       LEFT JOIN projects p ON pc.project_id = p.id 
       WHERE pc.id = ?`,
      [id]
    );

    connection.release();

    const closeout = updatedCloseouts[0];

    res.status(200).json({
      status: 'success',
      message: 'Closeout updated successfully',
      data: {
        closeout: {
          id: closeout.id,
          projectId: closeout.project_id,
          projectName: closeout.project_name,
          finalInspectionDate: closeout.final_inspection_date,
          snagListResolved: closeout.snag_list_resolved,
          asBuiltDrawingsSubmitted: closeout.as_built_drawings_submitted,
          handoverDate: closeout.handover_date,
          warrantyPeriod: closeout.warranty_period,
          closureStatus: closeout.closure_status,
          notes: closeout.notes
        }
      }
    });
  } catch (error) {
    console.error('Update closeout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update closeout'
    });
  }
};

module.exports = {
  createCloseout,
  getAllCloseouts,
  updateCloseout
};