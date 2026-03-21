import { asset } from '../utils/asset.js'

const API  = `${location.origin}/txyx/api`
const BASE = import.meta.env.BASE_URL

// Per-task carousel state
const carouselState = {}

export async function initStudyJournal() {
  const section = document.getElementById('tasks')
  if (!section) return

  section.innerHTML = `
    <div class="sj-section-header container">
      <p class="section-label anim-slide-left">研学活动</p>
      <h2 class="section-title anim-slide-left delay-1">走进桐乡<br/>每一段研学旅程</h2>
    </div>
    <div class="sj-tasks-list" id="sjTasksList">
      <div class="sj-loading">加载中…</div>
    </div>
    <div class="container sj-cta-container">
      <div class="sj-cta-strip" id="sjEntry"></div>
    </div>
  `

  renderEntry()

  let tasks = []
  try {
    const r = await fetch(`${API}/tasks`)
    if (r.ok) tasks = (await r.json()).filter(t => t.journalEnabled)
  } catch (_) {}

  const list = document.getElementById('sjTasksList')
  if (!tasks.length) {
    list.innerHTML = `<div class="container" style="padding:40px 0;color:var(--muted);text-align:center">暂无研学任务</div>`
    return
  }

  list.innerHTML = tasks.map(t => renderTaskCard(t)).join('')

  // Bind carousels
  tasks.forEach(t => {
    const imgs = resolveImages(t.images)
    if (imgs.length > 1) startCarousel(t.id, imgs)
    list.querySelectorAll(`.sj-carousel-dot[data-task="${t.id}"]`).forEach(btn =>
      btn.addEventListener('click', () => carouselGoTo(t.id, +btn.dataset.i, resolveImages(t.images)))
    )
  })
}

// Resolve image paths: static public paths stay as-is (go through asset()), API paths stay as-is
function resolveImages(images) {
  if (!images || !images.length) return []
  return images.map(p => p.startsWith('/txyx/api/') ? p : asset(p))
}

// ── Unified task card ──────────────────────────────────────
function renderTaskCard(t) {
  const imgs   = resolveImages(t.images)
  const ct     = t.coverText || {}
  const status = statusBadge(t)
  const title  = ct.tagline || t.title
  const sub    = ct.subtitle || t.location || ''
  const desc   = ct.description || t.description || ''

  return `
    <div class="sj-task-card-wrap container">
      <div class="sj-task-card">
        <div class="sj-task-card-img${imgs.length ? '' : ' sj-task-card-img--empty'}">
          ${imgs.length ? carouselHtml(t.id, imgs) : '<span>📚</span>'}
        </div>
        <div class="sj-task-card-body">
          ${sub ? `<p class="sj-task-card-sub">${esc(sub)}</p>` : ''}
          <div class="sj-task-card-title">${esc(title)}</div>
          <p class="sj-task-card-desc">${esc(desc)}</p>
          ${ct.highlights?.length ? `
          <div class="sj-highlights" style="margin-top:20px">
            ${ct.highlights.map(h => `
              <div class="sj-highlight">
                <span class="sj-highlight-icon">${h.icon}</span>
                <div>
                  <div class="sj-highlight-val">${esc(h.value)}</div>
                  <div class="sj-highlight-label">${esc(h.label)}</div>
                </div>
              </div>
            `).join('')}
          </div>` : ''}
          ${ct.honors?.length ? `
          <div class="sj-honors" style="margin-top:16px">
            ${ct.honors.map(h => `<span class="sj-honor-tag">${esc(h)}</span>`).join('')}
          </div>` : ''}
          <div class="sj-task-meta" style="margin-top:20px">
            ${status}
            <span class="sj-meta-chip">📍 ${esc(t.location)}</span>
            <span class="sj-meta-chip">👥 ${esc(t.grade)}</span>
            <span class="sj-meta-chip">⏱ ${esc(t.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  `
}

