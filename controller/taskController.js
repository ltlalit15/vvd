const { pool } = require('../config');

// Generate Task Number
const generateTaskNumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM tasks'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `TSK-${String(count).padStart(3, '0')}`;
};

// Create Task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      assigneeId,
      startDate,
      dueDate,
      priority = 'Medium',
      status = 'Not Started',
      estimatedHours
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

    // Check if assignee exists
    const [assignees] = await connection.execute(
      'SELECT id, first_name, last_name FROM users WHERE id = ?',
      [assigneeId]
    );

    if (assignees.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Assignee not found'
      });
    }

    // Generate task number
    const taskNumber = await generateTaskNumber();

    // Insert new task
    const [result] = await connection.execute(
      `INSERT INTO tasks (
        task_number, title, description, project_id, assignee_id, start_date, due_date,
        priority, status, estimated_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskNumber, title, description, projectId, assigneeId, startDate, dueDate, priority, status, estimatedHours]
    );

    // Get created task with related data
    const [tasks] = await connection.execute(
      `SELECT t.*, p.name as project_name, u.first_name, u.last_name 
       FROM tasks t 
       LEFT JOIN projects p ON t.project_id = p.id 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.id = ?`,
      [result.insertId]
    );

    connection.release();

    const task = tasks[0];

    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: {
        task: {
          id: task.id,
          taskNumber: task.task_number,
          title: task.title,
          description: task.description,
          projectId: task.project_id,
          projectName: task.project_name,
          assignee: {
            id: task.assignee_id,
            firstName: task.first_name,
            lastName: task.last_name
          },
          startDate: task.start_date,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          progress: task.progress,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          createdAt: task.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create task'
    });
  }
};

// Get All Tasks
const getAllTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, projectId, assigneeId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT t.*, p.name as project_name, u.first_name, u.last_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      LEFT JOIN users u ON t.assignee_id = u.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add filters
    if (status) {
      query += ' AND t.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (priority) {
      query += ' AND t.priority = ?';
      countQuery += ' AND priority = ?';
      params.push(priority);
      countParams.push(priority);
    }

    if (projectId) {
      query += ' AND t.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    if (assigneeId) {
      query += ' AND t.assignee_id = ?';
      countQuery += ' AND assignee_id = ?';
      params.push(assigneeId);
      countParams.push(assigneeId);
    }

    if (search) {
      query += ' AND (t.title LIKE ? OR t.task_number LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (title LIKE ? OR task_number LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [tasks] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        tasks: tasks.map(task => ({
          id: task.id,
          taskNumber: task.task_number,
          title: task.title,
          description: task.description,
          projectId: task.project_id,
          projectName: task.project_name,
          assignee: {
            id: task.assignee_id,
            firstName: task.first_name,
            lastName: task.last_name
          },
          startDate: task.start_date,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          progress: task.progress,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          createdAt: task.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTasks: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tasks'
    });
  }
};

// Get Task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    const [tasks] = await connection.execute(
      `SELECT t.*, p.name as project_name, u.first_name, u.last_name 
       FROM tasks t 
       LEFT JOIN projects p ON t.project_id = p.id 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.id = ?`,
      [id]
    );

    connection.release();

    if (tasks.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const task = tasks[0];

    res.status(200).json({
      status: 'success',
      data: {
        task: {
          id: task.id,
          taskNumber: task.task_number,
          title: task.title,
          description: task.description,
          projectId: task.project_id,
          projectName: task.project_name,
          assignee: {
            id: task.assignee_id,
            firstName: task.first_name,
            lastName: task.last_name
          },
          startDate: task.start_date,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          progress: task.progress,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          createdAt: task.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch task'
    });
  }
};

// Update Task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if task exists
    const [existingTasks] = await connection.execute(
      'SELECT id FROM tasks WHERE id = ?',
      [id]
    );

    if (existingTasks.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'title', 'description', 'assignee_id', 'start_date', 'due_date',
      'priority', 'status', 'progress', 'estimated_hours', 'actual_hours'
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
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated task
    const [updatedTasks] = await connection.execute(
      `SELECT t.*, p.name as project_name, u.first_name, u.last_name 
       FROM tasks t 
       LEFT JOIN projects p ON t.project_id = p.id 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.id = ?`,
      [id]
    );

    connection.release();

    const task = updatedTasks[0];

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: {
        task: {
          id: task.id,
          taskNumber: task.task_number,
          title: task.title,
          description: task.description,
          projectId: task.project_id,
          projectName: task.project_name,
          assignee: {
            id: task.assignee_id,
            firstName: task.first_name,
            lastName: task.last_name
          },
          startDate: task.start_date,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          progress: task.progress,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours
        }
      }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update task'
    });
  }
};

// Delete Task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if task exists
    const [existingTasks] = await connection.execute(
      'SELECT id FROM tasks WHERE id = ?',
      [id]
    );

    if (existingTasks.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Delete task
    await connection.execute(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );

    connection.release();

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete task'
    });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask
};