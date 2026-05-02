// ===== TaskFlow SPA — Main Application =====

const API = '';
let state = { user: null, token: localStorage.getItem('token') };

// ===== API HELPERS =====
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ===== MODAL =====
function openModal(html) {
  document.getElementById('modal-container').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
document.getElementById('modal-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });

// ===== AUTH STATE =====
function setAuth(token, user) {
  state.token = token; state.user = user;
  localStorage.setItem('token', token);
  updateSidebar();
}
function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('token');
  navigate('/login');
}

function updateSidebar() {
  const sb = document.getElementById('sidebar');
  if (!state.token) { sb.classList.add('hidden'); document.getElementById('main-content').classList.remove('with-sidebar'); return; }
  sb.classList.remove('hidden');
  document.getElementById('main-content').classList.add('with-sidebar');
  if (state.user) {
    document.getElementById('user-name').textContent = state.user.name;
    document.getElementById('user-email').textContent = state.user.email;
    document.getElementById('user-avatar').textContent = state.user.name.charAt(0).toUpperCase();
  }
}

// ===== ROUTER =====
function navigate(path) { window.location.hash = path; }

async function router() {
  const hash = window.location.hash.slice(1) || '/login';
  const main = document.getElementById('main-content');

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', hash.startsWith(l.getAttribute('href').slice(1)));
  });

  // Auth guard
  if (state.token && !state.user) {
    try { const d = await api('GET', '/api/auth/me'); state.user = d.user; updateSidebar(); }
    catch { logout(); return; }
  }

  if (!state.token && !['/login', '/register'].includes(hash)) { navigate('/login'); return; }
  if (state.token && ['/login', '/register'].includes(hash)) { navigate('/dashboard'); return; }

  try {
    if (hash === '/login') main.innerHTML = renderLogin();
    else if (hash === '/register') main.innerHTML = renderRegister();
    else if (hash === '/dashboard') { main.innerHTML = '<div class="page"><p style="color:var(--text-muted)">Loading dashboard...</p></div>'; await loadDashboard(main); }
    else if (hash === '/projects') { main.innerHTML = '<div class="page"><p style="color:var(--text-muted)">Loading projects...</p></div>'; await loadProjects(main); }
    else if (hash.startsWith('/projects/')) { main.innerHTML = '<div class="page"><p style="color:var(--text-muted)">Loading project...</p></div>'; await loadProjectDetail(main, hash.split('/')[2]); }
    else navigate('/dashboard');
  } catch (err) { main.innerHTML = `<div class="page"><div class="empty-state"><h3>Error</h3><p>${err.message}</p></div></div>`; }
  bindPageEvents();
}

window.addEventListener('hashchange', router);
document.getElementById('btn-logout')?.addEventListener('click', logout);

// ===== RENDER: LOGIN =====
function renderLogin() {
  updateSidebar();
  return `<div class="auth-wrapper"><div class="auth-card">
    <div class="brand-icon"><svg width="48" height="48" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="10" height="10" rx="3" fill="url(#g2)" opacity="0.9"/><rect x="16" y="2" width="10" height="10" rx="3" fill="url(#g2)" opacity="0.6"/><rect x="2" y="16" width="10" height="10" rx="3" fill="url(#g2)" opacity="0.6"/><rect x="16" y="16" width="10" height="10" rx="3" fill="url(#g2)" opacity="0.3"/><defs><linearGradient id="g2" x1="0" y1="0" x2="28" y2="28"><stop stop-color="#7c5cfc"/><stop offset="1" stop-color="#00d4ff"/></linearGradient></defs></svg></div>
    <h1>Welcome back</h1><p class="auth-subtitle">Sign in to your TaskFlow account</p>
    <form id="login-form">
      <div class="form-group"><label>Email</label><input type="email" class="form-control" id="login-email" placeholder="you@example.com" required></div>
      <div class="form-group"><label>Password</label><input type="password" class="form-control" id="login-password" placeholder="••••••••" required></div>
      <button type="submit" class="btn btn-primary btn-block" id="login-btn">Sign In</button>
    </form>
    <p class="auth-footer">Don't have an account? <a href="#/register">Create one</a></p>
  </div></div>`;
}

