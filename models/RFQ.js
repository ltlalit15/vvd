module.exports = (sequelize, DataTypes) => {
  const RFQ = sequelize.define('RFQ', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rfqNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    client: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    project: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    value: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    scopeSummary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contactPerson: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    contactEmail: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Submitted', 'Won', 'Lost'),
      defaultValue: 'Submitted'
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      }
    }
  }, {
    tableName: 'rfqs',
    indexes: [
      {
        unique: true,
        fields: ['rfqNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['client']
      }
    ]
  });

  return RFQ;
};