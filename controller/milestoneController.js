const { pool } = require('../config');

// Create Milestone
const createMilestone = async (req, res) => {
  try {
    const {
      projectId,
      name,
      plannedDate,
      actualDate,
      status = 'Not Started',
      description
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

    // Insert new milestone
    const [result] = await connection.execute(
      `INSERT INTO milestones (
        project_id, name, planned_date, actual_date, status, description
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, name, plannedDate, actualDate, status, description]
    );

    // Get created milestone with project details
    const [milestones] = await connection.execute(
      `SELECT m.*, p.name as project_name 
       FROM milestones m 
       LEFT JOIN projects p ON m.project_id = p.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    connection.release();

    const milestone = milestones[0];

    res.status(201).json({
      status: 'success',
      message: 'Milestone created successfully',
      data: {
        milestone: {
          id: milestone.id,
          projectId: milestone.project_id,
          projectName: milestone.project_name,
          name: milestone.name,
          plannedDate: milestone.planned_date,
          actualDate: milestone.actual_date,
          status: milestone.status,
          description: milestone.description,
          createdAt: milestone.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create milestone'
    });
  }
};

// Get All Milestones
const getAllMilestones = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT m.*, p.name as project_name 
      FROM milestones m 
      LEFT JOIN projects p ON m.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM milestones WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND m.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add project filter
    if (projectId) {
      query += ' AND m.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    // Add search filter
    if (search) {
      query += ' AND (m.name LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (name LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY m.planned_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [milestones] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        milestones: milestones.map(milestone => ({
          id: milestone.id,
          projectId: milestone.project_id,
          projectName: milestone.project_name,
          name: milestone.name,
          plannedDate: milestone.planned_date,
          actualDate: milestone.actual_date,
          status: milestone.status,
          description: milestone.description,
          createdAt: milestone.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMilestones: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all milestones error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch milestones'
    });
  }
};

// Update Milestone
const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if milestone exists
    const [existingMilestones] = await connection.execute(
      'SELECT id FROM milestones WHERE id = ?',
      [id]
    );

    if (existingMilestones.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Milestone not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'planned_date', 'actual_date', 'status', 'description'
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
      `UPDATE milestones SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated milestone
    const [updatedMilestones] = await connection.execute(
      `SELECT m.*, p.name as project_name 
       FROM milestones m 
       LEFT JOIN projects p ON m.project_id = p.id 
       WHERE m.id = ?`,
      [id]
    );

    connection.release();

    const milestone = updatedMilestones[0];

    res.status(200).json({
      status: 'success',
      message: 'Milestone updated successfully',
      data: {
        milestone: {
          id: milestone.id,
          projectId: milestone.project_id,
          projectName: milestone.project_name,
          name: milestone.name,
          plannedDate: milestone.planned_date,
          actualDate: milestone.actual_date,
          status: milestone.status,
          description: milestone.description
        }
      }
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update milestone'
    });
  }
};

// Delete Milestone
const deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if milestone exists
    const [existingMilestones] = await connection.execute(
      'SELECT id FROM milestones WHERE id = ?',
      [id]
    );

    if (existingMilestones.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Milestone not found'
      });
    }

    // Delete milestone
    await connection.execute(
      'DELETE FROM milestones WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete milestone'
    });
  }
};

module.exports = {
  createMilestone,
  getAllMilestones,
  updateMilestone,
  deleteMilestone
};