// ===== RENDER: REGISTER =====
function renderRegister() {
  updateSidebar();
  return `<div class="auth-wrapper"><div class="auth-card">
    <div class="brand-icon"><svg width="48" height="48" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="10" height="10" rx="3" fill="url(#g3)" opacity="0.9"/><rect x="16" y="2" width="10" height="10" rx="3" fill="url(#g3)" opacity="0.6"/><rect x="2" y="16" width="10" height="10" rx="3" fill="url(#g3)" opacity="0.6"/><rect x="16" y="16" width="10" height="10" rx="3" fill="url(#g3)" opacity="0.3"/><defs><linearGradient id="g3" x1="0" y1="0" x2="28" y2="28"><stop stop-color="#7c5cfc"/><stop offset="1" stop-color="#00d4ff"/></linearGradient></defs></svg></div>
    <h1>Create account</h1><p class="auth-subtitle">Join TaskFlow and start managing tasks</p>
    <form id="register-form">
      <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="reg-name" placeholder="John Doe" required></div>
      <div class="form-group"><label>Email</label><input type="email" class="form-control" id="reg-email" placeholder="you@example.com" required></div>
      <div class="form-group"><label>Password</label><input type="password" class="form-control" id="reg-password" placeholder="Min 6 characters" required minlength="6"></div>
      <button type="submit" class="btn btn-primary btn-block" id="reg-btn">Create Account</button>
    </form>
    <p class="auth-footer">Already have an account? <a href="#/login">Sign in</a></p>
  </div></div>`;
}

