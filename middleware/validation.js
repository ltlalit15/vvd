const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: errorMessage
      });
    }
    
    next();
  };
};

// User Validation Schemas
const userSchemas = {
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('Admin', 'ProjectManager', 'Designer', 'ProcurementOfficer', 'Finance', 'Quality', 'Client').required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[+]?[0-9\s\-()]+$/).allow(''),
    address: Joi.string().max(255).allow('')
  })
};

// Project Validation Schemas
const projectSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).allow(''),
    client: Joi.string().min(2).max(100).required(),
    budget: Joi.number().positive().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    status: Joi.string().valid('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled').default('Planning'),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),
    projectManagerId: Joi.number().integer().positive().required(),
    location: Joi.string().max(255).allow('')
  }),
  
  update: Joi.object({
    name: Joi.string().min(3).max(100),
    description: Joi.string().max(1000).allow(''),
    client: Joi.string().min(2).max(100),
    budget: Joi.number().positive(),
    startDate: Joi.date(),
    endDate: Joi.date(),
    status: Joi.string().valid('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
    projectManagerId: Joi.number().integer().positive(),
    progress: Joi.number().min(0).max(100),
    location: Joi.string().max(255).allow('')
  })
};

// RFQ Validation Schemas
const rfqSchemas = {
  create: Joi.object({
    client: Joi.string().min(2).max(100).required(),
    project: Joi.string().min(3).max(100).required(),
    location: Joi.string().min(2).max(100).required(),
    value: Joi.string().required(),
    scopeSummary: Joi.string().max(2000).allow(''),
    contactPerson: Joi.string().max(100).allow(''),
    contactEmail: Joi.string().email().allow(''),
    contactPhone: Joi.string().allow(''),
    deadline: Joi.date().allow(''),
    notes: Joi.string().max(1000).allow('')
  }),
  
  update: Joi.object({
    client: Joi.string().min(2).max(100),
    project: Joi.string().min(3).max(100),
    location: Joi.string().min(2).max(100),
    value: Joi.string(),
    scopeSummary: Joi.string().max(2000).allow(''),
    contactPerson: Joi.string().max(100).allow(''),
    contactEmail: Joi.string().email().allow(''),
    contactPhone: Joi.string().allow(''),
    deadline: Joi.date().allow(''),
    notes: Joi.string().max(1000).allow(''),
    status: Joi.string().valid('Submitted', 'Won', 'Lost')
  })
};

// Task Validation Schemas
const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(1000).allow(''),
    projectId: Joi.number().integer().positive().required(),
    assigneeId: Joi.number().integer().positive().required(),
    startDate: Joi.date().required(),
    dueDate: Joi.date().greater(Joi.ref('startDate')).required(),
    priority: Joi.string().valid('Low', 'Medium', 'High').default('Medium'),
    status: Joi.string().valid('Not Started', 'In Progress', 'Completed', 'On Hold').default('Not Started')
  }),
  
  update: Joi.object({
    title: Joi.string().min(3).max(100),
    description: Joi.string().max(1000).allow(''),
    assigneeId: Joi.number().integer().positive(),
    startDate: Joi.date(),
    dueDate: Joi.date(),
    priority: Joi.string().valid('Low', 'Medium', 'High'),
    status: Joi.string().valid('Not Started', 'In Progress', 'Completed', 'On Hold'),
    progress: Joi.number().min(0).max(100)
  })
};

// Financial Validation Schemas
const financialSchemas = {
  createInvoice: Joi.object({
    projectId: Joi.number().integer().positive().required(),
    invoiceNumber: Joi.string().required(),
    amount: Joi.number().positive().required(),
    dueDate: Joi.date().required(),
    description: Joi.string().max(1000).allow(''),
    items: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        rate: Joi.number().positive().required(),
        amount: Joi.number().positive().required()
      })
    ).min(1).required()
  }),
  
  recordPayment: Joi.object({
    invoiceId: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().required(),
    paymentDate: Joi.date().required(),
    paymentMethod: Joi.string().valid('Bank Transfer', 'Credit Card', 'PayPal', 'Check', 'Cash').required(),
    reference: Joi.string().max(100).allow('')
  })
};

module.exports = {
  validateRequest,
  userSchemas,
  projectSchemas,
  rfqSchemas,
  taskSchemas,
  financialSchemas
};