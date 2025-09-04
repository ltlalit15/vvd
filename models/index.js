const { sequelize } = require('../config');
const { DataTypes } = require('sequelize');

// Import all models
const User = require('./User')(sequelize, DataTypes);
const Project = require('./Project')(sequelize, DataTypes);
const RFQ = require('./RFQ')(sequelize, DataTypes);
const Contract = require('./Contract')(sequelize, DataTypes);
const Task = require('./Task')(sequelize, DataTypes);
const Resource = require('./Resource')(sequelize, DataTypes);
const Material = require('./Material')(sequelize, DataTypes);
const Invoice = require('./Invoice')(sequelize, DataTypes);
const InvoiceItem = require('./InvoiceItem')(sequelize, DataTypes);
const Payment = require('./Payment')(sequelize, DataTypes);
const QualityInspection = require('./QualityInspection')(sequelize, DataTypes);
const Milestone = require('./Milestone')(sequelize, DataTypes);
const Risk = require('./Risk')(sequelize, DataTypes);
const Drawing = require('./Drawing')(sequelize, DataTypes);
const JobCost = require('./JobCost')(sequelize, DataTypes);

// Define Associations
const defineAssociations = () => {
  // User Associations
  User.hasMany(Project, { foreignKey: 'projectManagerId', as: 'managedProjects' });
  User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });
  User.hasMany(QualityInspection, { foreignKey: 'inspectorId', as: 'inspections' });

  // Project Associations
  Project.belongsTo(User, { foreignKey: 'projectManagerId', as: 'projectManager' });
  Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
  Project.hasMany(Contract, { foreignKey: 'projectId', as: 'contracts' });
  Project.hasMany(Material, { foreignKey: 'projectId', as: 'materials' });
  Project.hasMany(Invoice, { foreignKey: 'projectId', as: 'invoices' });
  Project.hasMany(Milestone, { foreignKey: 'projectId', as: 'milestones' });
  Project.hasMany(Risk, { foreignKey: 'projectId', as: 'risks' });
  Project.hasMany(Drawing, { foreignKey: 'projectId', as: 'drawings' });
  Project.hasMany(JobCost, { foreignKey: 'projectId', as: 'jobCosts' });
  Project.hasOne(RFQ, { foreignKey: 'projectId', as: 'rfq' });

  // RFQ Associations
  RFQ.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Contract Associations
  Contract.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Task Associations
  Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
  Task.hasMany(QualityInspection, { foreignKey: 'taskId', as: 'inspections' });

  // Material Associations
  Material.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Invoice Associations
  Invoice.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
  Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });

  // Invoice Item Associations
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  // Payment Associations
  Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  // Quality Inspection Associations
  QualityInspection.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  QualityInspection.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });

  // Milestone Associations
  Milestone.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Risk Associations
  Risk.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Drawing Associations
  Drawing.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

  // Job Cost Associations
  JobCost.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
};

defineAssociations();

module.exports = {
  sequelize,
  User,
  Project,
  RFQ,
  Contract,
  Task,
  Resource,
  Material,
  Invoice,
  InvoiceItem,
  Payment,
  QualityInspection,
  Milestone,
  Risk,
  Drawing,
  JobCost
};