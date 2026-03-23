import routesDefault from '../src/data/routes.json'
import coursesDefault from '../src/data/courses.json'
import inheritorsDefault from '../src/data/inheritors.json'

const PASSWORD = 'tongxiang2026'
const PREFIX = 'tongxiang_'
const API_BASE = `${location.origin}/txyx/api`

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── Storage helpers ──────────────────────────────────────
function get(key, fallback) {
  try {
    const s = localStorage.getItem(PREFIX + key)
    if (s) return JSON.parse(s)
  } catch (_) {}
  return fallback
}
function set(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val))
}
function clearAll() {
  Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k))
}

// ── State ────────────────────────────────────────────────
let currentSection = 'routes'
const DEFAULTS = { routes: routesDefault, courses: coursesDefault, inheritors: inheritorsDefault }
const TITLES = { routes: '线路管理', courses: '课程管理', inheritors: '传承人管理', tasks: '研学任务', groups: '小组管理', records: '研学记录' }

// ── Login ────────────────────────────────────────────────
document.getElementById('loginBtn').addEventListener('click', tryLogin)
document.getElementById('pwInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin()
})

function tryLogin() {
  const pw = document.getElementById('pwInput').value
  if (pw === PASSWORD) {
    document.getElementById('loginScreen').style.display = 'none'
    document.getElementById('adminApp').style.display = 'flex'
    renderSection(currentSection)
  } else {
    document.getElementById('loginError').classList.add('show')
    document.getElementById('pwInput').value = ''
    document.getElementById('pwInput').focus()
  }
}

// ── Nav ──────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    item.classList.add('active')
    currentSection = item.dataset.section
    document.getElementById('sectionTitle').textContent = TITLES[currentSection]
    const isSpecial = currentSection === 'records' || currentSection === 'groups' || currentSection === 'tasks'
    document.getElementById('addBtn').style.display    = isSpecial ? 'none' : 'block'
    document.getElementById('exportBtn').style.display = isSpecial ? 'none' : 'block'
    renderSection(currentSection)
  })
})

document.getElementById('addBtn').addEventListener('click', () => {
  if (currentSection === 'tasks') openTaskModal(null)
  else openModal(null)
})
document.getElementById('exportBtn').addEventListener('click', exportJSON)
document.getElementById('resetAll').addEventListener('click', () => {
  if (confirm('确认清除所有本地覆盖数据？这将恢复为默认数据。')) {
    clearAll()
    renderSection(currentSection)
  }
})

// ── Modal ────────────────────────────────────────────────
const overlay = document.getElementById('modalOverlay')
const modalBody = document.getElementById('modalBody')
const modalTitle = document.getElementById('modalTitle')
let editingId = null

document.getElementById('modalClose').addEventListener('click', closeModal)
document.getElementById('modalCancel').addEventListener('click', closeModal)
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })

document.getElementById('modalSave').addEventListener('click', saveItem)

function closeModal() {
  overlay.style.display = 'none'
  editingId = null
  modalBody.innerHTML = ''
}

// ── Render sections ──────────────────────────────────────
function renderSection(section) {
  const content = document.getElementById('adminContent')

  if (section === 'records') { renderRecords(content); return }
  if (section === 'groups')  { renderGroups(content);  return }
  if (section === 'tasks')   {
    document.getElementById('addBtn').style.display    = 'block'
    document.getElementById('exportBtn').style.display = 'none'
    renderTasks(content); return
  }

  const data = get(section, DEFAULTS[section] || [])
  content.innerHTML = `<div class="data-list">${data.map(item => renderItem(section, item)).join('')}</div>`

  content.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)))
  })
  content.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.id)))
  })
}

function renderItem(section, item) {
  let title = '', meta = ''
  if (section === 'routes') {
    title = item.name
    meta = `${item.subtitle} · ${item.audience?.join(' / ') || ''} · ${item.stops?.length || 0}个站点`
  } else if (section === 'courses') {
    title = `《${item.name}》`
    meta = `${item.grade} · ${item.duration} · ${item.locations?.join(' / ') || ''}`
  } else if (section === 'inheritors') {
    title = `${item.name} — ${item.project}`
    meta = `${item.category} · ${item.level || '市级'}`
  }

  return `
    <div class="data-item">
      <div class="data-item-main">
        <div class="data-item-title">${title}</div>
        <div class="data-item-meta">${meta}</div>
      </div>
      <div class="data-item-actions">
        <button class="btn-edit" data-id="${item.id}">编辑</button>
        <button class="btn-delete" data-id="${item.id}">删除</button>
      </div>
    </div>
  `
}

// ── Modal open ───────────────────────────────────────────
function openModal(id) {
  const data = get(currentSection, DEFAULTS[currentSection] || [])
  const item = id != null ? data.find(d => d.id === id) : null
  editingId = id

  modalTitle.textContent = item ? '编辑' + TITLES[currentSection].replace('管理', '') : '新增' + TITLES[currentSection].replace('管理', '')
  modalBody.innerHTML = buildForm(currentSection, item)
  overlay.style.display = 'flex'
}

function buildForm(section, item) {
  const v = (key, fallback = '') => item?.[key] ?? fallback

  if (section === 'routes') return `
    ${field('name', '线路名称', v('name'), 'text', '如：田园牧歌研学线')}
    ${field('subtitle', '主题句', v('subtitle'), 'text', '如：稻香葡语·田野课堂')}
    ${field('description', '简介', v('description'), 'textarea')}
    ${field('audience', '适合人群（逗号分隔）', v('audience', []).join('，'), 'text', '如：亲子家庭，研学团队')}
    ${field('poemTitle', '配诗标题', v('poemTitle'), 'text')}
    ${field('poem', '配诗内容（换行分隔）', v('poem'), 'textarea')}
  `
  if (section === 'courses') return `
    ${field('name', '课程名称', v('name'), 'text')}
    ${field('grade', '适合年级', v('grade'), 'text', '如：三年级及以上')}
    ${field('description', '课程介绍', v('description'), 'textarea')}
    ${field('activities', '核心活动（逗号分隔）', v('activities', []).join('，'), 'text')}
    ${field('locations', '涉及地点（逗号分隔）', v('locations', []).join('，'), 'text')}
    ${field('duration', '时长', v('duration'), 'text', '如：1天')}
  `
  if (section === 'inheritors') return `
    ${field('name', '传承人姓名', v('name'), 'text')}
    ${selectField('category', '类别', v('category'), ['民间文学','传统舞蹈','传统戏剧','曲艺','传统美术','传统技艺','传统医药','民俗'])}
    ${field('project', '代表性项目', v('project'), 'text')}
    ${field('description', '简介', v('description'), 'textarea')}
    ${field('emoji', '图标Emoji', v('emoji', '🎨'), 'text')}
    ${selectField('level', '级别', v('level', '市级'), ['国家级','省级','市级'])}
  `
  return '<p>不支持此类型的编辑</p>'
}

