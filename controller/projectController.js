const { pool } = require('../config');

// Generate Project Code
const generateProjectCode = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM projects'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `PRJ-${String(count).padStart(3, '0')}`;
};

// Create Project
const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      client,
      budget,
      startDate,
      endDate,
      status = 'Planning',
      priority = 'Medium',
      projectManagerId,
      location
    } = req.body;

    const connection = await pool.getConnection();

    // Generate project code
    const projectCode = await generateProjectCode();

    // Insert new project
    const [result] = await connection.execute(
      `INSERT INTO projects (
        project_code, name, description, client, budget, start_date, end_date,
        status, priority, project_manager_id, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectCode, name, description, client, budget, startDate, endDate, status, priority, projectManagerId, location]
    );

    // Get created project with manager details
    const [projects] = await connection.execute(
      `SELECT p.*, u.first_name, u.last_name, u.email as manager_email 
       FROM projects p 
       LEFT JOIN users u ON p.project_manager_id = u.id 
       WHERE p.id = ?`,
      [result.insertId]
    );

    connection.release();

    const project = projects[0];

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: {
        project: {
          id: project.id,
          projectCode: project.project_code,
          name: project.name,
          description: project.description,
          client: project.client,
          budget: project.budget,
          actualCost: project.actual_cost,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          location: project.location,
          projectManager: {
            id: project.project_manager_id,
            firstName: project.first_name,
            lastName: project.last_name,
            email: project.manager_email
          },
          createdAt: project.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create project'
    });
  }
};

// Get All Projects
const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT p.*, u.first_name, u.last_name, u.email as manager_email 
      FROM projects p 
      LEFT JOIN users u ON p.project_manager_id = u.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND p.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add priority filter
    if (priority) {
      query += ' AND p.priority = ?';
      countQuery += ' AND priority = ?';
      params.push(priority);
      countParams.push(priority);
    }

    // Add search filter
    if (search) {
      query += ' AND (p.name LIKE ? OR p.client LIKE ? OR p.project_code LIKE ?)';
      countQuery += ' AND (name LIKE ? OR client LIKE ? OR project_code LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [projects] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        projects: projects.map(project => ({
          id: project.id,
          projectCode: project.project_code,
          name: project.name,
          description: project.description,
          client: project.client,
          budget: project.budget,
          actualCost: project.actual_cost,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          location: project.location,
          contractValue: project.contract_value,
          projectManager: {
            id: project.project_manager_id,
            firstName: project.first_name,
            lastName: project.last_name,
            email: project.manager_email
          },
          createdAt: project.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProjects: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch projects'
    });
  }
};

// Get Project by ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [projects] = await connection.execute(
      `SELECT p.*, u.first_name, u.last_name, u.email as manager_email 
       FROM projects p 
       LEFT JOIN users u ON p.project_manager_id = u.id 
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Get project tasks
    const [tasks] = await connection.execute(
      `SELECT t.*, u.first_name as assignee_first_name, u.last_name as assignee_last_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.project_id = ?`,
      [id]
    );

    connection.release();

    const project = projects[0];

    res.status(200).json({
      status: 'success',
      data: {
        project: {
          id: project.id,
          projectCode: project.project_code,
          name: project.name,
          description: project.description,
          client: project.client,
          budget: project.budget,
          actualCost: project.actual_cost,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          location: project.location,
          contractValue: project.contract_value,
          projectManager: {
            id: project.project_manager_id,
            firstName: project.first_name,
            lastName: project.last_name,
            email: project.manager_email
          },
          tasks: tasks.map(task => ({
            id: task.id,
            taskNumber: task.task_number,
            title: task.title,
            description: task.description,
            assignee: {
              id: task.assignee_id,
              firstName: task.assignee_first_name,
              lastName: task.assignee_last_name
            },
            startDate: task.start_date,
            dueDate: task.due_date,
            priority: task.priority,
            status: task.status,
            progress: task.progress
          })),
          createdAt: project.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch project'
    });
  }
};

// Update Project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if project exists
    const [existingProjects] = await connection.execute(
      'SELECT id FROM projects WHERE id = ?',
      [id]
    );

    if (existingProjects.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'description', 'client', 'budget', 'actual_cost', 'start_date',
      'end_date', 'status', 'priority', 'progress', 'project_manager_id',
      'location', 'contract_value'
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
      `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated project
    const [updatedProjects] = await connection.execute(
      `SELECT p.*, u.first_name, u.last_name, u.email as manager_email 
       FROM projects p 
       LEFT JOIN users u ON p.project_manager_id = u.id 
       WHERE p.id = ?`,
      [id]
    );

    connection.release();

    const project = updatedProjects[0];

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: {
        project: {
          id: project.id,
          projectCode: project.project_code,
          name: project.name,
          description: project.description,
          client: project.client,
          budget: project.budget,
          actualCost: project.actual_cost,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          location: project.location,
          contractValue: project.contract_value,
          projectManager: {
            id: project.project_manager_id,
            firstName: project.first_name,
            lastName: project.last_name,
            email: project.manager_email
          }
        }
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update project'
    });
  }
};

// Delete Project
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if project exists
    const [existingProjects] = await connection.execute(
      'SELECT id FROM projects WHERE id = ?',
      [id]
    );

    if (existingProjects.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Delete project (cascade will handle related records)
    await connection.execute(
      'DELETE FROM projects WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete project'
    });
  }
};

// Get Project Statistics
const getProjectStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_projects,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_projects,
        SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as on_hold_projects,
        SUM(budget) as total_budget,
        SUM(actual_cost) as total_actual_cost,
        AVG(progress) as average_progress
      FROM projects
    `);

    connection.release();

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0]
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch project statistics'
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats
};