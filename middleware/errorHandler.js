const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = {
      statusCode: 400,
      message: `Validation Error: ${message}`
    };
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = {
      statusCode: 400,
      message
    };
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference to related resource';
    error = {
      statusCode: 400,
      message
    };
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      statusCode: 401,
      message
    };
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      statusCode: 401,
      message
    };
  }

  // Sequelize Database Connection Error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection error';
    error = {
      statusCode: 500,
      message
    };
  }

  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;