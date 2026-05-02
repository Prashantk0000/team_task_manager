const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(300),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Task title is required' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'todo',
    validate: {
      isIn: {
        args: [['todo', 'in-progress', 'done']],
        msg: 'Status must be todo, in-progress, or done',
      },
    },
  },
  priority: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['low', 'medium', 'high']],
        msg: 'Priority must be low, medium, or high',
      },
    },
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'tasks',
});

module.exports = Task;
