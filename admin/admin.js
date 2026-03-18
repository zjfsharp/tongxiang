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

  const phaseLabel = { before: '行前', during: '行中', after: '行后' }
  const items = groups.map(g => {
    const phase = phaseLabel[g.phase] || g.phase || '行前'
    const school = g.school ? `${g.school} · ` : ''
    const updated = g.updatedAt ? new Date(g.updatedAt).toLocaleString('zh-CN') : '—'
    return `
      <div class="data-item record-item" data-code="${g.code}" style="cursor:pointer">
        <div class="data-item-main">
          <div class="data-item-title">
            ${school}${g.members?.join('、') || '—'}
            <span style="margin-left:10px;font-size:12px;background:#e8f5e9;color:#2d8a5a;padding:2px 8px;border-radius:20px">${phase}</span>
          </div>
          <div class="data-item-meta">
            <span>小组码：<strong>${g.code}</strong></span>
            <span style="margin:0 8px">·</span>
            <span>成员 ${g.members?.length || 0} 人</span>
            <span style="margin:0 8px">·</span>
            <span>最后更新：${updated}</span>
          </div>
        </div>
        <div class="data-item-actions">
          <button class="btn-view-record" data-code="${g.code}">查看详情</button>
        </div>
      </div>
    `
  }).join('')

  content.innerHTML = `
    <div style="margin-bottom:16px;color:#666;font-size:14px">共 ${groups.length} 个小组记录（点击查看详情）</div>
    <div class="data-list" id="recordList">${items}</div>
    <div id="recordDetail" style="display:none"></div>
  `

  content.querySelectorAll('.btn-view-record').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      showRecordDetail(btn.dataset.code, content)
    })
  })
  content.querySelectorAll('.record-item').forEach(item => {
    item.addEventListener('click', () => showRecordDetail(item.dataset.code, content))
  })
}

