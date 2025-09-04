const { pool } = require('../config');

// Create Resource
const createResource = async (req, res) => {
  try {
    const {
      name,
      role,
      subcontractor,
      rate,
      availability = 'Full-time',
      contactInfo,
      skills
    } = req.body;

    const connection = await pool.getConnection();

    // Insert new resource
    const [result] = await connection.execute(
      `INSERT INTO resources (
        name, role, subcontractor, rate, availability, contact_info, skills
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, role, subcontractor, rate, availability, contactInfo, skills]
    );

    // Get created resource
    const [resources] = await connection.execute(
      'SELECT * FROM resources WHERE id = ?',
      [result.insertId]
    );

    connection.release();

    const resource = resources[0];

    res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          role: resource.role,
          subcontractor: resource.subcontractor,
          rate: resource.rate,
          availability: resource.availability,
          contactInfo: resource.contact_info,
          skills: resource.skills,
          assignedTasks: resource.assigned_tasks,
          isActive: resource.is_active,
          createdAt: resource.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create resource'
    });
  }
};

// Get All Resources
const getAllResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, availability, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = 'SELECT * FROM resources WHERE is_active = TRUE';
    let countQuery = 'SELECT COUNT(*) as total FROM resources WHERE is_active = TRUE';
    const params = [];
    const countParams = [];

    // Add role filter
    if (role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }

    // Add availability filter
    if (availability) {
      query += ' AND availability = ?';
      countQuery += ' AND availability = ?';
      params.push(availability);
      countParams.push(availability);
    }

    // Add search filter
    if (search) {
      query += ' AND (name LIKE ? OR role LIKE ? OR subcontractor LIKE ?)';
      countQuery += ' AND (name LIKE ? OR role LIKE ? OR subcontractor LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [resources] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        resources: resources.map(resource => ({
          id: resource.id,
          name: resource.name,
          role: resource.role,
          subcontractor: resource.subcontractor,
          rate: resource.rate,
          availability: resource.availability,
          contactInfo: resource.contact_info,
          skills: resource.skills,
          assignedTasks: resource.assigned_tasks,
          isActive: resource.is_active,
          createdAt: resource.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalResources: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch resources'
    });
  }
};

// Get Resource by ID
const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [resources] = await connection.execute(
      'SELECT * FROM resources WHERE id = ? AND is_active = TRUE',
      [id]
    );

    connection.release();

    if (resources.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    const resource = resources[0];

    res.status(200).json({
      status: 'success',
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          role: resource.role,
          subcontractor: resource.subcontractor,
          rate: resource.rate,
          availability: resource.availability,
          contactInfo: resource.contact_info,
          skills: resource.skills,
          assignedTasks: resource.assigned_tasks,
          isActive: resource.is_active,
          createdAt: resource.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch resource'
    });
  }
};

// Update Resource
const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if resource exists
    const [existingResources] = await connection.execute(
      'SELECT id FROM resources WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existingResources.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'role', 'subcontractor', 'rate', 'availability',
      'contact_info', 'skills', 'assigned_tasks'
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
      `UPDATE resources SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated resource
    const [updatedResources] = await connection.execute(
      'SELECT * FROM resources WHERE id = ?',
      [id]
    );

    connection.release();

    const resource = updatedResources[0];

    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          role: resource.role,
          subcontractor: resource.subcontractor,
          rate: resource.rate,
          availability: resource.availability,
          contactInfo: resource.contact_info,
          skills: resource.skills,
          assignedTasks: resource.assigned_tasks,
          isActive: resource.is_active
        }
      }
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update resource'
    });
  }
};

// Delete Resource
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if resource exists
    const [existingResources] = await connection.execute(
      'SELECT id FROM resources WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existingResources.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Soft delete - deactivate resource
    await connection.execute(
      'UPDATE resources SET is_active = FALSE WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete resource'
    });
  }
};

module.exports = {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource
};