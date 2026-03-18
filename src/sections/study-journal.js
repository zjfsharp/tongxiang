import shimemData from '../data/shimen.json'
import { asset } from '../utils/asset.js'

const API  = `${location.origin}/txyx/api`
const BASE = import.meta.env.BASE_URL

let heroIndex = 0
let heroTimer = null

export function initStudyJournal() {
  const section = document.getElementById('tasks')
  if (!section) return
  section.innerHTML = `<div class="sj-intro" id="sjIntro"></div>`
  renderIntro()
  renderEntry()
  startCarousel()
}

// ── Intro block ───────────────────────────────────────────
function renderIntro() {
  const el = document.getElementById('sjIntro')
  if (!el) return
  const imgs = shimemData.images.map(p => asset(p))
  el.innerHTML = `
    <div class="sj-intro-inner container">
      <div class="sj-intro-text">
        <p class="section-label anim-slide-left">石门湾研学基地</p>
        <h2 class="section-title anim-slide-left delay-1">${shimemData.tagline}</h2>
        <p class="section-desc anim-slide-left delay-2">${shimemData.description}</p>
        <div class="sj-highlights">
          ${shimemData.highlights.map(h=>`
            <div class="sj-highlight">
              <span class="sj-highlight-icon">${h.icon}</span>
              <div>
                <div class="sj-highlight-val">${h.value}</div>
                <div class="sj-highlight-label">${h.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="sj-honors">
          ${shimemData.honors.map(h=>`<span class="sj-honor-tag">${h}</span>`).join('')}
        </div>
      </div>
      <div class="sj-intro-carousel">
        <div class="sj-carousel-track" id="sjTrack">
          ${imgs.map((src,i)=>`
            <img class="sj-carousel-img${i===0?' active':''}" src="${src}" alt="" loading="lazy"/>
          `).join('')}
        </div>
        <div class="sj-carousel-dots" id="sjDots">
          ${imgs.map((_,i)=>`<button class="sj-carousel-dot${i===0?' active':''}" data-i="${i}"></button>`).join('')}
        </div>
      </div>
    </div>
    <div class="container sj-cta-container"><div class="sj-cta-strip" id="sjEntry"></div></div>
  `
  el.querySelectorAll('.sj-carousel-dot').forEach(btn =>
    btn.addEventListener('click', () => carouselGoTo(+btn.dataset.i)))
}

function startCarousel() {
  const imgs = shimemData.images
  if (imgs.length <= 1) return
  clearInterval(heroTimer)
  heroTimer = setInterval(() => carouselGoTo((heroIndex + 1) % imgs.length), 4000)
}

function carouselGoTo(i) {
  clearInterval(heroTimer)
  heroIndex = i
  document.querySelectorAll('.sj-carousel-img').forEach((el, idx) => el.classList.toggle('active', idx === i))
  document.querySelectorAll('.sj-carousel-dot').forEach((el, idx) => el.classList.toggle('active', idx === i))
  heroTimer = setInterval(() => carouselGoTo((heroIndex + 1) % shimemData.images.length), 4000)
}

// ── Entry (inline, inside intro text column) ──────────────
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
    const r = await fetch(`${API}/groups/${encodeURIComponent(code)}/status`)
    const data = await r.json()
    if (!data.exists) {
      renderEntry('❌ 该组号不存在，请询问老师')
      return
    }
    window.location.href = `${BASE}journal.html?code=${encodeURIComponent(code)}`
  } catch {
    renderEntry('⚠️ 网络异常，请检查网络后重试')
  }
}
