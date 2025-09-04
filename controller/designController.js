const { pool, cloudinary } = require('../config');

// Generate Drawing ID
const generateDrawingId = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM drawings'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `DRW-${String(count).padStart(3, '0')}`;
};

// Upload Drawing
const uploadDrawing = async (req, res) => {
  try {
    const {
      projectId,
      stage,
      notes
    } = req.body;

    if (!req.files || !req.files.drawing) {
      return res.status(400).json({
        status: 'error',
        message: 'Drawing file is required'
      });
    }

    const drawingFile = req.files.drawing;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/dwg', 'application/dxf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(drawingFile.mimetype)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid file type. Only PDF, DWG, DXF, JPEG, and PNG files are allowed'
      });
    }

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

    try {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(drawingFile.tempFilePath, {
        folder: 'vvd/drawings',
        resource_type: 'auto',
        public_id: `drawing_${Date.now()}`
      });

      // Generate drawing ID
      const drawingId = await generateDrawingId();
      const submissionDate = new Date().toISOString().split('T')[0];

      // Insert drawing record
      const [result] = await connection.execute(
        `INSERT INTO drawings (
          drawing_id, project_id, stage, file_name, file_url, file_size, submission_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          drawingId, 
          projectId, 
          stage, 
          drawingFile.name, 
          uploadResult.secure_url, 
          `${(drawingFile.size / 1024 / 1024).toFixed(2)} MB`,
          submissionDate,
          notes
        ]
      );

      // Get created drawing with project details
      const [drawings] = await connection.execute(
        `SELECT d.*, p.name as project_name 
         FROM drawings d 
         LEFT JOIN projects p ON d.project_id = p.id 
         WHERE d.id = ?`,
        [result.insertId]
      );

      connection.release();

      const drawing = drawings[0];

      res.status(201).json({
        status: 'success',
        message: 'Drawing uploaded successfully',
        data: {
          drawing: {
            id: drawing.id,
            drawingId: drawing.drawing_id,
            projectId: drawing.project_id,
            projectName: drawing.project_name,
            stage: drawing.stage,
            fileName: drawing.file_name,
            fileUrl: drawing.file_url,
            fileSize: drawing.file_size,
            submissionDate: drawing.submission_date,
            status: drawing.status,
            notes: drawing.notes,
            createdAt: drawing.created_at
          }
        }
      });
    } catch (cloudinaryError) {
      connection.release();
      console.error('Cloudinary upload error:', cloudinaryError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload file to cloud storage'
      });
    }
  } catch (error) {
    console.error('Upload drawing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload drawing'
    });
  }
};

// Get All Drawings
const getAllDrawings = async (req, res) => {
  try {
    const { page = 1, limit = 10, stage, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT d.*, p.name as project_name 
      FROM drawings d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM drawings WHERE 1=1';
    const params = [];
    const countParams = [];

    // Add stage filter
    if (stage) {
      query += ' AND d.stage = ?';
      countQuery += ' AND stage = ?';
      params.push(stage);
      countParams.push(stage);
    }

    // Add status filter
    if (status) {
      query += ' AND d.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Add project filter
    if (projectId) {
      query += ' AND d.project_id = ?';
      countQuery += ' AND project_id = ?';
      params.push(projectId);
      countParams.push(projectId);
    }

    // Add search filter
    if (search) {
      query += ' AND (d.drawing_id LIKE ? OR d.file_name LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (drawing_id LIKE ? OR file_name LIKE ? OR project_id IN (SELECT id FROM projects WHERE name LIKE ?))';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [drawings] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        drawings: drawings.map(drawing => ({
          id: drawing.id,
          drawingId: drawing.drawing_id,
          projectId: drawing.project_id,
          projectName: drawing.project_name,
          stage: drawing.stage,
          fileName: drawing.file_name,
          fileUrl: drawing.file_url,
          fileSize: drawing.file_size,
          submissionDate: drawing.submission_date,
          status: drawing.status,
          notes: drawing.notes,
          createdAt: drawing.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDrawings: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all drawings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch drawings'
    });
  }
};

// Update Drawing Status
const updateDrawingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const connection = await pool.getConnection();

    // Check if drawing exists
    const [existingDrawings] = await connection.execute(
      'SELECT id FROM drawings WHERE id = ?',
      [id]
    );

    if (existingDrawings.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Drawing not found'
      });
    }

    // Update drawing
    await connection.execute(
      'UPDATE drawings SET status = ?, notes = ? WHERE id = ?',
      [status, notes, id]
    );

    // Get updated drawing
    const [updatedDrawings] = await connection.execute(
      `SELECT d.*, p.name as project_name 
       FROM drawings d 
       LEFT JOIN projects p ON d.project_id = p.id 
       WHERE d.id = ?`,
      [id]
    );

    connection.release();

    const drawing = updatedDrawings[0];

    res.status(200).json({
      status: 'success',
      message: 'Drawing updated successfully',
      data: {
        drawing: {
          id: drawing.id,
          drawingId: drawing.drawing_id,
          projectId: drawing.project_id,
          projectName: drawing.project_name,
          stage: drawing.stage,
          fileName: drawing.file_name,
          fileUrl: drawing.file_url,
          status: drawing.status,
          notes: drawing.notes
        }
      }
    });
  } catch (error) {
    console.error('Update drawing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update drawing'
    });
  }
};

module.exports = {
  uploadDrawing,
  getAllDrawings,
  updateDrawingStatus
};