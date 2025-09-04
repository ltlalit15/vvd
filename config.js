const mysql = require('mysql2/promise');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vvd_project_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkqcqrrbp',
  api_key: process.env.CLOUDINARY_API_KEY || '418838712271323',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'p12EKWICdyHWx8LcihuWYqIruWQ'
});

// Test Database Connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection established successfully.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

// Initialize Database Schema
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.execute(`USE ${process.env.DB_NAME}`);
    
    // Create Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin', 'ProjectManager', 'Designer', 'ProcurementOfficer', 'Finance', 'Quality', 'Client') DEFAULT 'Client',
        phone VARCHAR(20),
        address TEXT,
        profile_image VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create Projects table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        client VARCHAR(100) NOT NULL,
        budget DECIMAL(15,2) NOT NULL,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled') DEFAULT 'Planning',
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        progress INT DEFAULT 0,
        project_manager_id INT NOT NULL,
        location VARCHAR(255),
        contract_value DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_manager_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // Create RFQs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rfqs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        rfq_number VARCHAR(20) UNIQUE NOT NULL,
        client VARCHAR(100) NOT NULL,
        project VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        value VARCHAR(50) NOT NULL,
        scope_summary TEXT,
        contact_person VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(20),
        deadline DATE,
        notes TEXT,
        status ENUM('Submitted', 'Won', 'Lost') DEFAULT 'Submitted',
        project_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    // Create Contracts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        contract_number VARCHAR(20) UNIQUE NOT NULL,
        project_id INT NOT NULL,
        contract_value DECIMAL(15,2) NOT NULL,
        signed_date DATE NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('Active', 'Completed', 'Terminated') DEFAULT 'Active',
        client_representative TEXT,
        payment_terms TEXT,
        terms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Tasks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_number VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        project_id INT NOT NULL,
        assignee_id INT NOT NULL,
        start_date DATE NOT NULL,
        due_date DATE NOT NULL,
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        status ENUM('Not Started', 'In Progress', 'Completed', 'On Hold') DEFAULT 'Not Started',
        progress INT DEFAULT 0,
        estimated_hours DECIMAL(8,2),
        actual_hours DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // Create Resources table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS resources (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        subcontractor VARCHAR(100),
        rate VARCHAR(20),
        availability ENUM('Full-time', 'Part-time', 'Contract') DEFAULT 'Full-time',
        contact_info VARCHAR(255),
        skills TEXT,
        assigned_tasks INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create Materials table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT PRIMARY KEY AUTO_INCREMENT,
        material_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        project_id INT NOT NULL,
        supplier VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL,
        po_number VARCHAR(20),
        planned_date DATE,
        actual_date DATE,
        status ENUM('Processing', 'Ordered', 'Pending', 'Delivered') DEFAULT 'Processing',
        notes TEXT,
        grn_number VARCHAR(20),
        received_condition ENUM('Good', 'Damaged', 'Partial Delivery', 'Wrong Items'),
        inspected_by VARCHAR(100),
        storage_location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Invoices table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_number VARCHAR(20) UNIQUE NOT NULL,
        project_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('Pending', 'Paid', 'Overdue', 'Cancelled') DEFAULT 'Pending',
        description TEXT,
        grn_reference VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Invoice Items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        rate DECIMAL(10,2) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    // Create Payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payment_id VARCHAR(20) UNIQUE NOT NULL,
        invoice_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method ENUM('Bank Transfer', 'Credit Card', 'PayPal', 'Check', 'Cash') NOT NULL,
        reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    // Create Quality Inspections table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS quality_inspections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        inspection_id VARCHAR(20) UNIQUE NOT NULL,
        task_id INT NOT NULL,
        inspection_date DATE NOT NULL,
        inspector_id INT NOT NULL,
        snags TEXT,
        status ENUM('Open', 'Closed') DEFAULT 'Open',
        hse_issues ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        photos TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // Create Milestones table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS milestones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        planned_date DATE NOT NULL,
        actual_date DATE,
        status ENUM('Not Started', 'In Progress', 'Completed', 'Pending', 'Delayed') DEFAULT 'Not Started',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Risks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS risks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        description TEXT NOT NULL,
        level ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        impact TEXT NOT NULL,
        mitigation_plan TEXT NOT NULL,
        owner VARCHAR(100) NOT NULL,
        status ENUM('Open', 'Monitoring', 'Mitigated', 'Resolved', 'Closed') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Drawings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS drawings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        drawing_id VARCHAR(20) UNIQUE NOT NULL,
        project_id INT NOT NULL,
        stage ENUM('Concept', 'Detailed', 'IFC') NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size VARCHAR(20),
        submission_date DATE NOT NULL,
        status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Draft',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Job Costs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS job_costs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id VARCHAR(20) UNIQUE NOT NULL,
        project_id INT NOT NULL,
        task VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        estimated_labor DECIMAL(15,2) NOT NULL,
        estimated_material DECIMAL(15,2) NOT NULL,
        estimated_overhead DECIMAL(15,2) NOT NULL,
        estimated_total DECIMAL(15,2) NOT NULL,
        actual_labor DECIMAL(15,2) DEFAULT 0,
        actual_material DECIMAL(15,2) DEFAULT 0,
        actual_overhead DECIMAL(15,2) DEFAULT 0,
        actual_total DECIMAL(15,2) DEFAULT 0,
        variance DECIMAL(15,2) DEFAULT 0,
        status ENUM('Estimated', 'In Progress', 'Completed') DEFAULT 'Estimated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Project Closeout table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_closeouts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        project_id INT NOT NULL,
        final_inspection_date DATE,
        snag_list_resolved ENUM('Yes', 'No'),
        as_built_drawings_submitted ENUM('Yes', 'No'),
        handover_date DATE,
        warranty_period INT,
        closure_status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database schema initialized successfully.');
    connection.release();
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error;
  }
};

module.exports = {
  pool,
  cloudinary,
  testConnection,
  initializeDatabase
};