function carouselHtml(taskId, imgs) {
  if (!imgs.length) return ''
  return `
    <div class="sj-carousel-track" id="sjTrack-${taskId}">
      ${imgs.map((src, i) => `
        <img class="sj-carousel-img${i === 0 ? ' active' : ''}" src="${src}" alt="" loading="lazy"/>
      `).join('')}
    </div>
    ${imgs.length > 1 ? `
    <div class="sj-carousel-dots" id="sjDots-${taskId}">
      ${imgs.map((_, i) => `<button class="sj-carousel-dot${i === 0 ? ' active' : ''}" data-task="${taskId}" data-i="${i}"></button>`).join('')}
    </div>` : ''}
  `
}

function statusBadge(t) {
  const map = { '招募中': 'green', '已满': 'red', '即将开始': 'amber', '已结束': 'gray' }
  const color = map[t.status] || 'gray'
  return `<span class="sj-status-badge sj-status-badge--${color}">${esc(t.status || '')}</span>`
}

// ── Carousel logic ─────────────────────────────────────────
function startCarousel(taskId, imgs) {
  if (carouselState[taskId]) clearInterval(carouselState[taskId].timer)
  carouselState[taskId] = { index: 0 }
  carouselState[taskId].timer = setInterval(
    () => carouselGoTo(taskId, (carouselState[taskId].index + 1) % imgs.length, imgs), 4000
  )
}

function carouselGoTo(taskId, i, imgs) {
  if (carouselState[taskId]) {
    clearInterval(carouselState[taskId].timer)
    carouselState[taskId].index = i
    carouselState[taskId].timer = setInterval(
      () => carouselGoTo(taskId, (i + 1) % imgs.length, imgs), 4000
    )
  }
  document.querySelectorAll(`#sjTrack-${taskId} .sj-carousel-img`).forEach((el, idx) =>
    el.classList.toggle('active', idx === i))
  document.querySelectorAll(`.sj-carousel-dot[data-task="${taskId}"]`).forEach((el, idx) =>
    el.classList.toggle('active', idx === i))
}

// ── Entry bar ──────────────────────────────────────────────
function renderEntry(error = '') {
  const el = document.getElementById('sjEntry')
  if (!el) return
  el.innerHTML = `
    <div class="sj-cta-inner">
      <div class="sj-cta-left">
        <span class="sj-cta-icon">📖</span>
        <div>
          <p class="sj-cta-title">进入研学记录</p>
          <p class="sj-cta-sub">输入老师分配的组号，开始或继续你的研学之旅</p>
        </div>
      </div>
      <div class="sj-cta-right">
        <div class="sj-entry-row">
          <input class="sj-code-input" id="sjCode" type="text"
                 placeholder="输入组号，如 A1"
                 autocomplete="off" autocapitalize="none" spellcheck="false"/>
          <button class="sj-entry-btn" id="sjEnterBtn">进入 →</button>
        </div>
        ${error ? `<div class="sj-entry-error">${error}</div>` : ''}
        <p class="sj-entry-hint">组号由老师统一分配，首次进入可自行设置4位密码</p>
      </div>
    </div>
  `
  document.getElementById('sjCode')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleEnter()
  })
  document.getElementById('sjEnterBtn')?.addEventListener('click', handleEnter)
}

async function handleEnter() {
  const code = document.getElementById('sjCode')?.value.trim()
  if (!code) return renderEntry('请输入小组号')
  const btn = document.getElementById('sjEnterBtn')
  btn.textContent = '验证中…'; btn.disabled = true
  try {
    const r    = await fetch(`${API}/groups/${encodeURIComponent(code)}/status`)
    const data = await r.json()
    if (!data.exists) { renderEntry('❌ 该组号不存在，请询问老师'); return }
    window.location.href = `${BASE}journal.html?code=${encodeURIComponent(code)}`
  } catch {
    renderEntry('⚠️ 网络异常，请检查网络后重试')
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