function field(name, label, value, type = 'text', placeholder = '') {
  const tag = type === 'textarea' ? 'textarea' : 'input'
  const attrs = type === 'textarea'
    ? `class="field-textarea" name="${name}" id="${name}">${value || ''}</textarea>`
    : `class="field-input" type="${type}" name="${name}" id="${name}" value="${value || ''}" placeholder="${placeholder}" />`
  return `
    <div class="field-group">
      <label class="field-label" for="${name}">${label}</label>
      <${tag} ${attrs}
    </div>
  `
}

function selectField(name, label, value, options) {
  return `
    <div class="field-group">
      <label class="field-label" for="${name}">${label}</label>
      <select class="field-select" name="${name}" id="${name}">
        ${options.map(o => `<option value="${o}"${o === value ? ' selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
  `
}

// ── Save ─────────────────────────────────────────────────
function saveItem() {
  if (currentSection === 'tasks') return  // handled by openTaskModal's onclick
  const data = get(currentSection, DEFAULTS[currentSection] || [])
  const formEls = document.getElementById('modalBody').querySelectorAll('[name]')
  const formData = {}
  formEls.forEach(el => { formData[el.name] = el.value.trim() })

  // Parse array fields
  if (currentSection === 'routes') {
    formData.audience = formData.audience.split(/[，,]/).map(s => s.trim()).filter(Boolean)
  }
  if (currentSection === 'courses') {
    formData.activities = formData.activities.split(/[，,]/).map(s => s.trim()).filter(Boolean)
    formData.locations = formData.locations.split(/[，,]/).map(s => s.trim()).filter(Boolean)
  }

  if (editingId != null) {
    const idx = data.findIndex(d => d.id === editingId)
    if (idx !== -1) data[idx] = { ...data[idx], ...formData }
  } else {
    const maxId = data.reduce((m, d) => Math.max(m, d.id || 0), 0)
    data.push({ id: maxId + 1, ...formData })
  }

  set(currentSection, data)
  closeModal()
  renderSection(currentSection)
}

// ── Delete ────────────────────────────────────────────────
function deleteItem(id) {
  if (!confirm('确认删除这条记录？')) return
  const data = get(currentSection, DEFAULTS[currentSection] || [])
  set(currentSection, data.filter(d => d.id !== id))
  renderSection(currentSection)
}

// ── Groups management ────────────────────────────────────
async function renderGroups(content) {
  content.innerHTML = `<div class="empty-state"><div style="font-size:32px">⏳</div><p>加载中…</p></div>`

  let groups = [], journalTasks = []
  try {
    const [gr, tr] = await Promise.all([
      fetch(`${API_BASE}/groups`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/tasks`).then(r => r.ok ? r.json() : []),
    ])
    groups = gr
    journalTasks = tr.filter(t => t.journalEnabled)
  } catch (_) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:40px">⚠️</div><p>无法连接服务器</p></div>`
    return
  }

  const taskSelect = journalTasks.length
    ? `<select id="newGroupTask" style="height:40px;border:1.5px solid #e0dbd0;border-radius:8px;padding:0 10px;font-size:14px;outline:none">
        <option value="">— 选择研学任务（可选）—</option>
        ${journalTasks.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('')}
      </select>`
    : ''

  content.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:600;color:#555;margin-bottom:10px">新建小组</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="newGroupCode" type="text" placeholder="输入组号，如 A1、第三组"
               style="height:40px;border:1.5px solid #e0dbd0;border-radius:8px;padding:0 12px;font-size:14px;width:200px;outline:none"/>
        ${taskSelect}
        <button id="addGroupBtn"
                style="height:40px;padding:0 20px;background:#1e3d2f;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">
          + 创建
        </button>
        <span id="addGroupMsg" style="font-size:13px;color:#888"></span>
      </div>
      <p style="font-size:12px;color:#aaa;margin-top:6px">组号可以是任意字母或数字，如 A1、B2、第三组，创建后分配给学生</p>
    </div>
    <div style="font-size:13px;color:#888;margin-bottom:12px">共 ${groups.length} 个小组</div>
    <div class="data-list" id="groupList">
      ${groups.length ? groups.map(g => {
        const activated = !!g.hasPassword
        const badge = activated
          ? `<span style="background:#eaf5ef;color:#2d8a5a;font-size:12px;padding:2px 8px;border-radius:20px">✅ 已激活</span>`
          : `<span style="background:#fff8e8;color:#c8963c;font-size:12px;padding:2px 8px;border-radius:20px">⏳ 待激活</span>`
        const updated = g.updatedAt ? new Date(g.updatedAt).toLocaleString('zh-CN') : '—'
        const taskOpts = journalTasks.map(t =>
          `<option value="${t.id}"${g.taskId === t.id ? ' selected' : ''}>${esc(t.title)}</option>`
        ).join('')
        return `
          <div class="data-item">
            <div class="data-item-main">
              <div class="data-item-title" style="display:flex;align-items:center;gap:10px">
                <strong style="font-size:18px;font-family:monospace">${esc(g.code)}</strong>
                ${badge}
                ${activated ? `<span style="font-size:13px;color:#999">${(g.members||[]).map(esc).join('、')||'未设置成员'}</span>` : ''}
              </div>
              <div class="data-item-meta">
                <span>${activated ? (esc(g.school)||'未知学校') : '学生尚未首次登录'}</span>
                <span style="margin:0 6px">·</span>
                <span>最后更新：${updated}</span>
              </div>
              ${journalTasks.length ? `
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                <span style="font-size:12px;color:#888;flex-shrink:0">绑定任务：</span>
                <select class="group-task-select" data-code="${esc(g.code)}"
                        style="height:32px;border:1px solid #ddd;border-radius:6px;padding:0 8px;font-size:13px;outline:none;flex:1;max-width:260px">
                  <option value="">— 不绑定 —</option>
                  ${taskOpts}
                </select>
                <button class="group-task-save" data-code="${esc(g.code)}"
                        style="height:32px;padding:0 14px;background:#1e3d2f;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">
                  保存
                </button>
                <span class="group-task-msg" data-code="${esc(g.code)}" style="font-size:12px;color:#888"></span>
              </div>` : ''}
            </div>
            <div class="data-item-actions">
              <button class="btn-delete" data-code="${esc(g.code)}" data-activated="${activated}">删除</button>
            </div>
          </div>
        `
      }).join('') : '<div style="text-align:center;padding:40px;color:#aaa">暂无小组，请先创建</div>'}
    </div>
  `

  // Add group
  document.getElementById('addGroupBtn')?.addEventListener('click', async () => {
    const code   = document.getElementById('newGroupCode')?.value.trim()
    const taskId = document.getElementById('newGroupTask')?.value
    const msg    = document.getElementById('addGroupMsg')
    if (!code) { msg.textContent = '请输入组号'; msg.style.color = '#e53935'; return }
    msg.textContent = '创建中…'; msg.style.color = '#888'
    try {
      const body = taskId ? { taskId: parseInt(taskId) } : {}
      const res  = await fetch(`${API_BASE}/groups/${encodeURIComponent(code)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { msg.textContent = data.error || '创建失败'; msg.style.color = '#e53935'; return }
      msg.textContent = `✅ "${code}" 创建成功`; msg.style.color = '#2d8a5a'
      document.getElementById('newGroupCode').value = ''
      setTimeout(() => renderGroups(content), 800)
    } catch { msg.textContent = '网络异常'; msg.style.color = '#e53935' }
  })
  document.getElementById('newGroupCode')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addGroupBtn')?.click()
  })

  // Bind task to group
  content.querySelectorAll('.group-task-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code    = btn.dataset.code
      const select  = content.querySelector(`.group-task-select[data-code="${code}"]`)
      const msgEl   = content.querySelector(`.group-task-msg[data-code="${code}"]`)
      const taskId  = select?.value ? parseInt(select.value) : null
      btn.disabled  = true
      try {
        const r    = await fetch(`${API_BASE}/groups/${encodeURIComponent(code)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        })
        const data = await r.json()
        if (!r.ok) { msgEl.textContent = data.error || '保存失败'; msgEl.style.color = '#e53935'; return }
        msgEl.textContent = '✅ 已保存'; msgEl.style.color = '#2d8a5a'
        setTimeout(() => { msgEl.textContent = '' }, 2000)
      } catch { msgEl.textContent = '网络异常'; msgEl.style.color = '#e53935' }
      finally   { btn.disabled = false }
    })
  })

  // Delete group
  content.querySelectorAll('.btn-delete[data-code]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActivated = btn.dataset.activated === 'true'
      const msg = isActivated
        ? `小组 "${btn.dataset.code}" 已激活，确认删除？（已填写的数据将一并删除）`
        : `确认删除小组 "${btn.dataset.code}"？`
      if (!confirm(msg)) return
      try {
        const res  = await fetch(`${API_BASE}/groups/${encodeURIComponent(btn.dataset.code)}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) { alert(data.error || '删除失败'); return }
        renderGroups(content)
      } catch { alert('网络异常') }
    })
  })
}

