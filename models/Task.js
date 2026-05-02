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
      len: { args: [2, 300], msg: 'Title must be between 2 and 300 characters' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('todo', 'in-progress', 'done'),
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
    type: DataTypes.ENUM('low', 'medium', 'high'),
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
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'tasks',
});

module.exports = Task;
