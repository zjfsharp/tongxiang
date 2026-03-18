import routesDefault from '../src/data/routes.json'
import coursesDefault from '../src/data/courses.json'
import inheritorsDefault from '../src/data/inheritors.json'

const PASSWORD = 'tongxiang2026'
const PREFIX = 'tongxiang_'
const API_BASE = `${location.origin}/txyx/api`

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
const TITLES = { routes: '线路管理', courses: '课程管理', inheritors: '传承人管理', groups: '小组管理', records: '研学记录' }

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
    const isSpecial = currentSection === 'records' || currentSection === 'groups'
    document.getElementById('addBtn').style.display = isSpecial ? 'none' : 'block'
    document.getElementById('exportBtn').style.display = isSpecial ? 'none' : 'block'
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

  if (section === 'records') { renderRecords(content); return }
  if (section === 'groups')  { renderGroups(content);  return }

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

async function renderRecords(content) {
  content.innerHTML = `<div class="empty-state"><div style="font-size:32px">⏳</div><p>加载中…</p></div>`

  let groups = []
  try {
    const res = await fetch(`${API_BASE}/groups`)
    if (res.ok) groups = await res.json()
  } catch (_) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:40px">⚠️</div><p>无法连接服务器，请确认 API 服务正在运行。</p></div>`
    return
  }

  if (!groups.length) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:48px">📓</div><p>暂无研学记录</p></div>`
    return
  }

  // 并发拉取所有组的完整数据（含密码和内容）
  const fullData = await Promise.all(groups.map(async g => {
    try {
      const r = await fetch(`${API_BASE}/groups/${g.code}/full`)
      return r.ok ? await r.json() : g
    } catch { return g }
  }))

  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const row = (label, val) =>
    `<div class="rec-row"><span class="rec-row-label">${label}</span><span class="rec-row-val">${val || '<span class="rec-empty">未填写</span>'}</span></div>`

  function buildCard(d) {
    if (!d.password) return `
      <div class="rec-card rec-card--inactive">
        <div class="rec-card-head">
          <span class="rec-code">${esc(d.code)}</span>
          <span class="rec-badge rec-badge--inactive">未激活</span>
        </div>
        <div class="rec-inactive-hint">尚未开始填写</div>
      </div>`

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
      ? qs.map((q,i) => row(`Q${i+1}`, esc(q))).join('') +
        row('选择线路', esc(p1.route)) +
        row('携带物品', (p1.items||[]).map(esc).join('、'))
      : '<div class="rec-empty-phase">— 未填写 —</div>'

    const eqList = sub2.map(eq=>`${esc(eq?.name)}（${esc(eq?.function)}）`).join('<br>')
    const p2html = (sub1.d1 || sub2.length || sub3.text)
      ? [sub1.d1,sub1.d2,sub1.d3].map((s,i)=>row(`发现${i+1}`,esc(s))).join('') +
        (sub2.length ? row('高科技设备', eqList) : '') +
        row('我还发现', esc(sub3.text)) +
        row('此刻心情', esc(sub3.mood))
      : '<div class="rec-empty-phase">— 未填写 —</div>'

    const resolveRows = qs.filter(q=>q?.trim()).map((q,i)=>{
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
          <div class="rec-phase rec-phase--1">
            <div class="rec-phase-title">📋 行前准备</div>
            ${p1html}
          </div>
          <div class="rec-phase rec-phase--2">
            <div class="rec-phase-title">🔍 行中探索</div>
            ${p2html}
          </div>
          <div class="rec-phase rec-phase--3">
            <div class="rec-phase-title">✏️ 行后总结</div>
            ${p3html}
          </div>
        </div>
      </div>`
  }

  const PER = 3
  let page = 0
  const total = fullData.length
  const maxPage = Math.ceil(total / PER) - 1

  content.innerHTML = `
    <div class="rec-wrapper">
      <div class="rec-nav">
        <button class="rec-arrow rec-prev">‹</button>
        <div class="rec-cards"></div>
        <button class="rec-arrow rec-next">›</button>
      </div>
      <div class="rec-pager"></div>
    </div>`

  const cardsEl = content.querySelector('.rec-cards')
  const pagerEl = content.querySelector('.rec-pager')
  const prevBtn = content.querySelector('.rec-prev')
  const nextBtn = content.querySelector('.rec-next')

  function renderPage() {
    const start = page * PER
    const slice = fullData.slice(start, start + PER)
    const empties = PER - slice.length
    cardsEl.innerHTML = slice.map(buildCard).join('') +
      Array(empties).fill('<div class="rec-card rec-card--placeholder"></div>').join('')
    prevBtn.disabled = page === 0
    nextBtn.disabled = page >= maxPage
    pagerEl.textContent = total > PER
      ? `第 ${start+1}–${Math.min(start+PER, total)} 组 / 共 ${total} 组`
      : `共 ${total} 组`
    if (total <= PER) { prevBtn.style.visibility='hidden'; nextBtn.style.visibility='hidden' }
  }

  prevBtn.addEventListener('click', () => { page--; renderPage() })
  nextBtn.addEventListener('click', () => { page++; renderPage() })
  renderPage()
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

  let groups = []
  try {
    const res = await fetch(`${API_BASE}/groups`)
    if (res.ok) groups = await res.json()
  } catch (_) {
    content.innerHTML = `<div class="empty-state"><div style="font-size:40px">⚠️</div><p>无法连接服务器</p></div>`
    return
  }

  content.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:600;color:#555;margin-bottom:10px">新建小组</div>
      <div style="display:flex;gap:10px;align-items:center">
        <input id="newGroupCode" type="text" placeholder="输入组号，如 A1、第三组"
               style="height:40px;border:1.5px solid #e0dbd0;border-radius:8px;padding:0 12px;font-size:14px;width:200px;outline:none"/>
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
        return `
          <div class="data-item">
            <div class="data-item-main">
              <div class="data-item-title" style="display:flex;align-items:center;gap:10px">
                <strong style="font-size:18px;font-family:monospace">${g.code}</strong>
                ${badge}
                ${activated ? `<span style="font-size:13px;color:#999">${(g.members||[]).join('、')||'未设置成员'}</span>` : ''}
              </div>
              <div class="data-item-meta">
                <span>${activated ? (g.school||'未知学校') : '学生尚未首次登录'}</span>
                <span style="margin:0 6px">·</span>
                <span>最后更新：${updated}</span>
              </div>
            </div>
            <div class="data-item-actions">
              ${!activated ? `<button class="btn-delete" data-code="${g.code}">删除</button>` : ''}
            </div>
          </div>
        `
      }).join('') : '<div style="text-align:center;padding:40px;color:#aaa">暂无小组，请先创建</div>'}
    </div>
  `

  // Add group
  document.getElementById('addGroupBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('newGroupCode')?.value.trim()
    const msg  = document.getElementById('addGroupMsg')
    if (!code) { msg.textContent = '请输入组号'; msg.style.color = '#e53935'; return }
    msg.textContent = '创建中…'; msg.style.color = '#888'
    try {
      const res = await fetch(`${API_BASE}/groups/${encodeURIComponent(code)}`, { method: 'PUT' })
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

  // Delete group
  content.querySelectorAll('.btn-delete[data-code]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`确认删除小组 "${btn.dataset.code}"？`)) return
      try {
        const res = await fetch(`${API_BASE}/groups/${encodeURIComponent(btn.dataset.code)}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) { alert(data.error || '删除失败'); return }
        renderGroups(content)
      } catch { alert('网络异常') }
    })
  })
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