async function showRecordDetail(code, content) {
  let data
  try {
    const res = await fetch(`${API_BASE}/groups/${code}/full`)
    if (!res.ok) throw new Error('fetch failed')
    data = await res.json()
  } catch (_) {
    alert('加载详情失败，请重试。')
    return
  }

  const d = data
  const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  const phase1 = d.phase1 || {}
  const phase2 = d.phase2 || {}
  const phase3 = d.phase3 || {}

  const sub1 = phase2.exhibition || {}
  const sub2 = phase2.equipment  || []
  const sub3 = phase2.extra      || {}

  const checklist = (phase1.items || []).join('、') || '—'
  const route = phase1.route || '—'

  // 行前问题（存在 questions 数组）
  const qs = phase1.questions || []
  const q1 = esc(qs[0]) || '—'
  const q2 = esc(qs[1]) || '—'
  const q3 = esc(qs[2]) || '—'

  // 行中·展厅（sub1 = phase2.exhibition）
  const finds = [sub1.d1, sub1.d2, sub1.d3].map(s => esc(s) || '—')
  const secretCount = sub1.count || '—'

  // 行中·车间（sub2 = phase2.equipment，数组）
  const equipArr = Array.isArray(sub2) ? sub2 : []
  const equips = equipArr.map(eq =>
    `<tr><td style="padding:6px 12px;border:1px solid #eee">${esc(eq?.name) || '—'}</td><td style="padding:6px 12px;border:1px solid #eee">${esc(eq?.function) || '—'}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="padding:6px 12px;color:#aaa">未填写</td></tr>'

  // 行中·其他（sub3 = phase2.extra）
  const freeFind = esc(sub3.text) || '—'
  const mood2 = sub3.mood || '—'

  // 行后（resolved 是对象 {0:'yes',1:'no'…}，questions 来自 phase1）
  const p3qs = (phase1.questions || []).filter(q => q?.trim())
  const resolved = phase3.resolved || {}
  const resolve = p3qs.length
    ? p3qs.map((q, i) => {
        const ans = resolved[i]
        const label = ans === 'yes' ? '✅ 解决了' : ans === 'no' ? '🤔 还不清楚' : '未作答'
        return `<div style="margin:6px 0;padding:8px 12px;background:#f9f6f0;border-radius:8px">
          <strong>Q${i+1}：${esc(q)}</strong><br/>${label}
        </div>`
      }).join('')
    : '<p style="color:#aaa">—</p>'
  const reflection = esc(phase3.reflection) || '—'
  const mood3 = phase3.finalMood || '—'

  const school = esc(d.school) || '未知学校'
  const members = (d.members || []).map(esc).join('、') || '—'
  const updated = d.updatedAt ? new Date(d.updatedAt).toLocaleString('zh-CN') : '—'
  const pwd = esc(d.password) || '—'

  document.getElementById('recordList').style.display = 'none'
  const detail = document.getElementById('recordDetail')
  detail.style.display = 'block'
  detail.innerHTML = `
    <div style="margin-bottom:20px">
      <button id="backToList" style="background:none;border:none;cursor:pointer;color:#2d8a5a;font-size:14px">← 返回列表</button>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e8e3d8">
      <h2 style="margin:0 0 4px;font-size:20px">${school} · ${members}</h2>
      <p style="color:#888;font-size:13px;margin:0 0 12px">小组码：${esc(code)} · 最后更新：${updated}</p>
      <div style="display:inline-flex;align-items:center;gap:12px;background:#fff8e8;border:1px solid #f0d080;border-radius:8px;padding:8px 16px;margin-bottom:20px;font-size:14px">
        <span>🔑 密码（PIN）：</span>
        <strong style="font-size:20px;letter-spacing:4px;font-family:monospace;color:#c8963c">${pwd}</strong>
      </div>

      <h3 style="color:#e8a020;margin:0 0 12px;font-size:15px">🎒 行前准备</h3>
      <div style="background:#fffbf2;border-radius:10px;padding:16px;margin-bottom:20px">
        <p><strong>我们想解决的问题：</strong>${q1}</p>
        <p><strong>预测参观时间：</strong>${q2}</p>
        <p><strong>参观路线选择：</strong>${esc(route)}</p>
        <p><strong>携带物品：</strong>${checklist}</p>
        <p><strong>关于农业的问题：</strong>${q3}</p>
      </div>

      <h3 style="color:#2d8a5a;margin:0 0 12px;font-size:15px">🔍 行中探索</h3>
      <div style="background:#f2faf6;border-radius:10px;padding:16px;margin-bottom:20px">
        <p style="font-weight:600;margin-bottom:8px">展厅探秘（发现了 ${secretCount} 个秘密）</p>
        <p><strong>发现1：</strong>${finds[0]}</p>
        <p><strong>发现2：</strong>${finds[1]}</p>
        <p><strong>发现3：</strong>${finds[2]}</p>
        <p style="font-weight:600;margin:16px 0 8px">车间高科技</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr>
            <th style="padding:6px 12px;border:1px solid #eee;background:#f5f5f5;text-align:left">设备名称</th>
            <th style="padding:6px 12px;border:1px solid #eee;background:#f5f5f5;text-align:left">功能/用途</th>
          </tr></thead>
          <tbody>${equips}</tbody>
        </table>
        <p style="font-weight:600;margin:16px 0 8px">我还发现</p>
        <p>${freeFind}</p>
        <p><strong>此刻心情：</strong>${mood2}</p>
      </div>

      <h3 style="color:#3a7abf;margin:0 0 12px;font-size:15px">💬 行后总结</h3>
      <div style="background:#f2f6fc;border-radius:10px;padding:16px">
        <p style="font-weight:600;margin-bottom:8px">问题解答</p>
        ${resolve}
        <p style="margin-top:16px"><strong>最大收获：</strong>${reflection}</p>
        <p><strong>整体心情：</strong>${mood3}</p>
      </div>
    </div>
  `

  document.getElementById('backToList').addEventListener('click', () => {
    detail.style.display = 'none'
    document.getElementById('recordList').style.display = 'block'
  })
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
