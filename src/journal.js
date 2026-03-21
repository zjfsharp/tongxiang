import './journal.css'
import { shimenTaskFallback } from './data/shimen-task-fallback.js'
import {
  renderSection, renderField,
  bindSection,    collectSection,
  renderFileUpload,
} from './utils/journal-renderer.js'
import { openPreview } from './utils/file-preview.js'

const BASE = import.meta.env.BASE_URL          // '/txyx/'
const API  = `${location.origin}${BASE}api`    // e.g. http://host/txyx/api

// ── State ────────────────────────────────────────────────
const params = new URLSearchParams(location.search)
const S = {
  code:       params.get('code') || '',
  pwd:        sessionStorage.getItem('txyx_pwd') || '',
  group:      null,
  task:       null,       // loaded task schema
  phase:      1,
  subPhase:   1,
  saveTimer:  null,
  saveStatus: 'idle',
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!S.code) return show(screenError('缺少组号，请从首页进入'))

  let status
  try {
    const r = await fetch(`${API}/groups/${enc(S.code)}/status`)
    status = await r.json()
  } catch {
    return show(screenError('网络异常，无法连接服务器'))
  }

  if (!status.exists) return show(screenError(`组号 "${S.code}" 不存在，请联系老师`))

  // Load task schema
  if (status.taskId) {
    try {
      const tr = await fetch(`${API}/tasks/${status.taskId}`)
      if (tr.ok) S.task = await tr.json()
    } catch { /* fallback below */ }
  }
  if (!S.task) S.task = shimenTaskFallback

  if (!status.hasPassword) {
    show(screenInit()); bindAuth()
  } else if (S.pwd) {
    const r = await loadGroup()
    if (r.ok) { show(screenJournal()); bindJournal() }
    else { S.pwd = ''; sessionStorage.removeItem('txyx_pwd'); show(screenLogin()); bindAuth() }
  } else {
    show(screenLogin()); bindAuth()
  }
})

