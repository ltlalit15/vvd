const { pool } = require('../config');

// Generate Material ID
const generateMaterialId = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM materials'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `MAT-${String(count).padStart(3, '0')}`;
};

// Generate PO Number
const generatePONumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM materials WHERE po_number IS NOT NULL'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `PO-${String(count).padStart(3, '0')}`;
};

// Generate GRN Number
const generateGRNNumber = async () => {
  const connection = await pool.getConnection();
  const [result] = await connection.execute(
    'SELECT COUNT(*) as count FROM materials WHERE grn_number IS NOT NULL'
  );
  connection.release();
  
  const count = result[0].count + 1;
  return `GRN-${String(count).padStart(3, '0')}`;
};

// Create Material
const createMaterial = async (req, res) => {
  try {
    const {
      name,
      projectId,
      supplier,
      quantity,
      unitCost,
      plannedDate,
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

    // Generate material ID and PO number
    const materialId = await generateMaterialId();
    const poNumber = await generatePONumber();
    const totalCost = quantity * unitCost;

    // Insert new material
    const [result] = await connection.execute(
      `INSERT INTO materials (
        material_id, name, project_id, supplier, quantity, unit_cost, total_cost,
        po_number, planned_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [materialId, name, projectId, supplier, quantity, unitCost, totalCost, poNumber, plannedDate, notes]
    );

    // Get created material with project details
    const [materials] = await connection.execute(
      `SELECT m.*, p.name as project_name 
       FROM materials m 
       LEFT JOIN projects p ON m.project_id = p.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    connection.release();

    const material = materials[0];

    res.status(201).json({
      status: 'success',
      message: 'Material created successfully',
      data: {
        material: {
          id: material.id,
          materialId: material.material_id,
          name: material.name,
          projectId: material.project_id,
          projectName: material.project_name,
          supplier: material.supplier,
          quantity: material.quantity,
          unitCost: material.unit_cost,
          totalCost: material.total_cost,
          poNumber: material.po_number,
          plannedDate: material.planned_date,
          actualDate: material.actual_date,
          status: material.status,
          notes: material.notes,
          createdAt: material.created_at
        }
      }
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create material'
    });
  }
};

// Get All Materials
const getAllMaterials = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, search } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = `
      SELECT m.*, p.name as project_name 
      FROM materials m 
      LEFT JOIN projects p ON m.project_id = p.id 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM materials WHERE 1=1';
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
      query += ' AND (m.name LIKE ? OR m.material_id LIKE ? OR m.supplier LIKE ? OR m.po_number LIKE ?)';
      countQuery += ' AND (name LIKE ? OR material_id LIKE ? OR supplier LIKE ? OR po_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [materials] = await connection.execute(query, params);
    const [countResult] = await connection.execute(countQuery, countParams);

    connection.release();

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        materials: materials.map(material => ({
          id: material.id,
          materialId: material.material_id,
          name: material.name,
          projectId: material.project_id,
          projectName: material.project_name,
          supplier: material.supplier,
          quantity: material.quantity,
          unitCost: material.unit_cost,
          totalCost: material.total_cost,
          poNumber: material.po_number,
          plannedDate: material.planned_date,
          actualDate: material.actual_date,
          status: material.status,
          notes: material.notes,
          grnNumber: material.grn_number,
          receivedCondition: material.received_condition,
          inspectedBy: material.inspected_by,
          storageLocation: material.storage_location,
          createdAt: material.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMaterials: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all materials error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch materials'
    });
  }
};

// Update Material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const connection = await pool.getConnection();

    // Check if material exists
    const [existingMaterials] = await connection.execute(
      'SELECT id FROM materials WHERE id = ?',
      [id]
    );

    if (existingMaterials.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'supplier', 'quantity', 'unit_cost', 'total_cost', 'planned_date',
      'actual_date', 'status', 'notes', 'grn_number', 'received_condition',
      'inspected_by', 'storage_location'
    ];

    Object.keys(updateData).forEach(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    // Recalculate total cost if quantity or unit cost is updated
    if (updateData.quantity || updateData.unitCost) {
      const [currentMaterial] = await connection.execute(
        'SELECT quantity, unit_cost FROM materials WHERE id = ?',
        [id]
      );
      
      const newQuantity = updateData.quantity || currentMaterial[0].quantity;
      const newUnitCost = updateData.unitCost || currentMaterial[0].unit_cost;
      const newTotalCost = newQuantity * newUnitCost;
      
      updateFields.push('total_cost = ?');
      updateValues.push(newTotalCost);
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
      `UPDATE materials SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated material
    const [updatedMaterials] = await connection.execute(
      `SELECT m.*, p.name as project_name 
       FROM materials m 
       LEFT JOIN projects p ON m.project_id = p.id 
       WHERE m.id = ?`,
      [id]
    );

    connection.release();

    const material = updatedMaterials[0];

    res.status(200).json({
      status: 'success',
      message: 'Material updated successfully',
      data: {
        material: {
          id: material.id,
          materialId: material.material_id,
          name: material.name,
          projectId: material.project_id,
          projectName: material.project_name,
          supplier: material.supplier,
          quantity: material.quantity,
          unitCost: material.unit_cost,
          totalCost: material.total_cost,
          poNumber: material.po_number,
          plannedDate: material.planned_date,
          actualDate: material.actual_date,
          status: material.status,
          notes: material.notes,
          grnNumber: material.grn_number,
          receivedCondition: material.received_condition,
          inspectedBy: material.inspected_by,
          storageLocation: material.storage_location
        }
      }
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update material'
    });
  }
};

// Generate GRN
const generateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      receivedQuantity,
      receivedCondition,
      inspectedBy,
      storageLocation,
      notes
    } = req.body;

    const connection = await pool.getConnection();

    // Check if material exists
    const [materials] = await connection.execute(
      'SELECT * FROM materials WHERE id = ?',
      [id]
    );

    if (materials.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'error',
        message: 'Material not found'
      });
    }

    // Generate GRN number
    const grnNumber = await generateGRNNumber();

    // Update material with GRN details
    await connection.execute(
      `UPDATE materials SET 
        grn_number = ?, quantity = ?, received_condition = ?, 
        inspected_by = ?, storage_location = ?, notes = ?, 
        actual_date = CURDATE(), status = 'Delivered'
       WHERE id = ?`,
      [grnNumber, receivedQuantity, receivedCondition, inspectedBy, storageLocation, notes, id]
    );

    // Get updated material
    const [updatedMaterials] = await connection.execute(
      `SELECT m.*, p.name as project_name 
       FROM materials m 
       LEFT JOIN projects p ON m.project_id = p.id 
       WHERE m.id = ?`,
      [id]
    );

    connection.release();

    const material = updatedMaterials[0];

    res.status(200).json({
      status: 'success',
      message: 'GRN generated successfully',
      data: {
        material: {
          id: material.id,
          materialId: material.material_id,
          name: material.name,
          projectName: material.project_name,
          grnNumber: material.grn_number,
          receivedCondition: material.received_condition,
          inspectedBy: material.inspected_by,
          storageLocation: material.storage_location,
          actualDate: material.actual_date,
          status: material.status
        }
      }
    });
  } catch (error) {
    console.error('Generate GRN error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate GRN'
    });
  }
};

module.exports = {
  createMaterial,
  getAllMaterials,
  updateMaterial,
  generateGRN
};