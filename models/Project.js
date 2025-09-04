module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
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
    client: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    budget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    actualCost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStartDate(value) {
          if (value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'),
      defaultValue: 'Planning'
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      defaultValue: 'Medium'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    projectManagerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    contractValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    }
  }, {
    tableName: 'projects',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['projectManagerId']
      },
      {
        fields: ['client']
      }
    ]
  });

  return Project;
};