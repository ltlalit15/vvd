module.exports = (sequelize, DataTypes) => {
  const Contract = sequelize.define('Contract', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contractNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    contractValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    signedDate: {
      type: DataTypes.DATE,
      allowNull: false
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
      type: DataTypes.ENUM('Active', 'Completed', 'Terminated'),
      defaultValue: 'Active'
    },
    clientRepresentative: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentTerms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    terms: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'contracts',
    indexes: [
      {
        unique: true,
        fields: ['contractNumber']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Contract;
};