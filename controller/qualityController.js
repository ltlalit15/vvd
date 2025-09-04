const { pool } = require('../config');

// Generate Inspection ID
const generateInspectionId = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM quality_inspections'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `INSP-${String(count).padStart(3, '0')}`;
};

// Create Quality Inspection
const createInspection = async (req, res) => {
  try {
    const {
      taskId,
      inspectionDate,
      inspectorId,
      snags,
      hseIssues = 'Medium',
      photos,
      notes
    } = req.body;

    const connection = await pool.getConnection();

    // Check if task exists
    const [tasks] = await connection.execute(
      'SELECT id, title FROM tasks WHERE id = ?',
      [taskId]
    );

    if (tasks.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Check if inspector exists
    const [inspectors] = await connection.execute(
      'SELECT id, first_name, last_name FROM users WHERE id = ?',
      [inspectorId]
    );

    if (inspectors.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Inspector not found'
      });
    }

    // Generate inspection ID
    const inspectionId = await generateInspectionId();

    // Insert new inspection
    const [result] = await connection.execute(
      `INSERT INTO quality_inspections (
        inspection_id, task_id, inspection_date, inspector_id, snags, hse_issues, photos, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [inspectionId, taskId, inspectionDate, inspectorId, snags, hseIssues, photos, notes]
    );

    // Get created inspection with related data
    const [inspections] = await connection.execute(
      `SELECT qi.*, t.title as task_title, u.first_name, u.last_name 
       FROM quality_inspections qi 
       LEFT JOIN tasks t ON qi.task_id = t.id 
       LEFT JOIN users u ON qi.inspector_id = u.id 
       WHERE qi.id = ?`,
      [result.insertId]
    );

    connection.release();

    const inspection = inspections[0];

    res.status(201).json({
      status: 'success',
      message: 'Quality inspection created successfully',
      data: {
        inspection: {
          id: inspection.id,
          inspectionId: inspection.inspection_id,
          taskId: inspection.task_id,
          taskTitle: inspection.task_title,
          inspectionDate: inspection.inspection_date,
          inspector: {
            id: inspection.inspector_id,
            firstName: inspection.first_name,
            lastName: inspection.last_name
          },
          snags: inspection.snags,
          status: inspection.status,
          hseIssues: inspection.hse_issues,
          photos: inspection.photos,
          notes: inspection.notes,
          createdAt: inspection.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create inspection'
    });
  }
};

// Get All Inspections
const getAllInspections = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, hseIssues, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT qi.*, t.title as task_title, u.first_name, u.last_name 
      FROM quality_inspections qi 
      LEFT JOIN tasks t ON qi.task_id = t.id 
      LEFT JOIN users u ON qi.inspector_id = u.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM quality_inspections WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND qi.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add HSE issues filter
    if (hseIssues) {
      query += ' AND qi.hse_issues = ?';
      countQuery += ' AND hse_issues = ?';
      params.push(hseIssues);
      countParams.push(hseIssues);
    }

    // Add search filter
    if (search) {
      query += ' AND (qi.inspection_id LIKE ? OR t.title LIKE ? OR qi.snags LIKE ?)';
      countQuery += ' AND (inspection_id LIKE ? OR task_id IN (SELECT id FROM tasks WHERE title LIKE ?) OR snags LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY qi.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [inspections] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        inspections: inspections.map(inspection => ({
          id: inspection.id,
          inspectionId: inspection.inspection_id,
          taskId: inspection.task_id,
          taskTitle: inspection.task_title,
          inspectionDate: inspection.inspection_date,
          inspector: {
            id: inspection.inspector_id,
            firstName: inspection.first_name,
            lastName: inspection.last_name
          },
          snags: inspection.snags,
          status: inspection.status,
          hseIssues: inspection.hse_issues,
          photos: inspection.photos,
          notes: inspection.notes,
          createdAt: inspection.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalInspections: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all inspections error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inspections'
    });
  }
};

// Update Inspection
const updateInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if inspection exists
    const [existingInspections] = await connection.execute(
      'SELECT id FROM quality_inspections WHERE id = ?',
      [id]
    );

    if (existingInspections.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Inspection not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'inspection_date', 'inspector_id', 'snags', 'status', 'hse_issues', 'photos', 'notes'
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
      `UPDATE quality_inspections SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated inspection
    const [updatedInspections] = await connection.execute(
      `SELECT qi.*, t.title as task_title, u.first_name, u.last_name 
       FROM quality_inspections qi 
       LEFT JOIN tasks t ON qi.task_id = t.id 
       LEFT JOIN users u ON qi.inspector_id = u.id 
       WHERE qi.id = ?`,
      [id]
    );

    connection.release();

    const inspection = updatedInspections[0];

    res.status(200).json({
      status: 'success',
      message: 'Inspection updated successfully',
      data: {
        inspection: {
          id: inspection.id,
          inspectionId: inspection.inspection_id,
          taskId: inspection.task_id,
          taskTitle: inspection.task_title,
          inspectionDate: inspection.inspection_date,
          inspector: {
            id: inspection.inspector_id,
            firstName: inspection.first_name,
            lastName: inspection.last_name
          },
          snags: inspection.snags,
          status: inspection.status,
          hseIssues: inspection.hse_issues,
          photos: inspection.photos,
          notes: inspection.notes
        }
      }
    });
  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update inspection'
    });
  }
};

module.exports = {
  createInspection,
  getAllInspections,
  updateInspection
};