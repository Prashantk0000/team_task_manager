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

const VALID_STATUSES = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// GET /api/tasks?projectId=X — list tasks for a project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const parsedProjectId = parseInt(projectId);

    if (!projectId || isNaN(parsedProjectId)) {
      return res.status(400).json({ error: 'Valid projectId query parameter is required.' });
    }

    const membership = await checkMembership(parsedProjectId, req.userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    const tasks = await Task.findAll({
      where: { project_id: parsedProjectId },
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

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const parsedProjectId = parseInt(project_id);
    if (!project_id || isNaN(parsedProjectId)) {
      return res.status(400).json({ error: 'Valid Project ID is required.' });
    }

    const membership = await checkMembership(parsedProjectId, req.userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create tasks.' });
    }

    const parsedAssignee = assigned_to ? parseInt(assigned_to) : null;
    if (parsedAssignee) {
      const assigneeMembership = await checkMembership(parsedProjectId, parsedAssignee);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Assigned user is not a member of this project.' });
      }
    }

    const taskStatus = status && VALID_STATUSES.includes(status) ? status : 'todo';
    const taskPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'medium';

    const task = await Task.create({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      status: taskStatus,
      priority: taskPriority,
      due_date: due_date || null,
      project_id: parsedProjectId,
      assigned_to: parsedAssignee,
      created_by: req.userId,
    });

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.status(201).json({ message: 'Task created successfully!', task: fullTask });
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
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const task = await Task.findByPk(taskId);
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
      if (status) {
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ error: 'Invalid status value.' });
        }
        task.status = status;
      }
    } else {
      // Admins can update everything
      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return res.status(400).json({ error: 'Task title cannot be empty.' });
        }
        task.title = title.trim();
      }

      if (description !== undefined) {
        task.description = typeof description === 'string' ? description.trim() : '';
      }

      if (status) {
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ error: 'Invalid status value.' });
        }
        task.status = status;
      }

      if (priority) {
        if (!VALID_PRIORITIES.includes(priority)) {
          return res.status(400).json({ error: 'Invalid priority value.' });
        }
        task.priority = priority;
      }

      if (due_date !== undefined) {
        task.due_date = due_date || null;
      }

      if (assigned_to !== undefined) {
        const parsedAssignee = assigned_to ? parseInt(assigned_to) : null;
        if (parsedAssignee) {
          const assigneeMembership = await checkMembership(task.project_id, parsedAssignee);
          if (!assigneeMembership) {
            return res.status(400).json({ error: 'Assigned user is not a member of this project.' });
          }
        }
        task.assigned_to = parsedAssignee;
      }
    }

    await task.save();

    const fullTask = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'taskCreator', attributes: ['id', 'name', 'email'] },
      ],
    });

    res.json({ message: 'Task updated successfully!', task: fullTask });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id — delete a task (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const task = await Task.findByPk(taskId);
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
