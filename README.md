# VVD Project Management System - Backend

A comprehensive Node.js + Express + MySQL backend for the VVD Project Management System.

## 🚀 Features

- **Complete CRUD Operations** for all modules
- **JWT Authentication** with role-based access control
- **MySQL Database** with optimized schema
- **File Upload** using Cloudinary
- **Input Validation** using Joi
- **Error Handling** with custom middleware
- **Rate Limiting** for API security
- **Comprehensive API Documentation**

## 📁 Project Structure

```
├── controller/          # API logic files
├── middleware/          # Authentication, validation, error handling
├── routes/             # API route definitions
├── upload/             # File upload handling
├── config.js           # Database and app configuration
├── index.js            # Main entry point
├── .env                # Environment variables
└── README.md           # Documentation
```

## 🛠️ Installation & Setup

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
Update the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vvd_project_management
JWT_SECRET=your_super_secret_jwt_key
```

3. **Database Setup**
The application will automatically create the database and tables on first run.

4. **Start the Server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📊 Database Schema

### Core Tables
- **users** - User management with role-based access
- **projects** - Project information and tracking
- **rfqs** - Request for Quotations management
- **contracts** - Contract management and tracking
- **tasks** - Task assignment and progress tracking
- **resources** - Resource allocation and management

### Specialized Tables
- **materials** - Procurement and material tracking
- **invoices** - Financial invoice management
- **invoice_items** - Detailed invoice line items
- **payments** - Payment tracking and records
- **quality_inspections** - Quality and HSE inspections
- **milestones** - Project milestone tracking
- **risks** - Risk register and management
- **drawings** - Design document management
- **job_costs** - Job cost tracking and analysis
- **project_closeouts** - Project completion tracking

## 🔐 Authentication & Authorization

### User Roles
- **Admin** - Full system access
- **ProjectManager** - Project and team management
- **Designer** - Design and drawing management
- **ProcurementOfficer** - Procurement and material management
- **Finance** - Financial operations
- **Quality** - Quality and HSE management
- **Client** - Limited read access to assigned projects

### JWT Token Usage
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/stats` - Get project statistics

### RFQs
- `GET /api/rfqs` - Get all RFQs
- `GET /api/rfqs/:id` - Get RFQ by ID
- `POST /api/rfqs` - Create new RFQ
- `PUT /api/rfqs/:id` - Update RFQ
- `DELETE /api/rfqs/:id` - Delete RFQ

### Contracts
- `GET /api/contracts` - Get all contracts
- `GET /api/contracts/:id` - Get contract by ID
- `POST /api/contracts` - Create new contract
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Resources
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id` - Get resource by ID
- `POST /api/resources` - Create new resource
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

### Procurement
- `GET /api/procurement/materials` - Get all materials
- `POST /api/procurement/materials` - Create new material
- `PUT /api/procurement/materials/:id` - Update material
- `POST /api/procurement/materials/:id/grn` - Generate GRN

### Financials
- `GET /api/financials/summary` - Get financial summary
- `GET /api/financials/invoices` - Get all invoices
- `POST /api/financials/invoices` - Create new invoice
- `POST /api/financials/payments` - Record payment

### Quality & HSE
- `GET /api/quality/inspections` - Get all inspections
- `POST /api/quality/inspections` - Create new inspection
- `PUT /api/quality/inspections/:id` - Update inspection

### Milestones
- `GET /api/milestones` - Get all milestones
- `POST /api/milestones` - Create new milestone
- `PUT /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone

### Risks
- `GET /api/risks` - Get all risks
- `POST /api/risks` - Create new risk
- `PUT /api/risks/:id` - Update risk
- `DELETE /api/risks/:id` - Delete risk

### Design Management
- `GET /api/designs/drawings` - Get all drawings
- `POST /api/designs/drawings/upload` - Upload drawing
- `PUT /api/designs/drawings/:id/status` - Update drawing status

### Job Costs
- `GET /api/job-costs` - Get all job costs
- `POST /api/job-costs` - Create new job cost
- `PUT /api/job-costs/:id` - Update job cost

### Project Closeout
- `GET /api/closeouts` - Get all closeouts
- `POST /api/closeouts` - Create new closeout
- `PUT /api/closeouts/:id` - Update closeout

### Reports
- `GET /api/reports/project-summary` - Generate project summary report
- `GET /api/reports/financial` - Generate financial report
- `GET /api/reports/task-progress` - Generate task progress report
- `GET /api/reports/quality` - Generate quality & HSE report

## 📋 Postman Collection

Import the `VVD_API_Collection.postman_collection.json` file into Postman to test all API endpoints.

### Collection Features
- Pre-configured environment variables
- Automatic token management
- Sample request bodies for all endpoints
- Organized by functional modules

## 🔧 Configuration

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vvd_project_management

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=dkqcqrrbp
CLOUDINARY_API_KEY=418838712271323
CLOUDINARY_API_SECRET=p12EKWICdyHWx8LcihuWYqIruWQ

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
```

## 🛡️ Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** to prevent API abuse
- **Input Validation** using Joi schemas
- **SQL Injection Protection** using parameterized queries
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers

## 📈 Performance Features

- **Connection Pooling** for database efficiency
- **Compression** middleware for response optimization
- **Pagination** for large data sets
- **Indexed Database** queries for fast retrieval
- **Error Logging** for debugging and monitoring

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "details": "Additional error details (in development mode)"
}
```

## 🚀 Deployment

1. Set production environment variables
2. Update database configuration for production
3. Set `NODE_ENV=production`
4. Use PM2 or similar process manager for production deployment

## 📞 Support

For technical support or questions about the API, please contact the development team.

---

**VVD Project Management System Backend v1.0.0**