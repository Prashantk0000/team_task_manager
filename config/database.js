const { Sequelize } = require('sequelize');
const path = require('path');

const dbStorage = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.sqlite');

// Database configuration — SQLite for local/production server
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbStorage,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

let isSynced = false;
async function syncDatabase() {
  if (isSynced) return;

  // Import models to register them
  require('../models/User');
  require('../models/Project');
  require('../models/ProjectMember');
  require('../models/Task');

  // Set up associations
  const { User, Project, ProjectMember, Task } = sequelize.models;

  if (!User.associations.ownedProjects) {
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
  }

  await sequelize.sync();
  isSynced = true;
}

module.exports = { sequelize, syncDatabase };
