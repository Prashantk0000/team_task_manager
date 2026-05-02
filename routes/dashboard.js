const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard — get dashboard statistics
router.get('/', async (req, res) => {
  try {
    // Get all projects the user is part of
    const memberships = await ProjectMember.findAll({
      where: { user_id: req.userId },
    });

    const projectIds = memberships.map(m => m.project_id);

    // If user has no projects, return empty stats
    if (projectIds.length === 0) {
      return res.json({
        stats: { totalTasks: 0, todoCount: 0, inProgressCount: 0, doneCount: 0, overdueCount: 0, totalProjects: 0, myTasks: 0, myPendingTasks: 0 },
        tasksPerUser: [], recentTasks: [], overdueTasks: [],
      });
    }

    // Total tasks across user's projects
    const totalTasks = await Task.count({
      where: { project_id: { [Op.in]: projectIds } },
    });

    // Tasks by status
    const todoCount = await Task.count({
      where: { project_id: { [Op.in]: projectIds }, status: 'todo' },
    });
    const inProgressCount = await Task.count({
      where: { project_id: { [Op.in]: projectIds }, status: 'in-progress' },
    });
    const doneCount = await Task.count({
      where: { project_id: { [Op.in]: projectIds }, status: 'done' },
    });

    // Overdue tasks (due date is in the past and not done)
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = await Task.count({
      where: {
        project_id: { [Op.in]: projectIds },
        due_date: { [Op.lt]: today },
        status: { [Op.ne]: 'done' },
      },
    });

    // Tasks assigned to current user
    const myTasks = await Task.count({
      where: {
        project_id: { [Op.in]: projectIds },
        assigned_to: req.userId,
      },
    });

    const myPendingTasks = await Task.count({
      where: {
        project_id: { [Op.in]: projectIds },
        assigned_to: req.userId,
        status: { [Op.ne]: 'done' },
      },
    });

    // Tasks per user (across user's projects)
    const tasksPerUser = await Task.findAll({
      where: {
        project_id: { [Op.in]: projectIds },
        assigned_to: { [Op.ne]: null },
      },
      attributes: [
        'assigned_to',
        [sequelize.fn('COUNT', sequelize.col('Task.id')), 'task_count'],
      ],
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
      ],
      group: ['assigned_to', 'assignee.id'],
      raw: false,
    });

    // Recent tasks
    const recentTasks = await Task.findAll({
      where: { project_id: { [Op.in]: projectIds } },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [['updated_at', 'DESC']],
      limit: 10,
    });

    // Overdue tasks list
    const overdueTasks = await Task.findAll({
      where: {
        project_id: { [Op.in]: projectIds },
        due_date: { [Op.lt]: today },
        status: { [Op.ne]: 'done' },
      },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [['due_date', 'ASC']],
      limit: 10,
    });

    res.json({
      stats: {
        totalTasks,
        todoCount,
        inProgressCount,
        doneCount,
        overdueCount,
        totalProjects: projectIds.length,
        myTasks,
        myPendingTasks,
      },
      tasksPerUser: tasksPerUser.map(t => ({
        user: t.assignee,
        taskCount: t.get('task_count'),
      })),
      recentTasks,
      overdueTasks,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
