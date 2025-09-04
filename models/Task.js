module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    taskNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    assigneeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStartDate(value) {
          if (value <= this.startDate) {
            throw new Error('Due date must be after start date');
          }
        }
      }
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium'
    },
    status: {
      type: DataTypes.ENUM('Not Started', 'In Progress', 'Completed', 'On Hold'),
      defaultValue: 'Not Started'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    actualHours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    }
  }, {
    tableName: 'tasks',
    indexes: [
      {
        unique: true,
        fields: ['taskNumber']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['assigneeId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      }
    ]
  });

  return Task;
};