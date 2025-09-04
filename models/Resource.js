module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define('Resource', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subcontractor: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    rate: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    availability: {
      type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract'),
      defaultValue: 'Full-time'
    },
    contactInfo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assignedTasks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'resources',
    indexes: [
      {
        fields: ['role']
      },
      {
        fields: ['availability']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return Resource;
};