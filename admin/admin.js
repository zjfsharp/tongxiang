import routesDefault from '../src/data/routes.json'
import coursesDefault from '../src/data/courses.json'
import inheritorsDefault from '../src/data/inheritors.json'
import tasksDefault from '../src/data/tasks.json'

const PASSWORD = 'tongxiang2026'
const PREFIX = 'tongxiang_'

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
const DEFAULTS = { routes: routesDefault, courses: coursesDefault, inheritors: inheritorsDefault, tasks: tasksDefault }
const TITLES = { routes: '线路管理', courses: '课程管理', inheritors: '传承人管理', tasks: '任务管理', submissions: '报名记录' }

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
    document.getElementById('addBtn').style.display = currentSection === 'submissions' ? 'none' : 'block'
    renderSection(currentSection)
  })
})

document.getElementById('addBtn').addEventListener('click', () => openModal(null))
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

  if (section === 'submissions') {
    renderSubmissions(content)
    return
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
  } else if (section === 'tasks') {
    title = item.title
    meta = `${item.grade} · ${item.location} · ${item.status} · 已报名 ${item.enrolled}/${item.capacity}`
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

function renderSubmissions(content) {
  const submissions = get('submissions', [])
  if (!submissions.length) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:48px">📬</div><p>暂无报名记录</p></div>`
    return
  }
  content.innerHTML = `<div class="data-list">${submissions.map((s, i) => `
    <div class="submission-item">
      <div class="submission-title">${s.school || '未知学校'} · ${s.contact || ''}</div>
      <div class="submission-meta">
        <span>📞 ${s.phone || '—'}</span>
        <span>🎓 ${s.grade || '—'}</span>
        <span>👥 ${s.headcount || '—'}人</span>
        <span>📅 ${s.date || '待定'}</span>
        <span>🗺️ ${Array.isArray(s.routes) ? s.routes.join(', ') : '未选择'}</span>
        <span style="margin-left:auto;color:#aaa">提交于 ${new Date(s.submittedAt).toLocaleString('zh-CN')}</span>
      </div>
      ${s.remarks ? `<div style="margin-top:8px;font-size:13px;color:#666">💬 ${s.remarks}</div>` : ''}
    </div>
  `).join('')}</div>`
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
  if (section === 'tasks') return `
    ${field('title', '任务标题', v('title'), 'text')}
    ${field('description', '任务描述', v('description'), 'textarea')}
    ${field('grade', '适合年级', v('grade'), 'text', '如：三至五年级')}
    ${field('location', '活动地点', v('location'), 'text')}
    ${field('duration', '时长', v('duration'), 'text', '如：半天')}
    ${field('capacity', '名额', v('capacity', 30), 'number')}
    ${field('enrolled', '已报名', v('enrolled', 0), 'number')}
    ${selectField('status', '状态', v('status', '招募中'), ['招募中','即将开始','已满'])}
    ${field('startDate', '开始日期', v('startDate'), 'date')}
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
  if (currentSection === 'tasks') {
    formData.capacity = parseInt(formData.capacity) || 30
    formData.enrolled = parseInt(formData.enrolled) || 0
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

// ── Export ───────────────────────────────────────────────
function exportJSON() {
  const data = get(currentSection, DEFAULTS[currentSection] || [])
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentSection}.json`
  a.click()
  URL.revokeObjectURL(url)
}
