const { pool } = require('../config');

// Generate Job ID
const generateJobId = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM job_costs'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `JC-${String(count).padStart(3, '0')}`;
};

// Create Job Cost
const createJobCost = async (req, res) => {
  try {
    const {
      projectId,
      task,
      resource,
      estimatedLabor,
      estimatedMaterial,
      estimatedOverhead
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

    // Generate job ID and calculate total
    const jobId = await generateJobId();
    const estimatedTotal = parseFloat(estimatedLabor) + parseFloat(estimatedMaterial) + parseFloat(estimatedOverhead);

    // Insert new job cost
    const [result] = await connection.execute(
      `INSERT INTO job_costs (
        job_id, project_id, task, resource, estimated_labor, estimated_material, 
        estimated_overhead, estimated_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [jobId, projectId, task, resource, estimatedLabor, estimatedMaterial, estimatedOverhead, estimatedTotal]
    );

    // Get created job cost with project details
    const [jobCosts] = await connection.execute(
      `SELECT jc.*, p.name as project_name 
       FROM job_costs jc 
       LEFT JOIN projects p ON jc.project_id = p.id 
       WHERE jc.id = ?`,
      [result.insertId]
    );

    connection.release();

    const jobCost = jobCosts[0];

    res.status(201).json({
      status: 'success',
      message: 'Job cost created successfully',
      data: {
        jobCost: {
          id: jobCost.id,
          jobId: jobCost.job_id,
          projectId: jobCost.project_id,
          projectName: jobCost.project_name,
          task: jobCost.task,
          resource: jobCost.resource,
          estimatedLabor: jobCost.estimated_labor,
          estimatedMaterial: jobCost.estimated_material,
          estimatedOverhead: jobCost.estimated_overhead,
          estimatedTotal: jobCost.estimated_total,
          actualLabor: jobCost.actual_labor,
          actualMaterial: jobCost.actual_material,
          actualOverhead: jobCost.actual_overhead,
          actualTotal: jobCost.actual_total,
          variance: jobCost.variance,
          status: jobCost.status,
          createdAt: jobCost.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create job cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create job cost'
    });
  }
};

// Get All Job Costs
const getAllJobCosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT jc.*, p.name as project_name 
      FROM job_costs jc 
      LEFT JOIN projects p ON jc.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM job_costs WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add status filter
    if (status) {
      query += ' AND jc.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add project filter
    if (projectId) {
      query += ' AND jc.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    // Add search filter
    if (search) {
      query += ' AND (jc.job_id LIKE ? OR jc.task LIKE ? OR jc.resource LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (job_id LIKE ? OR task LIKE ? OR resource LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY jc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [jobCosts] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobCosts: jobCosts.map(jobCost => ({
          id: jobCost.id,
          jobId: jobCost.job_id,
          projectId: jobCost.project_id,
          projectName: jobCost.project_name,
          task: jobCost.task,
          resource: jobCost.resource,
          estimatedLabor: jobCost.estimated_labor,
          estimatedMaterial: jobCost.estimated_material,
          estimatedOverhead: jobCost.estimated_overhead,
          estimatedTotal: jobCost.estimated_total,
          actualLabor: jobCost.actual_labor,
          actualMaterial: jobCost.actual_material,
          actualOverhead: jobCost.actual_overhead,
          actualTotal: jobCost.actual_total,
          variance: jobCost.variance,
          status: jobCost.status,
          createdAt: jobCost.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalJobCosts: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all job costs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job costs'
    });
  }
};

// Update Job Cost
const updateJobCost = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if job cost exists
    const [existingJobCosts] = await connection.execute(
      'SELECT id FROM job_costs WHERE id = ?',
      [id]
    );

    if (existingJobCosts.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Job cost not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'task', 'resource', 'estimated_labor', 'estimated_material', 'estimated_overhead',
      'actual_labor', 'actual_material', 'actual_overhead', 'status'
    ];

    Object.keys(updateData).forEach(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    // Recalculate totals if any cost fields are updated
    if (updateData.estimatedLabor || updateData.estimatedMaterial || updateData.estimatedOverhead) {
      const [currentJobCost] = await connection.execute(
        'SELECT estimated_labor, estimated_material, estimated_overhead FROM job_costs WHERE id = ?',
        [id]
      );
      
      const current = currentJobCost[0];
      const newEstimatedLabor = updateData.estimatedLabor || current.estimated_labor;
      const newEstimatedMaterial = updateData.estimatedMaterial || current.estimated_material;
      const newEstimatedOverhead = updateData.estimatedOverhead || current.estimated_overhead;
      const newEstimatedTotal = parseFloat(newEstimatedLabor) + parseFloat(newEstimatedMaterial) + parseFloat(newEstimatedOverhead);
      
      updateFields.push('estimated_total = ?');
      updateValues.push(newEstimatedTotal);
    }

    if (updateData.actualLabor || updateData.actualMaterial || updateData.actualOverhead) {
      const [currentJobCost] = await connection.execute(
        'SELECT actual_labor, actual_material, actual_overhead, estimated_total FROM job_costs WHERE id = ?',
        [id]
      );
      
      const current = currentJobCost[0];
      const newActualLabor = updateData.actualLabor || current.actual_labor;
      const newActualMaterial = updateData.actualMaterial || current.actual_material;
      const newActualOverhead = updateData.actualOverhead || current.actual_overhead;
      const newActualTotal = parseFloat(newActualLabor) + parseFloat(newActualMaterial) + parseFloat(newActualOverhead);
      const newVariance = parseFloat(current.estimated_total) - newActualTotal;
      
      updateFields.push('actual_total = ?', 'variance = ?');
      updateValues.push(newActualTotal, newVariance);
    }

    if (updateFields.length === 0) {
      connection.release();
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    updateValues.push(id);

    await connection.execute(
      `UPDATE job_costs SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated job cost
    const [updatedJobCosts] = await connection.execute(
      `SELECT jc.*, p.name as project_name 
       FROM job_costs jc 
       LEFT JOIN projects p ON jc.project_id = p.id 
       WHERE jc.id = ?`,
      [id]
    );

    connection.release();

    const jobCost = updatedJobCosts[0];

    res.status(200).json({
      status: 'success',
      message: 'Job cost updated successfully',
      data: {
        jobCost: {
          id: jobCost.id,
          jobId: jobCost.job_id,
          projectId: jobCost.project_id,
          projectName: jobCost.project_name,
          task: jobCost.task,
          resource: jobCost.resource,
          estimatedLabor: jobCost.estimated_labor,
          estimatedMaterial: jobCost.estimated_material,
          estimatedOverhead: jobCost.estimated_overhead,
          estimatedTotal: jobCost.estimated_total,
          actualLabor: jobCost.actual_labor,
          actualMaterial: jobCost.actual_material,
          actualOverhead: jobCost.actual_overhead,
          actualTotal: jobCost.actual_total,
          variance: jobCost.variance,
          status: jobCost.status
        }
      }
    });
  } catch (error) {
    console.error('Update job cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update job cost'
    });
  }
};

module.exports = {
  createJobCost,
  getAllJobCosts,
  updateJobCost
};