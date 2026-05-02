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
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(10),
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
});

module.exports = ProjectMember;
