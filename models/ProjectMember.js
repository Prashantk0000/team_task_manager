const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    allowNull: false,
    defaultValue: 'member',
    validate: {
      isIn: {
        args: [['admin', 'member']],
        msg: 'Role must be either admin or member',
      },
    },
  },
}, {
  tableName: 'project_members',
  indexes: [
    {
      unique: true,
      fields: ['project_id', 'user_id'],
    },
  ],
});

module.exports = ProjectMember;
