import { getData, setData } from '../utils/storage.js'
import tasksDefault from '../data/tasks.json'
import routesDefault from '../data/routes.json'

const STATUS_MAP = {
  '招募中':   { cls: 'recruiting', label: '招募中' },
  '已满':     { cls: 'full',       label: '已满' },
  '即将开始': { cls: 'soon',       label: '即将开始' },
}

const STATUS_COLORS = {
  '招募中':   '#c8963c',
  '已满':     '#9e3333',
  '即将开始': '#3a7abf',
}

function svgIcon(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
}
const icons = {
  location: svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  clock: svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  grade: svgIcon('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'),
  people: svgIcon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
}

export function initTasks() {
  const tasks = getData('tasks', tasksDefault)
  const routes = getData('routes', routesDefault)

  renderTasks(tasks)
  renderForm(routes)
  initForm()
}

function renderTasks(tasks) {
  const container = document.querySelector('.task-cards')
  const countEl = document.querySelector('.tasks-count')
  if (!container) return

  const active = tasks.filter(t => t.status !== '已满')
  if (countEl) countEl.textContent = `${active.length} 个任务招募中`

  container.innerHTML = tasks.map((t, i) => {
    const s = STATUS_MAP[t.status] || STATUS_MAP['招募中']
    const pct = Math.min(100, Math.round((t.enrolled / t.capacity) * 100))
    const color = STATUS_COLORS[t.status] || STATUS_COLORS['招募中']
    return `
      <div class="task-card anim-fade-up delay-${(i % 3) + 1}"
           style="--status-color: ${color}">
        <div class="task-card-top">
          <div class="task-card-title">${t.title}</div>
          <span class="status-badge ${s.cls}">${s.label}</span>
        </div>
        <div class="task-card-desc">${t.description}</div>
        <div class="task-meta">
          <span class="task-meta-item">${icons.grade} ${t.grade}</span>
          <span class="task-meta-item">${icons.location} ${t.location}</span>
          <span class="task-meta-item">${icons.clock} ${t.duration}</span>
          <span class="task-meta-item">${icons.people} 限${t.capacity}人</span>
        </div>
        <div class="capacity-bar">
          <div class="capacity-track">
            <div class="capacity-fill" style="width: ${pct}%; background: ${color}"></div>
          </div>
          <span class="capacity-label">${t.enrolled}/${t.capacity} 人</span>
        </div>
      </div>
    `
  }).join('')
}

function renderForm(routes) {
  const checkboxGroup = document.querySelector('.routes-checkbox-group')
  if (!checkboxGroup) return
  checkboxGroup.innerHTML = routes.map(r => `
    <label class="checkbox-item">
      <input type="checkbox" name="route" value="${r.name}" />
      <span>${r.name}</span>
    </label>
  `).join('')
}

function initForm() {
  const form = document.querySelector('.interest-form')
  const formCard = document.querySelector('.interest-form-card')
  const success = document.querySelector('.form-success')

  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(form))
    const routes = [...form.querySelectorAll('input[name="route"]:checked')]
      .map(el => el.value)
    data.routes = routes
    data.submittedAt = new Date().toISOString()

    // Save to localStorage
    const existing = getData('submissions', [])
    existing.push(data)
    setData('submissions', existing)

    // Show success
    form.style.display = 'none'
    success.classList.add('show')
    form.reset()
  })
}
