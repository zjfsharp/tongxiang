import './journal.css'
import shimemData from './data/shimen.json'

const BASE = import.meta.env.BASE_URL                    // '/txyx/'
const API  = `${location.origin}${BASE}api`              // e.g. http://host/txyx/api

// ── State ────────────────────────────────────────────────
const params = new URLSearchParams(location.search)
const S = {
  code:       params.get('code') || '',
  pwd:        sessionStorage.getItem('txyx_pwd') || '',
  group:      null,
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

function lsGet()  { try { return JSON.parse(localStorage.getItem('txyx_g_'+S.code)||'null') } catch { return null } }
function lsSet(d) { try { localStorage.setItem('txyx_g_'+S.code, JSON.stringify(d)) } catch {} }

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
  const m = { saving:['⏳','保存中…','#999'], saved:['✓','已保存','#2d8a5a'], offline:['📱','本地','#c8963c'] }
  const [icon,text,color] = m[status]||[]
  if (icon) el.innerHTML = `<span style="color:${color}">${icon} ${text}</span>`
}

// ── PIN helper ───────────────────────────────────────────
function pinValue(rowId) {
  return [...document.querySelectorAll(`#${rowId} .jl-pin`)]
    .map(d => d.value).join('')
}

// ── Auth screens ─────────────────────────────────────────
function authShell(content) {
  return `
    <div class="jl-center">
      <div class="jl-auth-card">
        <div class="jl-auth-logo">🌾</div>
        <h1 class="jl-auth-title">石门湾研学记录</h1>
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
  // PIN auto-advance
  document.querySelectorAll('.jl-pin').forEach(inp => {
    inp.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g,'')
      e.target.value = v ? v[0] : ''
      if (v) {
        const next = inp.parentElement.querySelector(`[data-idx="${+inp.dataset.idx+1}"]`)
        next?.focus()
      }
    })
    inp.addEventListener('keydown', e => {
      if (e.key==='Backspace' && !e.target.value && +inp.dataset.idx > 0) {
        inp.parentElement.querySelector(`[data-idx="${+inp.dataset.idx-1}"]`)?.focus()
      }
    })
  })

  const isInit = !!document.getElementById('initPin')
  document.getElementById('authSubmit')?.addEventListener('click', isInit ? handleInit : handleLogin)

  // member chip add/remove (init screen only)
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

  // auto-focus first PIN digit
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
    if (!r.ok) { errEl.textContent = data.error||'设置失败，请重试'; btn.disabled=false; btn.textContent='开始研学记录 →'; return }
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

  // Auto-advance to correct phase
  if      (p2done && !p3done) S.phase = 3
  else if (p1done && !p2done) S.phase = 2
  else if (!p1done)           S.phase = 1

  const school  = esc(g.school || '')
  const members = (g.members || []).map(esc).join('、') || '待设置'

  const tabs = [
    { n:1, info: shimemData.phases.before, done: p1done },
    { n:2, info: shimemData.phases.during, done: p2done },
    { n:3, info: shimemData.phases.after,  done: p3done },
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
        ${tabs.map(({n,info,done}) => `
          <button class="jl-phase-tab${S.phase===n?' active':''}${done?' done':''}"
                  data-phase="${n}"
                  ${n===2&&!p1done?'disabled':''} ${n===3&&!p2done?'disabled':''}>
            <span class="jl-tab-icon">${done ? '✅' : info.icon}</span>
            <span class="jl-tab-name">${info.title}</span>
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
  if (S.phase === 1) renderPhase1(el)
  else if (S.phase === 2) renderPhase2(el)
  else if (S.phase === 3) renderPhase3(el)
}

function setBottom(left='', right='') {
  const bl = document.getElementById('jlBL'), br = document.getElementById('jlBR')
  if (bl) bl.innerHTML = left
  if (br) br.innerHTML = right
}

