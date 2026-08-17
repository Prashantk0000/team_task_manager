const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

let dbStorage;
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  dbStorage = path.join('/tmp', 'database.sqlite');
  const seedDb = path.join(__dirname, '..', 'database.sqlite');
  if (!fs.existsSync(dbStorage) && fs.existsSync(seedDb)) {
    try {
      fs.copyFileSync(seedDb, dbStorage);
    } catch (e) {
      console.warn('Could not copy seed database to /tmp:', e.message);
    }
  }
} else {
  dbStorage = path.join(__dirname, '..', 'database.sqlite');
}

// Database configuration — SQLite for local, can be swapped to PostgreSQL for production
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbStorage,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function syncDatabase() {
  // Import models to register them
  require('../models/User');
  require('../models/Project');
  require('../models/ProjectMember');
  require('../models/Task');

  // Set up associations
  const { User, Project, ProjectMember, Task } = sequelize.models;

  // User <-> Project (creator)
  User.hasMany(Project, { foreignKey: 'created_by', as: 'ownedProjects' });
  Project.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // Project <-> User (many-to-many through ProjectMember)
  Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'members' });
  ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
  User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'memberships' });
  ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Project <-> Task
  Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
  Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

  // User <-> Task (assigned)
  User.hasMany(Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
  Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

  // User <-> Task (creator)
  User.hasMany(Task, { foreignKey: 'created_by', as: 'createdTasks' });
  Task.belongsTo(User, { foreignKey: 'created_by', as: 'taskCreator' });

  await sequelize.sync();
}

module.exports = { sequelize, syncDatabase };
