const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

// All project routes require authentication
router.use(authenticate);

// GET /api/projects — list user's projects
router.get('/', async (req, res) => {
  try {
    // Find all projects where user is a member
    const memberships = await ProjectMember.findAll({
      where: { user_id: req.userId },
      attributes: ['project_id', 'role'],
    });

    const projectIds = memberships.map(m => m.project_id);
    const roleMap = {};
    memberships.forEach(m => { roleMap[m.project_id] = m.role; });

    const projects = await Project.findAll({
      where: { id: { [Op.in]: projectIds } },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: ProjectMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
        { model: Task, as: 'tasks', attributes: ['id', 'status'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const projectsWithRole = projects.map(p => ({
      ...p.toJSON(),
      userRole: roleMap[p.id],
    }));

    res.json({ projects: projectsWithRole });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /api/projects — create a new project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const cleanName = name.trim();
    const cleanDesc = typeof description === 'string' ? description.trim() : '';

    const project = await Project.create({
      name: cleanName,
      description: cleanDesc,
      created_by: req.userId,
    });

    // Creator automatically becomes admin
    await ProjectMember.create({
      project_id: project.id,
      user_id: req.userId,
      role: 'admin',
    });

    // Fetch full project with associations
    const fullProject = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: ProjectMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
      ],
    });

    res.status(201).json({
      message: 'Project created successfully!',
      project: { ...fullProject.toJSON(), userRole: 'admin' },
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// GET /api/projects/:id — get single project
router.get('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const project = await Project.findByPk(projectId, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: ProjectMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
        { model: Task, as: 'tasks', include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
        ]},
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check if user is a member
    const membership = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    res.json({
      project: { ...project.toJSON(), userRole: membership.role },
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// PUT /api/projects/:id — update project (admin only)
router.put('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check admin role
    const membership = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId, role: 'admin' },
    });
    if (!membership) {
      return res.status(403).json({ error: 'Only admins can update the project.' });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Project name cannot be empty.' });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = typeof description === 'string' ? description.trim() : '';
    }

    await project.save();

    res.json({ message: 'Project updated successfully!', project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id — delete project (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const membership = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId, role: 'admin' },
    });
    if (!membership) {
      return res.status(403).json({ error: 'Only admins can delete the project.' });
    }

    // Delete all tasks, members, then the project
    await Task.destroy({ where: { project_id: project.id } });
    await ProjectMember.destroy({ where: { project_id: project.id } });
    await project.destroy();

    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/members — add member (admin only)
router.post('/:id/members', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check admin role
    const adminCheck = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId, role: 'admin' },
    });
    if (!adminCheck) {
      return res.status(403).json({ error: 'Only admins can add members.' });
    }

    const { email, role } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'User email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ error: 'No user found with that email.' });
    }

    // Check if already a member
    const existing = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: user.id },
    });
    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this project.' });
    }

    const newRole = role === 'admin' ? 'admin' : 'member';
    const member = await ProjectMember.create({
      project_id: project.id,
      user_id: user.id,
      role: newRole,
    });

    res.status(201).json({
      message: `${user.name} added as ${member.role}!`,
      member: {
        ...member.toJSON(),
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// PUT /api/projects/:id/members/:userId — update member role (admin only)
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(projectId) || isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid parameters.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check admin role
    const adminCheck = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId, role: 'admin' },
    });
    if (!adminCheck) {
      return res.status(403).json({ error: 'Only admins can update member roles.' });
    }

    const member = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: targetUserId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found in this project.' });
    }

    const { role } = req.body;
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or member.' });
    }

    // Prevent demoting the only admin
    if (member.role === 'admin' && role === 'member') {
      const adminCount = await ProjectMember.count({
        where: { project_id: project.id, role: 'admin' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the only admin.' });
      }
    }

    member.role = role;
    await member.save();

    res.json({ message: `Role updated to ${role}.`, member });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member (admin only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(projectId) || isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid parameters.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check admin role
    const adminCheck = await ProjectMember.findOne({
      where: { project_id: project.id, user_id: req.userId, role: 'admin' },
    });
    if (!adminCheck) {
      return res.status(403).json({ error: 'Only admins can remove members.' });
    }

    // Cannot remove yourself if you're the only admin
    if (targetUserId === req.userId) {
      const adminCount = await ProjectMember.count({
        where: { project_id: project.id, role: 'admin' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the only admin. Transfer admin role first.' });
      }
    }

    // Creator protection
    if (targetUserId === project.created_by && req.userId !== project.created_by) {
      return res.status(403).json({ error: 'Project creator cannot be removed by another admin.' });
    }

    const deleted = await ProjectMember.destroy({
      where: { project_id: project.id, user_id: targetUserId },
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Member not found in this project.' });
    }

    // Also unassign their tasks in this project
    await Task.update(
      { assigned_to: null },
      { where: { project_id: project.id, assigned_to: targetUserId } }
    );

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

module.exports = router;