function show(html) { document.getElementById('journalApp').innerHTML = html }
function enc(s)     { return encodeURIComponent(s) }
function esc(s)     { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

// ── API ──────────────────────────────────────────────────
async function loadGroup() {
  try {
    const r = await fetch(`${API}/groups/${enc(S.code)}?pwd=${enc(S.pwd)}`)
    if (r.status === 403) return { ok: false, error: 'wrong_password' }
    if (r.ok) { S.group = await r.json(); return { ok: true } }
  } catch { /* offline → try localStorage */ }
  const local = lsGet()
  if (!local) return { ok: false, error: 'not_found' }
  if (local.password !== S.pwd) return { ok: false, error: 'wrong_password' }
  S.group = local
  return { ok: true, offline: true }
}

async function saveGroup() {
  if (!S.group) return { ok: false }
  const payload = { ...S.group, password: S.pwd }
  lsSet(payload)
  try {
    const r = await fetch(`${API}/groups/${enc(S.code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) return { ok: true }
  } catch { /* offline */ }
  return { ok: false, offline: true }
}

function lsGet()  { try { return JSON.parse(localStorage.getItem('txyx_g_' + S.code) || 'null') } catch { return null } }
function lsSet(d) { try { localStorage.setItem('txyx_g_' + S.code, JSON.stringify(d)) } catch {} }

// ── Auto-save ────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(S.saveTimer)
  setSaveLabel('saving')
  S.saveTimer = setTimeout(async () => {
    const r = await saveGroup()
    setSaveLabel(r.offline ? 'offline' : 'saved')
  }, 1200)
}

function setSaveLabel(status) {
  const el = document.getElementById('jSaveStatus')
  if (!el) return
  const m = { saving: ['⏳','保存中…','#999'], saved: ['✓','已保存','#2d8a5a'], offline: ['📱','本地','#c8963c'] }
  const [icon, text, color] = m[status] || []
  if (icon) el.innerHTML = `<span style="color:${color}">${icon} ${text}</span>`
}

// ── PIN helper ───────────────────────────────────────────
function pinValue(rowId) {
  return [...document.querySelectorAll(`#${rowId} .jl-pin`)].map(d => d.value).join('')
}

// ── Auth screens ─────────────────────────────────────────
function authShell(content) {
  const title = S.task?.title || '研学记录'
  return `
    <div class="jl-center">
      <div class="jl-auth-card">
        <div class="jl-auth-logo">🌾</div>
        <h1 class="jl-auth-title">${esc(title)}</h1>
        ${content}
        <a href="${BASE}" class="jl-back-link">← 返回首页</a>
      </div>
    </div>
  `
}

function screenError(msg) {
  return authShell(`
    <p class="jl-auth-code">${esc(S.code) || '—'}</p>
    <div class="jl-auth-error">${esc(msg)}</div>
  `)
}

function screenInit() {
  return authShell(`
    <p class="jl-auth-code">小组 <strong>${esc(S.code)}</strong></p>
    <p class="jl-auth-hint">首次登录，请填写小组信息并设置密码</p>
    <div class="jl-form-group">
      <label class="jl-form-label">学校名称</label>
      <input class="jl-input" id="initSchool" type="text" placeholder="如：桐乡市茅盾实验小学" autocomplete="organization" />
    </div>
    <div class="jl-form-group">
      <label class="jl-form-label">小组成员</label>
      <div class="jl-member-chips" id="memberChips"></div>
      <div class="jl-member-add">
        <input class="jl-input jl-member-input" id="memberInput" type="text"
               placeholder="输入姓名" autocomplete="off" autocorrect="off" autocapitalize="none" />
        <button class="jl-member-btn" id="memberAddBtn" type="button">+ 添加</button>
      </div>
    </div>
    <div class="jl-form-group">
      <label class="jl-form-label">设置4位数字密码</label>
      <div class="jl-pin-row" id="initPin">
        ${[0,1,2,3].map(i=>`<input class="jl-pin" type="tel" maxlength="1" data-idx="${i}" inputmode="numeric"/>`).join('')}
      </div>
    </div>
    <div class="jl-form-error" id="authError"></div>
    <button class="jl-btn-primary" id="authSubmit">开始研学记录 →</button>
  `)
}

function screenLogin() {
  return authShell(`
    <p class="jl-auth-code">小组 <strong>${esc(S.code)}</strong></p>
    <p class="jl-auth-hint">输入小组密码继续填写</p>
    <div class="jl-form-group">
      <label class="jl-form-label">4位数字密码</label>
      <div class="jl-pin-row" id="loginPin">
        ${[0,1,2,3].map(i=>`<input class="jl-pin" type="tel" maxlength="1" data-idx="${i}" inputmode="numeric"/>`).join('')}
      </div>
    </div>
    <div class="jl-form-error" id="authError"></div>
    <button class="jl-btn-primary" id="authSubmit">进入研学记录 →</button>
    <p style="margin-top:12px;font-size:13px;color:#bbb;text-align:center">忘记密码？请联系老师查询</p>
  `)
}

function bindAuth() {
  document.querySelectorAll('.jl-pin').forEach(inp => {
    inp.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '')
      e.target.value = v ? v[0] : ''
      if (v) {
        const next = inp.parentElement.querySelector(`[data-idx="${+inp.dataset.idx + 1}"]`)
        next?.focus()
      }
    })
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && +inp.dataset.idx > 0)
        inp.parentElement.querySelector(`[data-idx="${+inp.dataset.idx - 1}"]`)?.focus()
    })
  })

  const isInit = !!document.getElementById('initPin')
  document.getElementById('authSubmit')?.addEventListener('click', isInit ? handleInit : handleLogin)

  if (isInit) {
    function addMember() {
      const inp = document.getElementById('memberInput')
      const name = inp.value.trim()
      if (!name) return
      inp.value = ''
      const chips = document.getElementById('memberChips')
      const chip = document.createElement('span')
      chip.className = 'jl-member-chip'
      chip.dataset.name = name
      chip.innerHTML = `${esc(name)}<button class="jl-chip-del" type="button">×</button>`
      chip.querySelector('.jl-chip-del').addEventListener('click', () => chip.remove())
      chips.appendChild(chip)
      inp.focus()
    }
    document.getElementById('memberAddBtn')?.addEventListener('click', addMember)
    document.getElementById('memberInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addMember() }
    })
  }

  const pinRowId = isInit ? 'initPin' : 'loginPin'
  document.querySelector(`#${pinRowId} [data-idx="0"]`)?.focus()
}