// ── Phase 1: 行前 ────────────────────────────────────────
function renderPhase1(el) {
  const p1 = S.group.phase1 || {}
  const qs = p1.questions || ['','','']
  const items = p1.items || []
  const done = !!p1.completedAt

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">🎒</div>
        <div>
          <h2 class="jl-sec-title">出发前，先想清楚！</h2>
          <p class="jl-sec-desc">我们想解决什么问题？需要做哪些准备？</p>
        </div>
      </div>

      <div class="jl-card">
        <h3 class="jl-card-title">💡 最想弄清楚的问题（最多3个）</h3>
        <p class="jl-card-hint">出发前先想好，回来再看看有没有答案</p>
        ${[0,1,2].map(i=>`
          <div class="jl-q-row">
            <span class="jl-q-num">${i+1}</span>
            <input class="jl-input jl-input-q" data-qi="${i}"
                   value="${esc(qs[i]||'')}"
                   placeholder="${['你们最想弄清楚什么？','还有别的问题吗？','第三个问题（选填）'][i]}"
                   ${done?'readonly':''}/>
          </div>
        `).join('')}
      </div>

      <div class="jl-card">
        <h3 class="jl-card-title">🎒 要带的东西</h3>
        <div class="jl-checklist">
          ${shimemData.itemsChecklist.map(item=>`
            <label class="jl-check-item">
              <input type="checkbox" class="jl-chk" data-item="${esc(item)}"
                     ${items.includes(item)?'checked':''} ${done?'disabled':''}/>
              <span class="jl-check-label">${item}</span>
            </label>
          `).join('')}
          <label class="jl-check-item">
            <input type="checkbox" class="jl-chk jl-chk-other" data-item="__other__"
                   ${items.some(i=>!shimemData.itemsChecklist.includes(i))?'checked':''} ${done?'disabled':''}/>
            <span class="jl-check-label">其他：</span>
            <input class="jl-input jl-input-inline" id="otherItem"
                   value="${esc(items.find(i=>!shimemData.itemsChecklist.includes(i))||'')}"
                   placeholder="自己写" ${done?'readonly':''}/>
          </label>
        </div>
      </div>

      <div class="jl-card">
        <h3 class="jl-card-title">🗺️ 我们想走什么路线？</h3>
        <div class="jl-radio-group">
          ${shimemData.routeOptions.map(opt=>`
            <label class="jl-radio-item">
              <input type="radio" name="route" value="${esc(opt)}"
                     ${(p1.route||'')===opt?'checked':''} ${done?'disabled':''}/>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>

      ${done ? `<div class="jl-done-tag">✅ 行前准备已完成 <button class="jl-link-btn" id="p1Redo">修改</button></div>` : ''}
    </div>
  `

  if (!done) {
    el.querySelectorAll('.jl-input-q,.jl-chk,input[name="route"]').forEach(inp =>
      inp.addEventListener('change', () => { collectP1(el); scheduleSave() }))
    el.querySelectorAll('.jl-input-q').forEach(inp =>
      inp.addEventListener('input', () => { collectP1(el); scheduleSave() }))
    setBottom('', `<button class="jl-btn-primary" id="p1Complete">保存行前，准备出发 🚌</button>`)
    document.getElementById('p1Complete')?.addEventListener('click', () => {
      collectP1(el)
      if (!S.group.phase1) S.group.phase1 = {}
      S.group.phase1.completedAt = new Date().toISOString()
      saveGroup().then(() => { S.phase = 2; S.subPhase = 1; show(screenJournal()); bindJournal() })
    })
  } else {
    document.getElementById('p1Redo')?.addEventListener('click', () => {
      S.group.phase1.completedAt = null; renderPhase1(el); setBottom()
    })
    setBottom('', `<button class="jl-btn-primary" id="p1Next">去行中探索 →</button>`)
    document.getElementById('p1Next')?.addEventListener('click', () => {
      S.phase = 2; S.subPhase = 1; activateTab(2); renderPhase()
    })
  }
}

function collectP1(el) {
  if (!S.group.phase1) S.group.phase1 = {}
  S.group.phase1.questions = [0,1,2].map(i =>
    el.querySelector(`[data-qi="${i}"]`)?.value || '')
  const checked = [...el.querySelectorAll('.jl-chk:checked:not(.jl-chk-other)')]
    .map(c => c.dataset.item)
  const otherOn  = el.querySelector('.jl-chk-other')?.checked
  const otherVal = el.querySelector('#otherItem')?.value.trim() || ''
  S.group.phase1.items = (otherOn && otherVal) ? [...checked, otherVal] : checked
  S.group.phase1.route = el.querySelector('input[name="route"]:checked')?.value || ''
}

// ── Phase 2: 行中 ────────────────────────────────────────
function renderPhase2(el) {
  const p2 = S.group.phase2 || {}
  const sub1done = !!p2.sub1Done
  const sub2done = !!p2.sub2Done
  const alldone  = !!p2.completedAt

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">🔍</div>
        <div>
          <h2 class="jl-sec-title">展厅和车间里藏着秘密！</h2>
          <p class="jl-sec-desc">分三关完成，看谁发现的最多</p>
        </div>
      </div>
      <div class="jl-sub-tabs">
        ${[
          {n:1,icon:'🏛️',title:'展厅探秘',done:sub1done,locked:false},
          {n:2,icon:'⚙️',title:'车间高科技',done:sub2done,locked:!sub1done},
          {n:3,icon:'💡',title:'我还发现…',done:alldone,locked:!sub2done},
        ].map(s=>`
          <button class="jl-sub-tab${S.subPhase===s.n?' active':''}${s.done?' done':''}"
                  data-sub="${s.n}" ${s.locked?'disabled':''}>
            ${s.done?'✅':s.icon} ${s.title}
          </button>
        `).join('')}
      </div>
      <div id="jlSub"></div>
    </div>
  `

  el.querySelectorAll('.jl-sub-tab:not([disabled])').forEach(btn =>
    btn.addEventListener('click', () => {
      S.subPhase = +btn.dataset.sub
      el.querySelectorAll('.jl-sub-tab').forEach(b =>
        b.classList.toggle('active', +b.dataset.sub === S.subPhase))
      renderSub()
    })
  )
  renderSub()
}

function renderSub() {
  const sub = document.getElementById('jlSub')
  if (!sub) return
  if (S.subPhase === 1) renderSub1(sub)
  else if (S.subPhase === 2) renderSub2(sub)
  else if (S.subPhase === 3) renderSub3(sub)
}

function ensureP2() { if (!S.group.phase2) S.group.phase2 = {} }

function renderSub1(sub) {
  const data = S.group.phase2?.exhibition || {}
  const done = !!S.group.phase2?.sub1Done
  sub.innerHTML = `
    <div class="jl-card">
      <p class="jl-card-hint">展厅里藏着许多小秘密，写下你发现的信息！</p>
      ${[
        {k:'d1', label:'📍 关于这里的地理位置和区域分布', ph:'你在地图上发现了什么？'},
        {k:'d2', label:'🤖 传统农业 vs 现代农业有哪些不同？', ph:'比如无人机喷药、直播卖米…'},
        {k:'d3', label:'🍚 大米有哪些不同的产品形式？', ph:'你看到了哪些大米的包装或产品？'},
      ].map(({k,label,ph})=>`
        <div class="jl-discovery">
          <div class="jl-discovery-label">${label}</div>
          <textarea class="jl-textarea" data-key="${k}" rows="3"
                    placeholder="${ph}" ${done?'readonly':''}>${esc(data[k]||'')}</textarea>
        </div>
      `).join('')}
      <div class="jl-count-row">
        我一共发现了
        <input class="jl-count-input" type="number" min="0" max="99"
               data-key="count" value="${data.count||''}" placeholder="?" ${done?'readonly':''}/>
        个秘密！
      </div>
      ${done?`<div class="jl-done-tag">✅ 展厅探秘完成 <button class="jl-link-btn" id="sub1Redo">修改</button></div>`:''}
    </div>
  `

  if (!done) {
    sub.querySelectorAll('[data-key]').forEach(inp =>
      inp.addEventListener('input', () => {
        ensureP2(); if (!S.group.phase2.exhibition) S.group.phase2.exhibition = {}
        sub.querySelectorAll('[data-key]').forEach(el =>
          S.group.phase2.exhibition[el.dataset.key] = el.value)
        scheduleSave()
      }))
    setBottom('', `<button class="jl-btn-primary" id="sub1Done">完成，去车间 ⚙️</button>`)
    document.getElementById('sub1Done')?.addEventListener('click', () => {
      ensureP2(); if (!S.group.phase2.exhibition) S.group.phase2.exhibition = {}
      sub.querySelectorAll('[data-key]').forEach(el =>
        S.group.phase2.exhibition[el.dataset.key] = el.value)
      S.group.phase2.sub1Done = true; S.subPhase = 2
      saveGroup().then(() => renderPhase2(document.getElementById('jlMain')))
    })
  } else {
    document.getElementById('sub1Redo')?.addEventListener('click', () => {
      S.group.phase2.sub1Done = false; renderSub1(sub)
    })
    setBottom('', `<button class="jl-btn-primary" id="sub1Next">去车间 ⚙️</button>`)
    document.getElementById('sub1Next')?.addEventListener('click', () => {
      S.subPhase = 2
      document.querySelectorAll('.jl-sub-tab').forEach(b =>
        b.classList.toggle('active', +b.dataset.sub === 2))
      renderSub()
    })
  }
}

function renderSub2(sub) {
  const equip = S.group.phase2?.equipment || [{},{},{},{}]
  const done  = !!S.group.phase2?.sub2Done
  sub.innerHTML = `
    <div class="jl-card">
      <p class="jl-card-hint">稻米生产车间里有哪些高新科技？记录下来！</p>
      <div class="jl-equip-grid">
        ${[0,1,2,3].map(i=>`
          <div class="jl-equip-card">
            <div class="jl-equip-num">设备 ${i+1}</div>
            <input class="jl-input" placeholder="名称" data-eq="${i}" data-field="name"
                   value="${esc(equip[i]?.name||'')}" ${done?'readonly':''}/>
            <textarea class="jl-textarea jl-textarea-sm" placeholder="它的作用是…"
                      data-eq="${i}" data-field="function"
                      rows="2" ${done?'readonly':''}>${esc(equip[i]?.function||'')}</textarea>
          </div>
        `).join('')}
      </div>
      ${done?`<div class="jl-done-tag">✅ 车间高科技完成 <button class="jl-link-btn" id="sub2Redo">修改</button></div>`:''}
    </div>
  `

  if (!done) {
    sub.querySelectorAll('[data-eq]').forEach(inp =>
      inp.addEventListener('input', () => {
        ensureP2(); if (!S.group.phase2.equipment) S.group.phase2.equipment = [{},{},{},{}]
        const i = +inp.dataset.eq
        if (!S.group.phase2.equipment[i]) S.group.phase2.equipment[i] = {}
        S.group.phase2.equipment[i][inp.dataset.field] = inp.value
        scheduleSave()
      }))
    setBottom('', `<button class="jl-btn-primary" id="sub2Done">完成，写新发现 💡</button>`)
    document.getElementById('sub2Done')?.addEventListener('click', () => {
      ensureP2(); if (!S.group.phase2.equipment) S.group.phase2.equipment = [{},{},{},{}]
      sub.querySelectorAll('[data-eq]').forEach(inp => {
        const i = +inp.dataset.eq
        if (!S.group.phase2.equipment[i]) S.group.phase2.equipment[i] = {}
        S.group.phase2.equipment[i][inp.dataset.field] = inp.value
      })
      S.group.phase2.sub2Done = true; S.subPhase = 3
      saveGroup().then(() => renderPhase2(document.getElementById('jlMain')))
    })
  } else {
    document.getElementById('sub2Redo')?.addEventListener('click', () => {
      S.group.phase2.sub2Done = false; renderSub2(sub)
    })
    setBottom('', `<button class="jl-btn-primary" id="sub2Next">写新发现 💡</button>`)
    document.getElementById('sub2Next')?.addEventListener('click', () => {
      S.subPhase = 3
      document.querySelectorAll('.jl-sub-tab').forEach(b =>
        b.classList.toggle('active', +b.dataset.sub === 3))
      renderSub()
    })
  }
}

function renderSub3(sub) {
  const extra = S.group.phase2?.extra || {}
  const done  = !!S.group.phase2?.completedAt
  const moods = ['😮','😊','🤔','😎','🤩','😄']
  sub.innerHTML = `
    <div class="jl-card">
      <p class="jl-card-hint">你还发现了什么特别有趣的事情？自由记录！</p>
      <textarea class="jl-textarea jl-textarea-lg" id="sub3Text" rows="6"
                placeholder="写下任何你觉得有意思的发现，比如机器的声音、米的颜色、工人叔叔做的事…"
                ${done?'readonly':''}>${esc(extra.text||'')}</textarea>
      <div class="jl-mood-wrap">
        <div class="jl-mood-label">此刻心情</div>
        <div class="jl-mood-row">
          ${moods.map(m=>`
            <button class="jl-mood-btn${extra.mood===m?' active':''}" data-mood="${m}" ${done?'disabled':''}>${m}</button>
          `).join('')}
        </div>
      </div>
      ${done?`<div class="jl-done-tag">✅ 行中探索全部完成 <button class="jl-link-btn" id="sub3Redo">修改</button></div>`:''}
    </div>
  `

  if (!done) {
    sub.querySelector('#sub3Text')?.addEventListener('input', e => {
      ensureP2(); if (!S.group.phase2.extra) S.group.phase2.extra = {}
      S.group.phase2.extra.text = e.target.value; scheduleSave()
    })
    sub.querySelectorAll('.jl-mood-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        ensureP2(); if (!S.group.phase2.extra) S.group.phase2.extra = {}
        S.group.phase2.extra.mood = btn.dataset.mood
        sub.querySelectorAll('.jl-mood-btn').forEach(b => b.classList.toggle('active', b===btn))
        scheduleSave()
      }))
    setBottom(
      `<button class="jl-btn-ghost" id="sub3Back">← 返回行前</button>`,
      `<button class="jl-btn-primary" id="sub3Done">完成行中，去写感想 💬</button>`
    )
    document.getElementById('sub3Back')?.addEventListener('click', () => {
      S.phase = 1; activateTab(1); renderPhase()
    })
    document.getElementById('sub3Done')?.addEventListener('click', () => {
      ensureP2(); if (!S.group.phase2.extra) S.group.phase2.extra = {}
      S.group.phase2.extra.text = sub.querySelector('#sub3Text')?.value || ''
      S.group.phase2.sub3Done = true
      S.group.phase2.completedAt = new Date().toISOString()
      S.phase = 3
      saveGroup().then(() => { show(screenJournal()); bindJournal() })
    })
  } else {
    document.getElementById('sub3Redo')?.addEventListener('click', () => {
      S.group.phase2.sub3Done = false; S.group.phase2.completedAt = null; renderSub3(sub)
    })
    setBottom('', `<button class="jl-btn-primary" id="sub3Next">去行后总结 💬</button>`)
    document.getElementById('sub3Next')?.addEventListener('click', () => {
      S.phase = 3; activateTab(3); renderPhase()
    })
  }
}

// ── Phase 3: 行后 ────────────────────────────────────────
function renderPhase3(el) {
  const p3 = S.group.phase3 || {}
  const questions = (S.group.phase1?.questions || []).filter(q => q?.trim())
  const resolved  = p3.resolved || {}
  const done      = !!p3.completedAt
  const moods     = ['😊','🤩','😄','🤔','😮','💪']

  el.innerHTML = `
    <div class="jl-content">
      <div class="jl-sec-head">
        <div class="jl-sec-icon">💬</div>
        <div>
          <h2 class="jl-sec-title">回来啦！说说你的收获</h2>
          <p class="jl-sec-desc">这次研学对我们的研究有哪些帮助？</p>
        </div>
      </div>

      ${questions.length ? `
        <div class="jl-card">
          <h3 class="jl-card-title">🔄 行前的问题，现在有答案了吗？</h3>
          ${questions.map((q,i)=>`
            <div class="jl-resolve-item">
              <div class="jl-resolve-q">Q${i+1}：${esc(q)}</div>
              <div class="jl-resolve-btns">
                <button class="jl-resolve-btn${resolved[i]==='yes'?' yes':''}"
                        data-qi="${i}" data-ans="yes" ${done?'disabled':''}>✅ 解决了！</button>
                <button class="jl-resolve-btn${resolved[i]==='no'?' no':''}"
                        data-qi="${i}" data-ans="no" ${done?'disabled':''}>🤔 还不清楚</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="jl-card">
        <h3 class="jl-card-title">📝 我的研学感想</h3>
        <textarea class="jl-textarea jl-textarea-lg" id="p3Ref" rows="6"
                  placeholder="写下这次研学最让你印象深刻的事，学到了什么，有什么想说的…"
                  ${done?'readonly':''}>${esc(p3.reflection||'')}</textarea>
      </div>

      <div class="jl-card">
        <h3 class="jl-card-title">这次研学我的总体感受</h3>
        <div class="jl-mood-row">
          ${moods.map(m=>`
            <button class="jl-mood-btn${p3.finalMood===m?' active':''}" data-mood="${m}" ${done?'disabled':''}>${m}</button>
          `).join('')}
        </div>
      </div>

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
    el.querySelectorAll('.jl-resolve-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        if (!S.group.phase3) S.group.phase3 = {}
        if (!S.group.phase3.resolved) S.group.phase3.resolved = {}
        S.group.phase3.resolved[btn.dataset.qi] = btn.dataset.ans
        el.querySelectorAll(`[data-qi="${btn.dataset.qi}"]`).forEach(b => {
          b.classList.remove('yes','no')
          if (b.dataset.ans === btn.dataset.ans)
            b.classList.add(btn.dataset.ans === 'yes' ? 'yes' : 'no')
        })
        scheduleSave()
      }))
    el.querySelector('#p3Ref')?.addEventListener('input', e => {
      if (!S.group.phase3) S.group.phase3 = {}
      S.group.phase3.reflection = e.target.value; scheduleSave()
    })
    el.querySelectorAll('.jl-mood-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        if (!S.group.phase3) S.group.phase3 = {}
        S.group.phase3.finalMood = btn.dataset.mood
        el.querySelectorAll('.jl-mood-btn').forEach(b => b.classList.toggle('active', b===btn))
        scheduleSave()
      }))
    setBottom(
      `<button class="jl-btn-ghost" id="p3Back">← 返回行中</button>`,
      `<button class="jl-btn-primary" id="p3Complete">完成全部研学记录 🎉</button>`
    )
    document.getElementById('p3Back')?.addEventListener('click', () => {
      S.phase = 2; S.subPhase = 3; activateTab(2); renderPhase()
    })
    document.getElementById('p3Complete')?.addEventListener('click', () => {
      if (!S.group.phase3) S.group.phase3 = {}
      S.group.phase3.reflection = el.querySelector('#p3Ref')?.value || ''
      S.group.phase3.completedAt = new Date().toISOString()
      saveGroup().then(() => renderPhase3(el)); setBottom()
    })
  } else {
    document.getElementById('p3Redo')?.addEventListener('click', () => {
      S.group.phase3.completedAt = null; renderPhase3(el)
    })
    setBottom()
  }
}

// ── Utils ────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
