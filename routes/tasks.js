const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Helper: check project membership and get role
async function checkMembership(projectId, userId) {
  const membership = await ProjectMember.findOne({
    where: { project_id: projectId, user_id: userId },
  });
  return membership;
}

// GET /api/tasks?projectId=X — list tasks for a project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId query parameter is required.' });
    }

    const membership = await checkMembership(projectId, req.userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    const whereClause = { project_id: projectId };

    // Members can only see tasks assigned to them
    if (membership.role === 'member') {
      whereClause.assigned_to = req.userId;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
      ],
      order: [
        ['priority', 'DESC'],
        ['due_date', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    res.json({ tasks, userRole: membership.role });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// POST /api/tasks — create a task (admin only)
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, due_date, project_id, assigned_to } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const membership = await checkMembership(project_id, req.userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create tasks.' });
    }

    // Validate assignee is a project member
    if (assigned_to) {
      const assigneeMembership = await checkMembership(project_id, assigned_to);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project.' });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: (description || '').trim(),
      status: status || 'todo',
      priority: priority || 'medium',
      due_date: due_date || null,
      project_id,
      assigned_to: assigned_to || null,
      created_by: req.userId,
    });

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.status(201).json({ message: 'Task created!', task: fullTask });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id — update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const membership = await checkMembership(task.project_id, req.userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    const { title, description, status, priority, due_date, assigned_to } = req.body;

    // Members can only update status of their own assigned tasks
    if (membership.role === 'member') {
      if (task.assigned_to !== req.userId) {
        return res.status(403).json({ error: 'You can only update tasks assigned to you.' });
      }
      // Members can only change status
      if (status) task.status = status;
    } else {
      // Admins can update everything
      if (title) task.title = title.trim();
      if (description !== undefined) task.description = description.trim();
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (due_date !== undefined) task.due_date = due_date || null;
      if (assigned_to !== undefined) {
        if (assigned_to) {
          const assigneeMembership = await checkMembership(task.project_id, assigned_to);
          if (!assigneeMembership) {
            return res.status(400).json({ error: 'Assigned user is not a member of this project.' });
          }
        }
        task.assigned_to = assigned_to || null;
      }
    }

    await task.save();

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.json({ message: 'Task updated!', task: fullTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id — delete a task (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const membership = await checkMembership(task.project_id, req.userId);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete tasks.' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