// ── Tasks management ──────────────────────────────────────
let _editingTask = null
let _editingPhase = 'before'

async function renderTasks(content) {
  content.innerHTML = `<div class="empty-state"><div style="font-size:32px">⏳</div><p>加载中…</p></div>`
  let tasks = []
  try {
    const r = await fetch(`${API_BASE}/tasks`)
    if (r.ok) tasks = await r.json()
  } catch {
    content.innerHTML = `<div class="empty-state"><div style="font-size:40px">⚠️</div><p>无法连接服务器</p></div>`
    return
  }

  content.innerHTML = `
    <div class="data-list">
      ${tasks.map(t => `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-item-title" style="display:flex;align-items:center;gap:8px">
              ${esc(t.title)}
              ${t.journalEnabled
                ? `<span style="background:#e8f5e9;color:#2d8a5a;font-size:11px;padding:2px 8px;border-radius:20px">有日记</span>`
                : `<span style="background:#f5f5f5;color:#999;font-size:11px;padding:2px 8px;border-radius:20px">展示</span>`}
            </div>
            <div class="data-item-meta">${esc(t.grade||'')} · ${esc(t.location||'')} · ${esc(t.status||'')}</div>
          </div>
          <div class="data-item-actions">
            <button class="btn-edit" data-task-id="${t.id}">编辑信息</button>
            ${t.journalEnabled ? `<button class="btn-phase-edit" data-task-id="${t.id}">编辑阶段</button>` : ''}
            ${t.isDefault ? '' : `<button class="btn-delete" data-task-id="${t.id}">删除</button>`}
          </div>
        </div>
      `).join('')}
    </div>
  `

  content.querySelectorAll('.btn-edit[data-task-id]').forEach(btn => {
    btn.addEventListener('click', () => openTaskModal(parseInt(btn.dataset.taskId), tasks))
  })
  content.querySelectorAll('.btn-phase-edit[data-task-id]').forEach(btn => {
    btn.addEventListener('click', () => openPhaseEditor(parseInt(btn.dataset.taskId), tasks))
  })
  content.querySelectorAll('.btn-delete[data-task-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确认删除此任务？已使用该任务的小组无法删除。')) return
      const r = await fetch(`${API_BASE}/tasks/${btn.dataset.taskId}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || '删除失败'); return }
      renderTasks(content)
    })
  })
}

function openTaskModal(id, tasks) {
  const task = id != null && tasks ? tasks.find(t => t.id === id) : null
  _editingTask = task ? { ...task } : {
    title: '', grade: '', location: '', duration: '', capacity: 40, status: '招募中',
    difficulty: '初级', description: '', journalEnabled: false,
    tags: [], organizer: '', startDate: '', phases: null,
  }

  modalTitle.textContent = task ? '编辑任务信息' : '新建任务'
  modalBody.innerHTML = `
    ${field('title',       '任务名称',     _editingTask.title || '',       'text')}
    ${field('grade',       '适合年级',     _editingTask.grade || '',       'text', '如：三至六年级')}
    ${field('location',    '活动地点',     _editingTask.location || '',    'text')}
    ${field('duration',    '时长',         _editingTask.duration || '',    'text', '如：一天')}
    ${field('status',      '状态',         _editingTask.status || '招募中','text')}
    ${field('difficulty',  '难度',         _editingTask.difficulty || '初级','text')}
    ${field('description', '简介',         _editingTask.description || '', 'textarea')}
    ${field('organizer',   '主办方',       _editingTask.organizer || '',   'text')}
    ${field('startDate',   '开始日期',     _editingTask.startDate || '',   'text', '2026-04-15')}
    ${field('capacity',    '名额',         _editingTask.capacity || 40,    'text')}
    <div class="field-group">
      <label class="field-label">类型</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="journalEnabled" ${_editingTask.journalEnabled ? 'checked' : ''}/>
        <span>启用研学日记（学生在线填表）</span>
      </label>
    </div>
    ${task ? renderTaskImagesSection(_editingTask) : '<p style="font-size:12px;color:#aaa">保存后可上传封面图片</p>'}
  `

  overlay.style.display = 'flex'
  if (task) bindTaskImageEvents()

  // Override save button
  document.getElementById('modalSave').onclick = async () => {
    const formEls = modalBody.querySelectorAll('[name]')
    formEls.forEach(el => { _editingTask[el.name] = el.value.trim() })
    _editingTask.journalEnabled = !!document.getElementById('journalEnabled')?.checked
    _editingTask.capacity = parseInt(_editingTask.capacity) || 0

    // If new journalEnabled task without phases, add default empty phases
    if (_editingTask.journalEnabled && !_editingTask.phases) {
      _editingTask.phases = { before: { mode:'form', title:'行前准备', icon:'🎒', sections:[] },
                              during: { mode:'form', title:'行中探索', icon:'🔍', subPhases:[] },
                              after:  { mode:'form', title:'行后总结', icon:'💬', sections:[] } }
    }

    const isNew  = !_editingTask.id
    const method = isNew ? 'POST' : 'PUT'
    const url    = isNew ? `${API_BASE}/tasks` : `${API_BASE}/tasks/${_editingTask.id}`
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_editingTask),
    })
    const saved = await r.json()
    if (!r.ok) { alert(saved.error || '保存失败'); return }
    closeModal()
    renderTasks(document.getElementById('adminContent'))
  }
}

function renderTaskImagesSection(task) {
  const imgs = task.images || []
  const isStatic = url => !url.includes('/txyx/api/')
  return `
    <div class="field-group" id="taskImagesSection">
      <label class="field-label">封面图片</label>
      <div class="task-img-grid" id="taskImgGrid">
        ${imgs.map(url => `
          <div class="task-img-item" data-url="${esc(url)}">
            <img src="${esc(url.startsWith('/txyx/api/') ? url : '/txyx' + url)}" alt=""/>
            ${isStatic(url)
              ? `<span class="task-img-static-badge" title="内置图片，不可删除">内置</span>`
              : `<button class="task-img-del" data-url="${esc(url)}" title="删除">✕</button>`}
          </div>
        `).join('')}
        ${imgs.length < 6 ? `
          <label class="task-img-add" title="上传图片（jpg/png，最大10MB）">
            <span>+</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" id="taskImgUpload"/>
          </label>` : ''}
      </div>
      <p style="font-size:11px;color:#aaa;margin-top:4px">最多6张，支持 jpg/png/webp，最大10MB</p>
      <div id="taskImgMsg" style="font-size:12px;margin-top:4px"></div>
    </div>
  `
}

function bindTaskImageEvents() {
  const grid   = document.getElementById('taskImgGrid')
  const msgEl  = document.getElementById('taskImgMsg')
  const taskId = _editingTask.id

  // Delete
  grid?.querySelectorAll('.task-img-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url      = btn.dataset.url
      btn.disabled   = true
      const filename = url.split('/').pop()
      const r = await fetch(`${API_BASE}/tasks/${taskId}/images/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await r.json()
      if (!r.ok) { msgEl.textContent = data.error || '删除失败'; msgEl.style.color = '#e53935'; btn.disabled = false; return }
      _editingTask.images = data.images
      document.getElementById('taskImagesSection').outerHTML = renderTaskImagesSection(_editingTask)
      bindTaskImageEvents()
    })
  })

  // Upload
  document.getElementById('taskImgUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    msgEl.textContent = '上传中…'; msgEl.style.color = '#888'
    try {
      const b64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const r = await fetch(`${API_BASE}/tasks/${taskId}/images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: b64 }),
      })
      const data = await r.json()
      if (!r.ok) { msgEl.textContent = data.error || '上传失败'; msgEl.style.color = '#e53935'; return }
      msgEl.textContent = '✅ 上传成功'; msgEl.style.color = '#2d8a5a'
      _editingTask.images = data.images
      document.getElementById('taskImagesSection').outerHTML = renderTaskImagesSection(_editingTask)
      bindTaskImageEvents()
    } catch { msgEl.textContent = '上传失败，请重试'; msgEl.style.color = '#e53935' }
  })
}

// ── Phase editor ──────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'textarea',        label: '多行文本' },
  { value: 'repeating_text',  label: '多个问题输入框' },
  { value: 'checklist',       label: '复选清单' },
  { value: 'radio',           label: '单选' },
  { value: 'number',          label: '数字输入' },
  { value: 'table',           label: '多行表格' },
  { value: 'emoji_picker',    label: '表情选择' },
  { value: 'question_resolve',label: '回顾行前问题（行后专用）' },
]

function openPhaseEditor(taskId, tasks) {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  _editingTask  = JSON.parse(JSON.stringify(task))
  _editingPhase = 'before'

  // reset tab UI
  document.querySelectorAll('.pe-tab').forEach((b, i) => {
    b.classList.toggle('active', i === 0)
    b.onclick = () => {
      document.querySelectorAll('.pe-tab').forEach(x => x.classList.remove('active'))
      b.classList.add('active')
      _editingPhase = b.dataset.pePhase
      renderPhaseEditorBody()
    }
  })

  document.getElementById('phaseEditorTitle').textContent = `编辑阶段：${task.title}`
  document.getElementById('phaseEditorOverlay').style.display = 'flex'
  renderPhaseEditorBody()

  document.getElementById('phaseEditorClose').onclick =
  document.getElementById('phaseEditorCancel').onclick = () => {
    document.getElementById('phaseEditorOverlay').style.display = 'none'
  }

  document.getElementById('phaseEditorSave').onclick = async () => {
    const btn = document.getElementById('phaseEditorSave')
    btn.disabled = true; btn.textContent = '保存中…'
    const r = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_editingTask),
    })
    btn.disabled = false; btn.textContent = '保存任务'
    const d = await r.json()
    if (!r.ok) { alert(d.error || '保存失败'); return }
    document.getElementById('phaseEditorOverlay').style.display = 'none'
    renderTasks(document.getElementById('adminContent'))
  }
}

// All mutations go directly to _editingTask.phases[phase] object,
// so there's no separate "collect" step — we just re-render on changes.

function renderPhaseEditorBody() {
  const body  = document.getElementById('phaseEditorBody')
  const phase = _editingTask.phases?.[_editingPhase]
  if (!phase) { body.innerHTML = '<p style="padding:20px;color:#999">此阶段无数据</p>'; return }

  const isFileUpload = phase.mode === 'file_upload'

  body.innerHTML = `
    <div class="pe-body-inner">
      <div class="pe-mode-row">
        <span class="pe-mode-label">阶段模式：</span>
        <label class="pe-mode-opt"><input type="radio" name="phaseMode" value="form" ${!isFileUpload ? 'checked' : ''}/> 在线填表</label>
        <label class="pe-mode-opt"><input type="radio" name="phaseMode" value="file_upload" ${isFileUpload ? 'checked' : ''}/> 文件上传（纸质作业）</label>
      </div>

      ${isFileUpload
        ? `<p class="pe-upload-hint">文件上传模式：学生只需拍照上传纸质作业，无需配置字段。</p>`
        : `<div id="peSectionsRoot">${_editingPhase === 'during' ? renderSubPhaseCards() : renderSectionCards()}</div>
           <button class="pe-add-section-btn" id="peAddSection">＋ 添加${_editingPhase === 'during' ? '子阶段' : '区块'}</button>`}
    </div>
  `

  // Mode switch
  body.querySelectorAll('input[name="phaseMode"]').forEach(inp =>
    inp.addEventListener('change', () => { phase.mode = inp.value; renderPhaseEditorBody() }))

  if (!isFileUpload) bindSectionEditorEvents(body)
}

// ── Section cards (before / after) ───────────────────────

function renderSectionCards() {
  const sections = _editingTask.phases[_editingPhase].sections || []
  if (!sections.length)
    return `<p class="pe-empty">暂无区块，点击下方"添加区块"开始配置</p>`
  return sections.map((sec, si) => `
    <div class="pe-sec-card" data-si="${si}">
      <div class="pe-sec-header">
        <input class="pe-sec-input" placeholder="区块标题（如：最想弄清楚的问题）"
               value="${esc(sec.title||'')}" data-si="${si}" data-field="title"/>
        <input class="pe-sec-input pe-sec-hint-input" placeholder="提示文字（可选）"
               value="${esc(sec.hint||'')}" data-si="${si}" data-field="hint"/>
        <button class="pe-del-btn" data-si="${si}" title="删除此区块">✕</button>
      </div>
      <div class="pe-fields-list">
        ${(sec.fields||[]).map((f, fi) => renderFieldCard(f, si, fi)).join('')}
      </div>
      <button class="pe-add-field-btn" data-si="${si}">＋ 添加字段</button>
    </div>
  `).join('')
}

// ── SubPhase cards (during) ───────────────────────────────

function renderSubPhaseCards() {
  const subs = _editingTask.phases.during.subPhases || []
  if (!subs.length)
    return `<p class="pe-empty">暂无子阶段，点击下方"添加子阶段"开始配置</p>`
  return subs.map((sp, si) => `
    <div class="pe-sec-card" data-si="${si}">
      <div class="pe-sec-header">
        <input class="pe-sec-input" placeholder="子阶段名称（如：展厅探秘）" style="flex:1"
               value="${esc(sp.title||'')}" data-si="${si}" data-field="title"/>
        <input class="pe-sec-input" placeholder="图标" style="width:52px;text-align:center"
               value="${esc(sp.icon||'📝')}" data-si="${si}" data-field="icon"/>
        <button class="pe-del-btn" data-si="${si}" title="删除此子阶段">✕</button>
      </div>
      ${(sp.sections||[]).map((sec, seci) => `
        <div class="pe-subsec" data-si="${si}" data-seci="${seci}">
          <input class="pe-sec-input" placeholder="区块提示文字" style="width:100%;margin-bottom:6px"
                 value="${esc(sec.hint||'')}" data-si="${si}" data-seci="${seci}" data-field="hint"/>
          <div class="pe-fields-list">
            ${(sec.fields||[]).map((f, fi) => renderFieldCard(f, si, fi, seci)).join('')}
          </div>
          <button class="pe-add-field-btn" data-si="${si}" data-seci="${seci}">＋ 添加字段</button>
        </div>
      `).join('')}
    </div>
  `).join('')
}

// ── Field card ────────────────────────────────────────────

function renderFieldCard(f, si, fi, seci) {
  // seci is defined for during subPhase sections
  const hasSeci = seci !== undefined
  const typeLabel = FIELD_TYPES.find(t => t.value === f.type)?.label || f.type
  return `
    <div class="pe-field-card" data-si="${si}" data-fi="${fi}" ${hasSeci ? `data-seci="${seci}"` : ''}>
      <div class="pe-field-header">
        <span class="pe-field-type-badge">${typeLabel}</span>
        <button class="pe-field-edit-btn" data-si="${si}" data-fi="${fi}" ${hasSeci ? `data-seci="${seci}"` : ''}>编辑</button>
        <button class="pe-del-btn pe-del-field" data-si="${si}" data-fi="${fi}" ${hasSeci ? `data-seci="${seci}"` : ''} title="删除">✕</button>
      </div>
      <div class="pe-field-summary">${fieldSummary(f)}</div>
      <div class="pe-field-editor" id="pe-fe-${si}-${hasSeci ? seci+'-' : ''}${fi}" style="display:none"></div>
    </div>
  `
}

function fieldSummary(f) {
  switch (f.type) {
    case 'textarea':        return esc(f.label || f.placeholder || '多行文本')
    case 'repeating_text':  return `${f.count || 3} 个输入框 · ${(f.placeholders||[]).filter(Boolean).join(' / ') || '问题输入'}`
    case 'checklist':       return `选项：${(f.options||[]).join('、') || '（未设置）'}${f.hasOther?' + 其他':''}`
    case 'radio':           return `选项：${(f.options||[]).join('、') || '（未设置）'}`
    case 'number':          return esc(f.label || '数字输入')
    case 'table':           return `${f.rows||4}行 · 列：${(f.columns||[]).map(c=>c.label||c.id).join('、') || '（未设置）'}`
    case 'emoji_picker':    return `${(f.options||[]).join(' ')} ${f.label ? '· '+esc(f.label) : ''}`
    case 'question_resolve':return '自动读取行前问题'
    default:                return f.id || ''
  }
}

// ── Field inline editor ───────────────────────────────────

function renderFieldEditor(f) {
  const id = `fid_${Date.now()}`
  switch (f.type) {
    case 'textarea': return `
      <div class="pe-fe-row"><label>标签文字</label><input class="pe-fi" data-fk="label" value="${esc(f.label||'')}"/></div>
      <div class="pe-fe-row"><label>占位文字</label><input class="pe-fi" data-fk="placeholder" value="${esc(f.placeholder||'')}"/></div>
      <div class="pe-fe-row"><label>行数</label><input class="pe-fi" type="number" min="2" max="20" data-fk="rows" value="${f.rows||3}" style="width:60px"/></div>`

    case 'repeating_text': return `
      <div class="pe-fe-row"><label>数量</label><input class="pe-fi" type="number" min="1" max="10" data-fk="count" value="${f.count||3}" style="width:60px"/></div>
      <div class="pe-fe-row"><label>占位文字<br/><span style="font-size:11px;color:#999">每行一个（对应每个输入框）</span></label>
        <textarea class="pe-fi pe-fi-ta" data-fk="placeholders">${(f.placeholders||[]).join('\n')}</textarea></div>`

    case 'checklist': return `
      <div class="pe-fe-row"><label>选项<br/><span style="font-size:11px;color:#999">每行一个</span></label>
        <textarea class="pe-fi pe-fi-ta" data-fk="options">${(f.options||[]).join('\n')}</textarea></div>
      <div class="pe-fe-row"><label>包含"其他"输入框</label>
        <input type="checkbox" data-fk="hasOther" ${f.hasOther?'checked':''}/></div>`

    case 'radio': return `
      <div class="pe-fe-row"><label>选项<br/><span style="font-size:11px;color:#999">每行一个</span></label>
        <textarea class="pe-fi pe-fi-ta" data-fk="options">${(f.options||[]).join('\n')}</textarea></div>`

    case 'number': return `
      <div class="pe-fe-row"><label>标签<br/><span style="font-size:11px;color:#999">用 ___ 标记数字框位置<br/>如：我一共发现了___个秘密！</span></label>
        <input class="pe-fi" data-fk="label" value="${esc(f.label||'')}"/></div>
      <div class="pe-fe-row"><label>占位文字</label><input class="pe-fi" data-fk="placeholder" value="${esc(f.placeholder||'')}"/></div>`

    case 'table': return `
      <div class="pe-fe-row"><label>行数</label><input class="pe-fi" type="number" min="1" max="20" data-fk="rows" value="${f.rows||4}" style="width:60px"/></div>
      <div class="pe-fe-row"><label>行标签</label><input class="pe-fi" data-fk="rowLabel" value="${esc(f.rowLabel||'行')}"/></div>
      <div class="pe-fe-row"><label>列定义<br/><span style="font-size:11px;color:#999">每行：列名称,占位文字</span></label>
        <textarea class="pe-fi pe-fi-ta" data-fk="columns">${(f.columns||[]).map(c=>`${c.label||c.id},${c.placeholder||''}`).join('\n')}</textarea></div>`

    case 'emoji_picker': return `
      <div class="pe-fe-row"><label>标签文字</label><input class="pe-fi" data-fk="label" value="${esc(f.label||'')}"/></div>
      <div class="pe-fe-row"><label>表情列表<br/><span style="font-size:11px;color:#999">空格分隔</span></label>
        <input class="pe-fi" data-fk="options" value="${(f.options||[]).join(' ')}"/></div>`

    case 'question_resolve': return `
      <p style="color:#888;font-size:13px;padding:4px 0">自动读取行前阶段的问题，无需配置。</p>`

    default: return '<p style="color:#aaa;font-size:13px">不支持此字段类型的可视化编辑</p>'
  }
}

function collectFieldFromEditor(editorEl, f) {
  editorEl.querySelectorAll('[data-fk]').forEach(inp => {
    const k = inp.dataset.fk
    if (inp.type === 'checkbox') {
      f[k] = inp.checked
    } else if (k === 'placeholders') {
      f[k] = inp.value.split('\n').map(s => s.trim())
    } else if (k === 'options' && f.type === 'checklist') {
      f[k] = inp.value.split('\n').map(s => s.trim()).filter(Boolean)
    } else if (k === 'options' && f.type === 'radio') {
      f[k] = inp.value.split('\n').map(s => s.trim()).filter(Boolean)
    } else if (k === 'options' && f.type === 'emoji_picker') {
      f[k] = inp.value.split(/\s+/).filter(Boolean)
    } else if (k === 'columns') {
      f[k] = inp.value.split('\n').map(s => {
        const [label, placeholder] = s.split(',').map(x => x.trim())
        return { id: label.replace(/\s+/g, '_').toLowerCase() || 'col', label: label || 'col', placeholder: placeholder || label }
      }).filter(c => c.label)
    } else if (k === 'rows' || k === 'count') {
      f[k] = parseInt(inp.value) || f[k]
    } else {
      f[k] = inp.value
    }
  })
}

// ── Bind all phase editor events ─────────────────────────

function bindSectionEditorEvents(body) {
  const phase = _editingTask.phases[_editingPhase]
  const isDuring = _editingPhase === 'during'

  // Live-update section title / hint / icon
  body.querySelectorAll('[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const si   = parseInt(inp.dataset.si)
      const seci = inp.dataset.seci !== undefined ? parseInt(inp.dataset.seci) : undefined
      const key  = inp.dataset.field
      if (isDuring) {
        const sp = phase.subPhases[si]
        if (seci !== undefined) {
          if (!sp.sections[seci]) return
          sp.sections[seci][key] = inp.value
        } else {
          sp[key] = inp.value
        }
      } else {
        phase.sections[si][key] = inp.value
      }
    })
  })

  // Delete section / subPhase
  body.querySelectorAll('.pe-del-btn:not(.pe-del-field)').forEach(btn => {
    btn.addEventListener('click', () => {
      const si = parseInt(btn.dataset.si)
      if (isDuring) phase.subPhases.splice(si, 1)
      else          phase.sections.splice(si, 1)
      renderPhaseEditorBody()
    })
  })

  // Delete field
  body.querySelectorAll('.pe-del-field').forEach(btn => {
    btn.addEventListener('click', () => {
      const si   = parseInt(btn.dataset.si)
      const fi   = parseInt(btn.dataset.fi)
      const seci = btn.dataset.seci !== undefined ? parseInt(btn.dataset.seci) : undefined
      const fields = getFieldsArray(si, seci)
      fields.splice(fi, 1)
      renderPhaseEditorBody()
    })
  })

  // Toggle field inline editor
  body.querySelectorAll('.pe-field-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const si   = parseInt(btn.dataset.si)
      const fi   = parseInt(btn.dataset.fi)
      const seci = btn.dataset.seci !== undefined ? parseInt(btn.dataset.seci) : undefined
      const edId = `pe-fe-${si}-${seci !== undefined ? seci+'-' : ''}${fi}`
      const ed   = document.getElementById(edId)
      if (!ed) return
      const f = getFieldsArray(si, seci)[fi]
      if (ed.style.display === 'none') {
        ed.innerHTML = renderFieldEditor(f)
        ed.style.display = 'block'
        btn.textContent = '收起'
        // on any input, immediately collect into f
        ed.addEventListener('input',  () => collectFieldFromEditor(ed, f))
        ed.addEventListener('change', () => collectFieldFromEditor(ed, f))
      } else {
        collectFieldFromEditor(ed, f)
        ed.style.display = 'none'
        btn.textContent = '编辑'
        // refresh summary
        const card = btn.closest('.pe-field-card')
        if (card) card.querySelector('.pe-field-summary').textContent = fieldSummary(f)
      }
    })
  })

  // Add field button
  body.querySelectorAll('.pe-add-field-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const si   = parseInt(btn.dataset.si)
      const seci = btn.dataset.seci !== undefined ? parseInt(btn.dataset.seci) : undefined
      const newField = { id: `f_${Date.now()}`, type: 'textarea', label: '', placeholder: '', rows: 3 }
      getFieldsArray(si, seci).push(newField)
      renderPhaseEditorBody()

      // Auto-open the editor of the new field
      const fields = getFieldsArray(si, seci)
      const fi = fields.length - 1
      const edId = `pe-fe-${si}-${seci !== undefined ? seci+'-' : ''}${fi}`
      const ed  = document.getElementById(edId)
      if (ed) {
        // Show a type picker first
        ed.innerHTML = renderTypePickerHtml(si, fi, seci)
        ed.style.display = 'block'
        bindTypePickerEvents(ed, si, fi, seci)
      }
    })
  })

  // Add section button
  document.getElementById('peAddSection')?.addEventListener('click', () => {
    if (isDuring) {
      const sp = phase.subPhases || []
      const n  = sp.length + 1
      sp.push({
        n, icon: '📝', title: `子阶段 ${n}`,
        doneKey: `sub${n}Done`, isLast: false,
        sections: [{ id: `sec_${Date.now()}`, targetKey: null, hint: '', fields: [] }],
      })
      // Mark last subPhase as isLast
      sp.forEach((s, i) => { s.isLast = (i === sp.length - 1) })
      phase.subPhases = sp
    } else {
      phase.sections.push({ id: `sec_${Date.now()}`, targetKey: null, title: '', hint: '', fields: [] })
    }
    renderPhaseEditorBody()
  })
}

function renderTypePickerHtml(si, fi, seci) {
  return `
    <div style="padding:8px 0">
      <label style="font-size:12px;color:#888;display:block;margin-bottom:6px">选择字段类型：</label>
      <select class="pe-type-picker field-select" style="width:100%">
        ${FIELD_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
      </select>
      <div class="pe-type-config" style="margin-top:8px"></div>
    </div>`
}

function bindTypePickerEvents(ed, si, fi, seci) {
  const sel = ed.querySelector('.pe-type-picker')
  const cfg = ed.querySelector('.pe-type-config')
  const f   = getFieldsArray(si, seci)[fi]

  function applyType(type) {
    f.type = type
    // Set defaults for the chosen type
    if (type === 'repeating_text') { f.count = 3; f.placeholders = [] }
    if (type === 'checklist')  { f.options = []; f.hasOther = false }
    if (type === 'radio')      { f.options = [] }
    if (type === 'table')      { f.rows = 4; f.rowLabel = '行'; f.columns = [{ id:'name', label:'名称', placeholder:'名称' }] }
    if (type === 'emoji_picker') { f.options = ['😊','🤔','😄','💪'] }
    cfg.innerHTML = renderFieldEditor(f)
    cfg.addEventListener('input',  () => collectFieldFromEditor(cfg, f))
    cfg.addEventListener('change', () => collectFieldFromEditor(cfg, f))
    // update the edit button in the card
    const card = ed.closest('.pe-field-card')
    if (card) {
      card.querySelector('.pe-field-type-badge').textContent = FIELD_TYPES.find(t=>t.value===type)?.label || type
    }
  }

  applyType(f.type || 'textarea')
  sel.addEventListener('change', () => applyType(sel.value))
}

function getFieldsArray(si, seci) {
  const phase = _editingTask.phases[_editingPhase]
  if (_editingPhase === 'during') {
    const sp = phase.subPhases[si]
    if (seci !== undefined) return sp.sections[seci].fields || (sp.sections[seci].fields = [])
    return sp.sections[0].fields || (sp.sections[0].fields = [])
  }
  return phase.sections[si].fields || (phase.sections[si].fields = [])
}

// ── Records view ──────────────────────────────────────────
async function renderRecords(content) {
  content.innerHTML = `<div class="empty-state"><div style="font-size:32px">⏳</div><p>加载中…</p></div>`

  let groups = [], allTasks = []
  try {
    const [gr, tr] = await Promise.all([
      fetch(`${API_BASE}/groups`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/tasks`).then(r => r.ok ? r.json() : []),
    ])
    groups   = gr
    allTasks = tr
  } catch (_) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:40px">⚠️</div><p>无法连接服务器，请确认 API 服务正在运行。</p></div>`
    return
  }

  if (!groups.length) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:48px">📓</div><p>暂无研学记录</p></div>`
    return
  }

  const fullData = await Promise.all(groups.map(async g => {
    try {
      const r = await fetch(`${API_BASE}/groups/${g.code}/full`)
      return r.ok ? await r.json() : g
    } catch { return g }
  }))

  const taskMap = {}
  allTasks.forEach(t => { taskMap[t.id] = t })

  function buildCard(d) {
    if (!d.password) return `
      <div class="rec-card rec-card--inactive">
        <div class="rec-card-head">
          <span class="rec-code">${esc(d.code)}</span>
          <span class="rec-badge rec-badge--inactive">未激活</span>
        </div>
        <div class="rec-inactive-hint">尚未开始填写</div>
      </div>`

    // Dynamic card if taskId is set and task has phases
    const task = d.taskId ? taskMap[d.taskId] : null
    if (task?.phases) return buildCardDynamic(d, task)
    return buildCardLegacy(d)
  }

  function buildCardDynamic(d, task) {
    const members = (d.members || []).map(esc).join(' · ') || '—'
    const updated = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('zh-CN') : '—'
    const phases  = task.phases

    function phaseHtml(phaseKey, phaseLabel) {
      const phaseData = d[phaseKey] || {}
      const phaseDef  = phases[phaseKey === 'phase1' ? 'before' : phaseKey === 'phase2' ? 'during' : 'after']
      if (!phaseDef) return `<div class="rec-empty-phase">—</div>`

      if (phaseDef.mode === 'file_upload') {
        const files = phaseData.files || []
        return files.length
          ? `<div class="rec-file-grid">${files.map(f => {
              const url = `${API_BASE}/uploads/groups/${esc(d.code)}/${esc(f.id)}`
              return f.type?.startsWith('image/')
                ? `<img class="rec-file-thumb" src="${url}" alt="${esc(f.filename)}" title="${esc(f.filename)}"/>`
                : `<span class="rec-file-icon" title="${esc(f.filename)}">${f.type==='application/pdf'?'📄':'📝'} ${esc(f.filename)}</span>`
            }).join('')}</div>`
          : `<div class="rec-empty-phase">— 未上传 —</div>`
      }

      // Form mode
      const sections  = phaseDef.sections || []
      let html = ''

      // Handle question_resolve specially
      const questions = (d.phase1?.questions || []).filter(q => q?.trim())

      for (const sec of sections) {
        for (const field of (sec.fields || [])) {
          const target = sec.targetKey ? (phaseData[sec.targetKey] || {}) : phaseData

          if (field.type === 'question_resolve') {
            const resolved = target[field.id] || {}
            html += questions.map((q, i) => {
              const ans = resolved[i]
              const label = ans === 'yes' ? '✅ 解决了' : ans === 'no' ? '🤔 还不清楚' : '未作答'
              return row(esc(q), label)
            }).join('')
          } else {
            html += renderFieldRec(field, target)
          }
        }
      }

      // Also handle "during" subPhases
      if (phaseDef.subPhases) {
        for (const sp of phaseDef.subPhases) {
          for (const sec of (sp.sections || [])) {
            const target = sec.targetKey ? (phaseData[sec.targetKey] || {}) : phaseData
            for (const f of (sec.fields || [])) {
              html += renderFieldRec(f, target)
            }
          }
        }
      }

      return html || '<div class="rec-empty-phase">— 未填写 —</div>'
    }

    return `
      <div class="rec-card">
        <div class="rec-card-head">
          <div class="rec-card-head-top">
            <span class="rec-code">${esc(d.code)}</span>
            <span class="rec-badge rec-badge--active">已激活</span>
            <span class="rec-pin-display">🔑 ${esc(d.password)}</span>
          </div>
          <div class="rec-school">${esc(d.school) || '—'}</div>
          <div class="rec-members">${members}<span class="rec-updated">· 更新：${updated}</span></div>
        </div>
        <div class="rec-card-body">
          <div class="rec-phase rec-phase--1">
            <div class="rec-phase-title">📋 ${esc(task.phases.before?.title || '行前准备')}</div>
            ${phaseHtml('phase1', 'before')}
          </div>
          <div class="rec-phase rec-phase--2">
            <div class="rec-phase-title">🔍 ${esc(task.phases.during?.title || '行中探索')}</div>
            ${phaseHtml('phase2', 'during')}
          </div>
          <div class="rec-phase rec-phase--3">
            <div class="rec-phase-title">✏️ ${esc(task.phases.after?.title || '行后总结')}</div>
            ${phaseHtml('phase3', 'after')}
          </div>
        </div>
      </div>`
  }

  function renderFieldRec(field, data) {
    const val = data?.[field.id]
    if (val === undefined || val === null || val === '') return ''
    switch (field.type) {
      case 'repeating_text': {
        const arr = Array.isArray(val) ? val.filter(v => v?.trim()) : []
        return arr.map((q, i) => row(`Q${i+1}`, esc(q))).join('')
      }
      case 'checklist': {
        const arr = Array.isArray(val) ? val : []
        return arr.length ? row(esc(field.title || '携带物品'), arr.map(esc).join('、')) : ''
      }
      case 'radio':   return val ? row(esc(field.title || '选择'), esc(val)) : ''
      case 'textarea': return val ? row(esc(field.label || field.title || ''), esc(val)) : ''
      case 'number':  return val !== '' ? row('发现数量', esc(val)) : ''
      case 'table': {
        const arr = Array.isArray(val) ? val.filter(r => Object.values(r).some(v => v)) : []
        if (!arr.length) return ''
        const cols = field.columns || []
        return row('设备记录', arr.map(r => cols.map(c => esc(r[c.id]||'')).join('（') + '）').join('<br>'))
      }
      case 'emoji_picker': return val ? row('心情', esc(val)) : ''
      default: return ''
    }
  }

  function buildCardLegacy(d) {
    const p1 = d.phase1 || {}
    const p2 = d.phase2 || {}
    const p3 = d.phase3 || {}
    const qs   = p1.questions || []
    const sub1 = p2.exhibition || {}
    const sub2 = Array.isArray(p2.equipment) ? p2.equipment : []
    const sub3 = p2.extra || {}
    const resolved = p3.resolved || {}
    const members = (d.members || []).map(esc).join(' · ') || '—'
    const updated = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('zh-CN') : '—'

    const p1html = (p1.route || qs.length)
      ? qs.map((q, i) => row(`Q${i+1}`, esc(q))).join('') +
        row('选择线路', esc(p1.route)) +
        row('携带物品', (p1.items||[]).map(esc).join('、'))
      : '<div class="rec-empty-phase">— 未填写 —</div>'

    const eqList = sub2.map(eq => `${esc(eq?.name)}（${esc(eq?.function)}）`).join('<br>')
    const p2html = (sub1.d1 || sub2.length || sub3.text)
      ? [sub1.d1,sub1.d2,sub1.d3].map((s,i)=>row(`发现${i+1}`,esc(s))).join('') +
        (sub2.length ? row('高科技设备', eqList) : '') +
        row('我还发现', esc(sub3.text)) +
        row('此刻心情', esc(sub3.mood))
      : '<div class="rec-empty-phase">— 未填写 —</div>'

    const resolveRows = qs.filter(q=>q?.trim()).map((q,i) => {
      const ans = resolved[i]
      const label = ans==='yes' ? '✅ 解决了' : ans==='no' ? '🤔 还不清楚' : '未作答'
      return row(esc(q), label)
    }).join('')
    const p3html = (p3.reflection || resolveRows)
      ? resolveRows + row('最大收获', esc(p3.reflection)) + row('整体心情', esc(p3.finalMood))
      : '<div class="rec-empty-phase">— 未填写 —</div>'

    return `
      <div class="rec-card">
        <div class="rec-card-head">
          <div class="rec-card-head-top">
            <span class="rec-code">${esc(d.code)}</span>
            <span class="rec-badge rec-badge--active">已激活</span>
            <span class="rec-pin-display">🔑 ${esc(d.password)}</span>
          </div>
          <div class="rec-school">${esc(d.school) || '—'}</div>
          <div class="rec-members">${members}<span class="rec-updated">· 更新：${updated}</span></div>
        </div>
        <div class="rec-card-body">
          <div class="rec-phase rec-phase--1"><div class="rec-phase-title">📋 行前准备</div>${p1html}</div>
          <div class="rec-phase rec-phase--2"><div class="rec-phase-title">🔍 行中探索</div>${p2html}</div>
          <div class="rec-phase rec-phase--3"><div class="rec-phase-title">✏️ 行后总结</div>${p3html}</div>
        </div>
      </div>`
  }

  const row = (label, val) =>
    `<div class="rec-row"><span class="rec-row-label">${label}</span><span class="rec-row-val">${val || '<span class="rec-empty">未填写</span>'}</span></div>`

  // Build task filter options: only tasks that have at least one group bound
  const usedTaskIds = new Set(fullData.map(d => d.taskId).filter(Boolean))
  const filterableTasks = allTasks.filter(t => usedTaskIds.has(t.id))
  const hasUnbound = fullData.some(d => !d.taskId && d.password)

  const filterOpts = [
    `<option value="">全部（${fullData.length} 组）</option>`,
    ...filterableTasks.map(t => {
      const cnt = fullData.filter(d => d.taskId === t.id).length
      return `<option value="${t.id}">${esc(t.title)}（${cnt} 组）</option>`
    }),
    ...(hasUnbound ? [`<option value="__unbound__">未绑定任务（${fullData.filter(d => !d.taskId && d.password).length} 组）</option>`] : []),
  ].join('')

  const PER = 3
  let page = 0
  let filterVal = ''

  content.innerHTML = `
    <div class="rec-filter-bar">
      <label style="font-size:13px;color:#555;font-weight:600">按研学任务筛选：</label>
      <select id="recTaskFilter" style="height:34px;border:1.5px solid #e0dbd0;border-radius:8px;padding:0 10px;font-size:13px;outline:none;min-width:200px">
        ${filterOpts}
      </select>
    </div>
    <div class="rec-wrapper">
      <div class="rec-nav">
        <button class="rec-arrow rec-prev">‹</button>
        <div class="rec-cards"></div>
        <button class="rec-arrow rec-next">›</button>
      </div>
      <div class="rec-pager"></div>
    </div>`

  const cardsEl  = content.querySelector('.rec-cards')
  const pagerEl  = content.querySelector('.rec-pager')
  const prevBtn  = content.querySelector('.rec-prev')
  const nextBtn  = content.querySelector('.rec-next')
  const filterEl = content.querySelector('#recTaskFilter')

  function getFiltered() {
    if (!filterVal) return fullData
    if (filterVal === '__unbound__') return fullData.filter(d => !d.taskId && d.password)
    const tid = parseInt(filterVal)
    return fullData.filter(d => d.taskId === tid)
  }

  function renderPage() {
    const filtered = getFiltered()
    const total    = filtered.length
    const maxPage  = Math.max(0, Math.ceil(total / PER) - 1)
    if (page > maxPage) page = maxPage
    const start    = page * PER
    const slice    = filtered.slice(start, start + PER)
    const empties  = PER - slice.length
    cardsEl.innerHTML = slice.map(buildCard).join('') +
      Array(empties).fill('<div class="rec-card rec-card--placeholder"></div>').join('')
    prevBtn.disabled = page === 0
    nextBtn.disabled = page >= maxPage
    const show = total > PER
    prevBtn.style.visibility = show ? 'visible' : 'hidden'
    nextBtn.style.visibility = show ? 'visible' : 'hidden'
    pagerEl.textContent = total > PER
      ? `第 ${start+1}–${Math.min(start+PER, total)} 组 / 共 ${total} 组`
      : `共 ${total} 组`
  }

  filterEl.addEventListener('change', () => { filterVal = filterEl.value; page = 0; renderPage() })
  prevBtn.addEventListener('click', () => { page--; renderPage() })
  nextBtn.addEventListener('click', () => { page++; renderPage() })
  renderPage()
}

// ── Export ───────────────────────────────────────────────
function exportJSON() {
  const data = get(currentSection, DEFAULTS[currentSection] || [])
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `${currentSection}.json`
  a.click()
  URL.revokeObjectURL(url)
}