// ===== LOAD: DASHBOARD =====
async function loadDashboard(main) {
  const data = await api('GET', '/api/dashboard');
  const s = data.stats;
  const today = new Date().toISOString().split('T')[0];
  main.innerHTML = `<div class="page">
    <div class="page-header"><h1>Dashboard</h1><p>Overview of your projects and tasks</p></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Projects</div><div class="stat-value">${s.totalProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value">${s.totalTasks}</div></div>
      <div class="stat-card"><div class="stat-label">To Do</div><div class="stat-value">${s.todoCount}</div></div>
      <div class="stat-card warning"><div class="stat-label">In Progress</div><div class="stat-value">${s.inProgressCount}</div></div>
      <div class="stat-card success"><div class="stat-label">Completed</div><div class="stat-value">${s.doneCount}</div></div>
      <div class="stat-card danger"><div class="stat-label">Overdue</div><div class="stat-value">${s.overdueCount}</div></div>
      <div class="stat-card"><div class="stat-label">My Tasks</div><div class="stat-value">${s.myTasks}</div></div>
      <div class="stat-card warning"><div class="stat-label">My Pending</div><div class="stat-value">${s.myPendingTasks}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section-card"><h3>Tasks Per User</h3>${data.tasksPerUser.length ? `<table class="data-table"><thead><tr><th>User</th><th>Tasks</th></tr></thead><tbody>${data.tasksPerUser.map(t => `<tr><td>${esc(t.user?.name||'Unassigned')}</td><td>${t.taskCount}</td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--text-muted);font-size:0.85rem">No data yet</p>'}</div>
      <div class="section-card"><h3>Overdue Tasks</h3>${data.overdueTasks.length ? `<table class="data-table"><thead><tr><th>Task</th><th>Project</th><th>Due</th></tr></thead><tbody>${data.overdueTasks.map(t => `<tr><td>${esc(t.title)}</td><td>${esc(t.project?.name||'')}</td><td style="color:var(--danger)">${t.due_date}</td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--text-muted);font-size:0.85rem">No overdue tasks 🎉</p>'}</div>
    </div>
    <div class="section-card" style="margin-top:16px"><h3>Recent Activity</h3>${data.recentTasks.length ? `<table class="data-table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th></tr></thead><tbody>${data.recentTasks.map(t => `<tr><td>${esc(t.title)}</td><td>${esc(t.project?.name||'')}</td><td>${esc(t.assignee?.name||'—')}</td><td><span class="priority-badge ${t.status==='done'?'low':t.status==='in-progress'?'medium':'high'}">${t.status}</span></td></tr>`).join('')}</tbody></table>` : '<p style="color:var(--text-muted);font-size:0.85rem">No tasks yet</p>'}</div>
  </div>`;
}

// ===== LOAD: PROJECTS =====
async function loadProjects(main) {
  const data = await api('GET', '/api/projects');
  main.innerHTML = `<div class="page">
    <div class="toolbar"><div class="page-header" style="margin-bottom:0"><h1>Projects</h1><p>Manage your team projects</p></div>
    <button class="btn btn-primary" id="btn-new-project"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Project</button></div>
    ${data.projects.length ? `<div class="projects-grid">${data.projects.map(p => `
      <div class="project-card" data-id="${p.id}">
        <span class="role-badge ${p.userRole}">${p.userRole}</span>
        <h3>${esc(p.name)}</h3>
        <p class="project-desc">${esc(p.description || 'No description')}</p>
        <div class="project-meta">
          <span>👤 ${p.members?.length || 0} members</span>
          <span>📋 ${p.tasks?.length || 0} tasks</span>
          <span>by ${esc(p.creator?.name || 'Unknown')}</span>
        </div>
      </div>`).join('')}</div>` : `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><h3>No projects yet</h3><p>Create your first project to get started</p><button class="btn btn-primary" id="btn-new-project-empty">Create Project</button></div>`}
  </div>`;
}

// ===== LOAD: PROJECT DETAIL =====
async function loadProjectDetail(main, id) {
  const data = await api('GET', `/api/projects/${id}`);
  const p = data.project;
  const tasksData = await api('GET', `/api/tasks?projectId=${id}`);
  const tasks = tasksData.tasks;
  const userRole = tasksData.userRole;
  const isAdmin = userRole === 'admin';

  const todo = tasks.filter(t => t.status === 'todo');
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const done = tasks.filter(t => t.status === 'done');
  const today = new Date().toISOString().split('T')[0];

  main.innerHTML = `<div class="page" data-project-id="${p.id}" data-user-role="${userRole}">
    <a href="#/projects" class="back-link">← Back to Projects</a>
    <div class="toolbar">
      <div class="page-header" style="margin-bottom:0"><h1>${esc(p.name)}</h1><p>${esc(p.description || '')}</p></div>
      <div class="toolbar-left">
        ${isAdmin ? `<button class="btn btn-primary btn-sm" id="btn-new-task">+ New Task</button><button class="btn btn-secondary btn-sm" id="btn-add-member">+ Add Member</button><button class="btn btn-danger btn-sm" id="btn-delete-project">Delete</button>` : ''}
      </div>
    </div>
    <div class="members-section"><h3>Team Members</h3><div class="members-list">${p.members.map(m => `
      <div class="member-chip"><div class="chip-avatar">${m.user.name.charAt(0).toUpperCase()}</div><span>${esc(m.user.name)}</span><span class="chip-role">${m.role}</span>${isAdmin && m.user.id !== state.user.id ? `<button class="chip-remove" data-remove-user="${m.user.id}" title="Remove member">×</button>` : ''}</div>`).join('')}</div></div>
    <div class="kanban-board">
      <div class="kanban-column"><div class="kanban-column-header"><h3>📋 To Do</h3><span class="kanban-count">${todo.length}</span></div><div class="kanban-cards">${todo.map(t => renderTaskCard(t, today, isAdmin)).join('')}</div></div>
      <div class="kanban-column"><div class="kanban-column-header"><h3>🔄 In Progress</h3><span class="kanban-count">${inProgress.length}</span></div><div class="kanban-cards">${inProgress.map(t => renderTaskCard(t, today, isAdmin)).join('')}</div></div>
      <div class="kanban-column"><div class="kanban-column-header"><h3>✅ Done</h3><span class="kanban-count">${done.length}</span></div><div class="kanban-cards">${done.map(t => renderTaskCard(t, today, isAdmin)).join('')}</div></div>
    </div>
  </div>`;
}

function renderTaskCard(t, today, isAdmin) {
  const isOverdue = t.due_date && t.due_date < today && t.status !== 'done';
  const canChangeStatus = isAdmin || t.assigned_to === state.user?.id;
  return `<div class="task-card" data-task-id="${t.id}">
    <h4>${esc(t.title)}</h4>
    ${t.description ? `<p class="task-desc">${esc(t.description)}</p>` : ''}
    <div class="task-meta">
      <span class="priority-badge ${t.priority}">${t.priority}</span>
      ${t.due_date ? `<span class="task-due ${isOverdue?'overdue':''}">${isOverdue?'⚠ ':''}${t.due_date}</span>` : ''}
      <span class="task-assignee">${t.assignee ? esc(t.assignee.name) : 'Unassigned'}</span>
    </div>
    ${canChangeStatus ? `<div style="margin-top:8px"><select class="status-select" data-task-status="${t.id}"><option value="todo" ${t.status==='todo'?'selected':''}>To Do</option><option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option><option value="done" ${t.status==='done'?'selected':''}>Done</option></select>${isAdmin ? ` <button class="btn btn-danger btn-sm" data-delete-task="${t.id}" style="padding:3px 8px;font-size:0.7rem">×</button>` : ''}</div>` : ''}
  </div>`;
}

// ===== EVENT BINDINGS =====
function bindPageEvents() {
  // Login
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn'); btn.disabled = true; btn.textContent = 'Signing in...';
    try {
      const d = await api('POST', '/api/auth/login', { email: document.getElementById('login-email').value, password: document.getElementById('login-password').value });
      setAuth(d.token, d.user); toast('Welcome back!', 'success'); navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Sign In'; }
  });

  // Register
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn'); btn.disabled = true; btn.textContent = 'Creating...';
    try {
      const d = await api('POST', '/api/auth/register', { name: document.getElementById('reg-name').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-password').value });
      setAuth(d.token, d.user); toast('Account created!', 'success'); navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Create Account'; }
  });

  // New project buttons
  const npBtn = document.getElementById('btn-new-project') || document.getElementById('btn-new-project-empty');
  npBtn?.addEventListener('click', () => {
    openModal(`<div class="modal-header"><h2>New Project</h2><button class="modal-close" onclick="closeModal()">×</button></div>
      <form id="modal-form"><div class="form-group"><label>Project Name</label><input class="form-control" id="m-proj-name" required placeholder="My Project"></div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="m-proj-desc" placeholder="What's this project about?"></textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create</button></div></form>`);
    document.getElementById('modal-form').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/projects', { name: document.getElementById('m-proj-name').value, description: document.getElementById('m-proj-desc').value }); closeModal(); toast('Project created!', 'success'); router(); }
      catch (err) { toast(err.message, 'error'); }
    };
  });

  // Project card click
  document.querySelectorAll('.project-card').forEach(c => c.addEventListener('click', () => navigate(`/projects/${c.dataset.id}`)));

  // New task
  document.getElementById('btn-new-task')?.addEventListener('click', async () => {
    const projectId = document.querySelector('[data-project-id]')?.dataset.projectId;
    const projData = await api('GET', `/api/projects/${projectId}`);
    const members = projData.project.members || [];
    openModal(`<div class="modal-header"><h2>New Task</h2><button class="modal-close" onclick="closeModal()">×</button></div>
      <form id="modal-form">
      <div class="form-group"><label>Title</label><input class="form-control" id="m-task-title" required placeholder="Task title"></div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="m-task-desc" placeholder="Details..."></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Priority</label><select class="form-control" id="m-task-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="m-task-due"></div>
      </div>
      <div class="form-group"><label>Assign To</label><select class="form-control" id="m-task-assign"><option value="">Unassigned</option>${members.map(m => `<option value="${m.user.id}">${esc(m.user.name)} (${m.role})</option>`).join('')}</select></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Create Task</button></div></form>`);
    document.getElementById('modal-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('POST', '/api/tasks', { title: document.getElementById('m-task-title').value, description: document.getElementById('m-task-desc').value, priority: document.getElementById('m-task-priority').value, due_date: document.getElementById('m-task-due').value || null, assigned_to: document.getElementById('m-task-assign').value || null, project_id: parseInt(projectId) });
        closeModal(); toast('Task created!', 'success'); router();
      } catch (err) { toast(err.message, 'error'); }
    };
  });

  // Add member
  document.getElementById('btn-add-member')?.addEventListener('click', () => {
    const projectId = document.querySelector('[data-project-id]')?.dataset.projectId;
    openModal(`<div class="modal-header"><h2>Add Member</h2><button class="modal-close" onclick="closeModal()">×</button></div>
      <form id="modal-form"><div class="form-group"><label>User Email</label><input type="email" class="form-control" id="m-mem-email" required placeholder="user@example.com"></div>
      <div class="form-group"><label>Role</label><select class="form-control" id="m-mem-role"><option value="member">Member</option><option value="admin">Admin</option></select></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add</button></div></form>`);
    document.getElementById('modal-form').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('POST', `/api/projects/${projectId}/members`, { email: document.getElementById('m-mem-email').value, role: document.getElementById('m-mem-role').value }); closeModal(); toast('Member added!', 'success'); router(); }
      catch (err) { toast(err.message, 'error'); }
    };
  });

  // Remove member
  document.querySelectorAll('[data-remove-user]').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Remove this member?')) return;
    const projectId = document.querySelector('[data-project-id]')?.dataset.projectId;
    try { await api('DELETE', `/api/projects/${projectId}/members/${b.dataset.removeUser}`); toast('Member removed', 'success'); router(); }
    catch (err) { toast(err.message, 'error'); }
  }));

  // Status change
  document.querySelectorAll('[data-task-status]').forEach(s => s.addEventListener('change', async (e) => {
    try { await api('PUT', `/api/tasks/${s.dataset.taskStatus}`, { status: e.target.value }); toast('Status updated', 'success'); router(); }
    catch (err) { toast(err.message, 'error'); e.target.value = e.target.dataset.prev; }
  }));

  // Delete task
  document.querySelectorAll('[data-delete-task]').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    try { await api('DELETE', `/api/tasks/${b.dataset.deleteTask}`); toast('Task deleted', 'success'); router(); }
    catch (err) { toast(err.message, 'error'); }
  }));

  // Delete project
  document.getElementById('btn-delete-project')?.addEventListener('click', async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    const projectId = document.querySelector('[data-project-id]')?.dataset.projectId;
    try { await api('DELETE', `/api/projects/${projectId}`); toast('Project deleted', 'success'); navigate('/projects'); }
    catch (err) { toast(err.message, 'error'); }
  });
}

// ===== UTILITY =====
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// ===== INIT =====
router();