async function handleInit() {
  const school  = document.getElementById('initSchool')?.value.trim()
  const pwd     = pinValue('initPin')
  const errEl   = document.getElementById('authError')
  const members = [...document.querySelectorAll('#memberChips .jl-member-chip')]
                    .map(c => c.dataset.name).filter(Boolean)

  if (!school) { errEl.textContent = '请填写学校名称'; return }
  if (!/^\d{4}$/.test(pwd)) { errEl.textContent = '请输入完整的4位数字密码'; return }
  errEl.textContent = ''
  const btn = document.getElementById('authSubmit')
  btn.disabled = true; btn.textContent = '设置中…'

  try {
    const r = await fetch(`${API}/groups/${enc(S.code)}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd, school, members }),
    })
    const data = await r.json()
    if (!r.ok) { errEl.textContent = data.error || '设置失败，请重试'; btn.disabled = false; btn.textContent = '开始研学记录 →'; return }
    S.pwd = pwd; S.group = data
    sessionStorage.setItem('txyx_pwd', pwd)
    show(screenJournal()); bindJournal()
  } catch {
    errEl.textContent = '网络异常，请重试'
    btn.disabled = false; btn.textContent = '开始研学记录 →'
  }
}

async function handleLogin() {
  const pwd   = pinValue('loginPin')
  const errEl = document.getElementById('authError')
  if (!/^\d{4}$/.test(pwd)) { errEl.textContent = '请输入完整的4位数字密码'; return }

  errEl.textContent = ''
  const btn = document.getElementById('authSubmit')
  btn.disabled = true; btn.textContent = '验证中…'

  S.pwd = pwd
  const result = await loadGroup()
  if (!result.ok) {
    errEl.textContent = result.error === 'wrong_password' ? '❌ 密码不正确，请重试' : '加载失败，请重试'
    S.pwd = ''; btn.disabled = false; btn.textContent = '进入研学记录 →'
    return
  }
  sessionStorage.setItem('txyx_pwd', pwd)
  show(screenJournal()); bindJournal()
}

// ── Journal shell ────────────────────────────────────────
function screenJournal() {
  const g     = S.group || {}
  const p1done = !!g.phase1?.completedAt
  const p2done = !!g.phase2?.completedAt
  const p3done = !!g.phase3?.completedAt

  if      (p2done && !p3done) S.phase = 3
  else if (p1done && !p2done) S.phase = 2
  else if (!p1done)           S.phase = 1

  const school  = esc(g.school || '')
  const members = (g.members || []).map(esc).join('、') || '待设置'

  const phases  = S.task.phases
  const tabs = [
    { n: 1, info: phases.before, done: p1done },
    { n: 2, info: phases.during, done: p2done },
    { n: 3, info: phases.after,  done: p3done },
  ]

  return `
    <div class="jl-app">
      <header class="jl-header">
        <div class="jl-header-left">
          <span class="jl-header-logo">🌾</span>
          <div class="jl-header-info">
            <span class="jl-header-code">${esc(S.code)} 组</span>
            <span class="jl-header-sub">${school}${school && members ? ' · ' : ''}${members}</span>
          </div>
        </div>
        <div class="jl-header-right">
          <span id="jSaveStatus" class="jl-save-badge"></span>
          <button class="jl-exit-btn" id="jExit">退出</button>
        </div>
      </header>

      <div class="jl-phase-bar">
        ${tabs.map(({ n, info, done }) => `
          <button class="jl-phase-tab${S.phase === n ? ' active' : ''}${done ? ' done' : ''}"
                  data-phase="${n}"
                  ${n === 2 && !p1done ? 'disabled' : ''} ${n === 3 && !p2done ? 'disabled' : ''}>
            <span class="jl-tab-icon">${done ? '✅' : info.icon}</span>
            <span class="jl-tab-name">${esc(info.title)}</span>
          </button>
          ${n < 3 ? '<div class="jl-phase-sep"></div>' : ''}
        `).join('')}
      </div>

      <main class="jl-main" id="jlMain"></main>

      <footer class="jl-bottom" id="jlBottom">
        <div id="jlBL"></div>
        <div id="jlBR"></div>
      </footer>
    </div>
  `
}

function bindJournal() {
  document.querySelectorAll('.jl-phase-tab:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      S.phase = +btn.dataset.phase; S.subPhase = 1
      activateTab(S.phase)
      renderPhase()
    })
  })
  document.getElementById('jExit')?.addEventListener('click', () => {
    sessionStorage.removeItem('txyx_pwd')
    window.location.href = BASE + '#tasks'
  })
  renderPhase()
  setSaveLabel('saved')
}

function activateTab(n) {
  document.querySelectorAll('.jl-phase-tab').forEach(b =>
    b.classList.toggle('active', +b.dataset.phase === n))
}

function renderPhase() {
  const el = document.getElementById('jlMain')
  if (!el) return
  if (S.phase === 1) renderPhaseBefore(el)
  else if (S.phase === 2) renderPhaseDuring(el)
  else if (S.phase === 3) renderPhaseAfter(el)
}

function setBottom(left = '', right = '') {
  const bl = document.getElementById('jlBL'), br = document.getElementById('jlBR')
  if (bl) bl.innerHTML = left
  if (br) br.innerHTML = right
}

// ── Phase 1: 行前 ─────────────────────────────────────────
function renderPhaseBefore(el) {
  const before = S.task.phases.before
  const p1   = S.group.phase1 || {}
  const done = !!p1.completedAt

  // file_upload mode
  if (before.mode === 'file_upload') {
    el.innerHTML = `<div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${before.icon}</div>
        <div>
          <h2 class="jl-sec-title">${esc(before.title)}</h2>
          <p class="jl-sec-desc">把填好的纸质作业拍照或扫描上传</p>
        </div>
      </div>
      ${renderFileUpload('phase1', p1, API, S.code, done)}
      ${done ? `<div class="jl-done-tag">✅ ${esc(before.title)}已完成 <button class="jl-link-btn" id="p1Redo">修改</button></div>` : ''}
    </div>`
    bindFileUpload(el, 'phase1', p1, done)
    if (!done) {
      setBottom('', `<button class="jl-btn-primary" id="p1Complete">完成${esc(before.title)} 🚌</button>`)
      document.getElementById('p1Complete')?.addEventListener('click', () => {
        if (!S.group.phase1) S.group.phase1 = {}
        S.group.phase1.completedAt = new Date().toISOString()
        saveGroup().then(() => { S.phase = 2; S.subPhase = 1; show(screenJournal()); bindJournal() })
      })
    } else {
      document.getElementById('p1Redo')?.addEventListener('click', () => {
        S.group.phase1.completedAt = null; renderPhaseBefore(el); setBottom()
      })
      setBottom('', `<button class="jl-btn-primary" id="p1Next">去${esc(S.task.phases.during.title)} →</button>`)
      document.getElementById('p1Next')?.addEventListener('click', () => {
        S.phase = 2; S.subPhase = 1; activateTab(2); renderPhase()
      })
    }
    return
  }

  // form mode
  if (!S.group.phase1) S.group.phase1 = {}
  const sections = before.sections || []

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${before.icon}</div>
        <div>
          <h2 class="jl-sec-title">出发前，先想清楚！</h2>
          <p class="jl-sec-desc">我们想解决什么问题？需要做哪些准备？</p>
        </div>
      </div>
      ${sections.map(sec => renderSection(sec, p1, done, { group: S.group })).join('')}
      ${done ? `<div class="jl-done-tag">✅ 行前准备已完成 <button class="jl-link-btn" id="p1Redo">修改</button></div>` : ''}
    </div>
  `

  if (!done) {
    sections.forEach(sec => bindSection(el, sec, S.group.phase1, scheduleSave))
    setBottom('', `<button class="jl-btn-primary" id="p1Complete">保存行前，准备出发 🚌</button>`)
    document.getElementById('p1Complete')?.addEventListener('click', () => {
      sections.forEach(sec => collectSection(el, sec, S.group.phase1))
      S.group.phase1.completedAt = new Date().toISOString()
      saveGroup().then(() => { S.phase = 2; S.subPhase = 1; show(screenJournal()); bindJournal() })
    })
  } else {
    document.getElementById('p1Redo')?.addEventListener('click', () => {
      S.group.phase1.completedAt = null; renderPhaseBefore(el); setBottom()
    })
    setBottom('', `<button class="jl-btn-primary" id="p1Next">去行中探索 →</button>`)
    document.getElementById('p1Next')?.addEventListener('click', () => {
      S.phase = 2; S.subPhase = 1; activateTab(2); renderPhase()
    })
  }
}

// ── Phase 2: 行中 ─────────────────────────────────────────
function renderPhaseDuring(el) {
  const during = S.task.phases.during
  const p2     = S.group.phase2 || {}

  // file_upload mode
  if (during.mode === 'file_upload') {
    const done = !!p2.completedAt
    el.innerHTML = `<div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${during.icon}</div>
        <div><h2 class="jl-sec-title">${esc(during.title)}</h2><p class="jl-sec-desc">把填好的纸质作业拍照或扫描上传</p></div>
      </div>
      ${renderFileUpload('phase2', p2, API, S.code, done)}
      ${done ? `<div class="jl-done-tag">✅ ${esc(during.title)}已完成 <button class="jl-link-btn" id="p2Redo">修改</button></div>` : ''}
    </div>`
    bindFileUpload(el, 'phase2', p2, done)
    if (!done) {
      setBottom(
        `<button class="jl-btn-ghost" id="p2Back">← 返回行前</button>`,
        `<button class="jl-btn-primary" id="p2Complete">完成${esc(during.title)} 💬</button>`
      )
      document.getElementById('p2Back')?.addEventListener('click', () => { S.phase = 1; activateTab(1); renderPhase() })
      document.getElementById('p2Complete')?.addEventListener('click', () => {
        if (!S.group.phase2) S.group.phase2 = {}
        S.group.phase2.completedAt = new Date().toISOString()
        S.phase = 3
        saveGroup().then(() => { show(screenJournal()); bindJournal() })
      })
    } else {
      document.getElementById('p2Redo')?.addEventListener('click', () => {
        S.group.phase2.completedAt = null; renderPhaseDuring(el)
      })
      setBottom('', `<button class="jl-btn-primary" id="p2Next">去${esc(S.task.phases.after.title)} →</button>`)
      document.getElementById('p2Next')?.addEventListener('click', () => { S.phase = 3; activateTab(3); renderPhase() })
    }
    return
  }

  // form mode with sub-phases
  const subPhases = during.subPhases || []

  const isDone = sp => sp.doneKey ? !!p2[sp.doneKey] : false
  const allDone = !!p2.completedAt

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${during.icon}</div>
        <div>
          <h2 class="jl-sec-title">展厅和车间里藏着秘密！</h2>
          <p class="jl-sec-desc">分三关完成，看谁发现的最多</p>
        </div>
      </div>
      <div class="jl-sub-tabs">
        ${subPhases.map((sp, idx) => {
          const spDone   = sp.isLast ? allDone : isDone(sp)
          const locked   = idx > 0 && !isDone(subPhases[idx - 1])
          return `<button class="jl-sub-tab${S.subPhase === sp.n ? ' active' : ''}${spDone ? ' done' : ''}"
                          data-sub="${sp.n}" ${locked ? 'disabled' : ''}>
            ${spDone ? '✅' : sp.icon} ${sp.title}
          </button>`
        }).join('')}
      </div>
      <div id="jlSub"></div>
    </div>
  `

  el.querySelectorAll('.jl-sub-tab:not([disabled])').forEach(btn =>
    btn.addEventListener('click', () => {
      S.subPhase = +btn.dataset.sub
      el.querySelectorAll('.jl-sub-tab').forEach(b => b.classList.toggle('active', +b.dataset.sub === S.subPhase))
      renderSubPhase()
    }))
  renderSubPhase()
}

function renderSubPhase() {
  const sub = document.getElementById('jlSub')
  if (!sub) return
  const during    = S.task.phases.during
  const subPhases = during.subPhases || []
  const sp        = subPhases.find(s => s.n === S.subPhase)
  if (!sp) return

  if (!S.group.phase2) S.group.phase2 = {}
  const p2   = S.group.phase2
  const done = sp.isLast ? !!p2.completedAt : (sp.doneKey ? !!p2[sp.doneKey] : false)
  const ctx  = { group: S.group }

  // Determine section data target: pass p2 as the "phase-level" object
  // bindSection / collectSection use sec.targetKey to create nested objects
  const sectionsHtml = (sp.sections || []).map(sec => {
    const secData = sec.targetKey ? (p2[sec.targetKey] || {}) : p2
    return renderSection(sec, secData, done, ctx)
  }).join('')

  sub.innerHTML = `<div>${sectionsHtml}
    ${done ? `<div class="jl-done-tag">✅ ${esc(sp.title)}完成 <button class="jl-link-btn" id="spRedo">修改</button></div>` : ''}
  </div>`

  if (!done) {
    sp.sections?.forEach(sec => bindSection(sub, sec, p2, scheduleSave))

    const subPhases = S.task.phases.during.subPhases || []
    const isLast    = sp.isLast || sp.n === subPhases[subPhases.length - 1]?.n
    const nextSp    = subPhases.find(s => s.n === sp.n + 1)

    if (isLast) {
      setBottom(
        `<button class="jl-btn-ghost" id="spBack">← 返回行前</button>`,
        `<button class="jl-btn-primary" id="spDone">完成行中，去写感想 💬</button>`
      )
      document.getElementById('spBack')?.addEventListener('click', () => { S.phase = 1; activateTab(1); renderPhase() })
      document.getElementById('spDone')?.addEventListener('click', () => {
        sp.sections?.forEach(sec => collectSection(sub, sec, p2))
        if (sp.doneKey) p2[sp.doneKey] = true
        p2.completedAt = new Date().toISOString()
        S.phase = 3
        saveGroup().then(() => { show(screenJournal()); bindJournal() })
      })
    } else {
      setBottom('', `<button class="jl-btn-primary" id="spNext">完成，去${esc(nextSp?.title || '下一关')} →</button>`)
      document.getElementById('spNext')?.addEventListener('click', () => {
        sp.sections?.forEach(sec => collectSection(sub, sec, p2))
        if (sp.doneKey) p2[sp.doneKey] = true
        S.subPhase = sp.n + 1
        saveGroup().then(() => renderPhaseDuring(document.getElementById('jlMain')))
      })
    }
  } else {
    document.getElementById('spRedo')?.addEventListener('click', () => {
      if (sp.doneKey) p2[sp.doneKey] = false
      if (sp.isLast) p2.completedAt = null
      renderSubPhase()
    })
    const subPhases = S.task.phases.during.subPhases || []
    const isLast    = sp.isLast || sp.n === subPhases[subPhases.length - 1]?.n
    const nextSp    = subPhases.find(s => s.n === sp.n + 1)
    if (!isLast) {
      setBottom('', `<button class="jl-btn-primary" id="spNext">去${esc(nextSp?.title || '下一关')} →</button>`)
      document.getElementById('spNext')?.addEventListener('click', () => {
        S.subPhase = sp.n + 1
        document.querySelectorAll('.jl-sub-tab').forEach(b => b.classList.toggle('active', +b.dataset.sub === S.subPhase))
        renderSubPhase()
      })
    } else {
      setBottom('', `<button class="jl-btn-primary" id="spNextPhase">去行后总结 💬</button>`)
      document.getElementById('spNextPhase')?.addEventListener('click', () => { S.phase = 3; activateTab(3); renderPhase() })
    }
  }
}

// ── Phase 3: 行后 ─────────────────────────────────────────
function renderPhaseAfter(el) {
  const after = S.task.phases.after
  const p3    = S.group.phase3 || {}
  const done  = !!p3.completedAt

  // file_upload mode
  if (after.mode === 'file_upload') {
    el.innerHTML = `<div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${after.icon}</div>
        <div><h2 class="jl-sec-title">${esc(after.title)}</h2><p class="jl-sec-desc">把填好的纸质作业拍照或扫描上传</p></div>
      </div>
      ${renderFileUpload('phase3', p3, API, S.code, done)}
      ${done ? `<div class="jl-complete-card">
        <div class="jl-complete-icon">🎉</div>
        <div class="jl-complete-title">研学记录全部完成！</div>
        <div class="jl-complete-sub">${esc(S.code)} 小组完成了完整的研学记录，太棒了！</div>
        <button class="jl-link-btn" id="p3Redo">修改</button>
      </div>` : ''}
    </div>`
    bindFileUpload(el, 'phase3', p3, done)
    if (!done) {
      setBottom(
        `<button class="jl-btn-ghost" id="p3Back">← 返回行中</button>`,
        `<button class="jl-btn-primary" id="p3Complete">完成全部研学记录 🎉</button>`
      )
      document.getElementById('p3Back')?.addEventListener('click', () => { S.phase = 2; S.subPhase = (S.task.phases.during.subPhases?.length || 3); activateTab(2); renderPhase() })
      document.getElementById('p3Complete')?.addEventListener('click', () => {
        if (!S.group.phase3) S.group.phase3 = {}
        S.group.phase3.completedAt = new Date().toISOString()
        saveGroup().then(() => renderPhaseAfter(el)); setBottom()
      })
    } else {
      document.getElementById('p3Redo')?.addEventListener('click', () => {
        S.group.phase3.completedAt = null; renderPhaseAfter(el)
      })
    }
    return
  }

  // form mode
  if (!S.group.phase3) S.group.phase3 = {}
  const sections = after.sections || []
  const ctx = { group: S.group }

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">${after.icon}</div>
        <div>
          <h2 class="jl-sec-title">回来啦！说说你的收获</h2>
          <p class="jl-sec-desc">这次研学对我们的研究有哪些帮助？</p>
        </div>
      </div>
      ${sections.map(sec => renderSection(sec, p3, done, ctx)).join('')}
      ${done ? `
        <div class="jl-complete-card">
          <div class="jl-complete-icon">🎉</div>
          <div class="jl-complete-title">研学记录全部完成！</div>
          <div class="jl-complete-sub">${esc(S.code)} 小组完成了完整的研学记录，太棒了！</div>
          <button class="jl-link-btn" id="p3Redo">修改</button>
        </div>
      ` : ''}
    </div>
  `

  if (!done) {
    sections.forEach(sec => bindSection(el, sec, S.group.phase3, scheduleSave))
    setBottom(
      `<button class="jl-btn-ghost" id="p3Back">← 返回行中</button>`,
      `<button class="jl-btn-primary" id="p3Complete">完成全部研学记录 🎉</button>`
    )
    document.getElementById('p3Back')?.addEventListener('click', () => {
      const subs = S.task.phases.during.subPhases || []
      S.phase = 2; S.subPhase = subs[subs.length - 1]?.n || 3; activateTab(2); renderPhase()
    })
    document.getElementById('p3Complete')?.addEventListener('click', () => {
      sections.forEach(sec => collectSection(el, sec, S.group.phase3))
      S.group.phase3.completedAt = new Date().toISOString()
      saveGroup().then(() => renderPhaseAfter(el)); setBottom()
    })
  } else {
    document.getElementById('p3Redo')?.addEventListener('click', () => {
      S.group.phase3.completedAt = null; renderPhaseAfter(el)
    })
    setBottom()
  }
}

// ── File upload ───────────────────────────────────────────
function bindFileUpload(container, phaseKey, phaseData, done) {
  // Preview buttons
  container.querySelectorAll('.jl-upload-preview-btn').forEach(btn => {
    btn.addEventListener('click', () => openPreview(btn.dataset.url, btn.dataset.type, btn.dataset.name))
  })

  if (done) return

  // Delete buttons
  container.querySelectorAll('.jl-upload-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fileId = btn.dataset.fileId
      try {
        const r = await fetch(`${API}/groups/${enc(S.code)}/file/${phaseKey}/${enc(fileId)}`, { method: 'DELETE' })
        if (r.ok) {
          const data = await r.json()
          if (!S.group[phaseKey]) S.group[phaseKey] = {}
          S.group[phaseKey].files = data.files
          renderPhase()
        }
      } catch { alert('删除失败，请重试') }
    })
  })

  // File input
  const input = container.querySelector(`#fileInput_${phaseKey}`)
  input?.addEventListener('change', async e => {
    const files = [...e.target.files]
    for (const file of files) {
      await uploadFile(phaseKey, file)
    }
    e.target.value = ''
  })
}

async function uploadFile(phaseKey, file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = async ev => {
      const base64 = ev.target.result
      try {
        const r = await fetch(`${API}/groups/${enc(S.code)}/upload/${phaseKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, type: file.type, data: base64 }),
        })
        if (r.ok) {
          const res = await r.json()
          if (!S.group[phaseKey]) S.group[phaseKey] = {}
          S.group[phaseKey].files = res.files
          renderPhase()
        } else {
          const err = await r.json()
          alert(err.error || '上传失败')
        }
      } catch { alert('网络异常，上传失败') }
      resolve()
    }
    reader.readAsDataURL(file)
  })
}
