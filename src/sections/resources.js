import { getData } from '../utils/storage.js'
import { asset } from '../utils/asset.js'
import routesDefault from '../data/routes.json'
import coursesDefault from '../data/courses.json'

const ROUTE_IMAGES = [
  asset('/images/routes/scene1.jpg'),
  asset('/images/routes/scene2.jpg'),
  asset('/images/routes/scene3.jpg'),
  asset('/images/routes/scene4.jpg'),
  asset('/images/routes/scene5.jpg'),
  asset('/images/routes/scene6.jpg'),
]

const COURSE_IMAGES = [
  asset('/images/study/img_06.jpg'),
  asset('/images/study/img_01.jpg'),
  asset('/images/study/img_04.jpg'),
]

function svgIcon(d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
}

const icons = {
  location: svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  clock: svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  grade: svgIcon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
}

export function initResources() {
  const routes = getData('routes', routesDefault)
  const courses = getData('courses', coursesDefault)

  renderRoutes(routes)
  renderCourses(courses)
  initTabs()
}

function renderRoutes(routes) {
  const grid = document.querySelector('.routes-grid')
  if (!grid) return

  grid.innerHTML = routes.map((r, i) => `
    <div class="route-card anim-fade-up delay-${(i % 3) + 1}" data-id="${r.id}">
      <div class="route-card-img">
        <img src="${ROUTE_IMAGES[i] || ROUTE_IMAGES[0]}" alt="${r.name}" loading="lazy" />
        <span class="route-num">线路 ${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="route-card-body">
        <div class="route-card-name">${r.name}</div>
        <div class="route-card-subtitle">「${r.subtitle}」</div>
        <div class="route-tags">
          ${r.audience.map(a => `<span class="tag">${a}</span>`).join('')}
        </div>
        <button class="route-expand-btn" aria-expanded="false">
          查看详情
          <span class="arrow">›</span>
        </button>
        <div class="route-details" aria-hidden="true">
          <div class="stops-list">
            ${r.stops.map((s, si) => `
              <div class="stop-item">
                <div class="stop-dot">${si + 1}</div>
                <div class="stop-info">
                  <div class="stop-name">${s.name}</div>
                  <div class="stop-acts">${s.activities.join(' · ')}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="route-poem">
            <div class="route-poem-title">《${r.poemTitle}》</div>
            <div class="route-poem-text">${r.poem}</div>
          </div>
        </div>
      </div>
    </div>
  `).join('')

  // Expand/collapse
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.route-expand-btn')
    if (!btn) return
    const card = btn.closest('.route-card')
    const expanded = card.classList.toggle('expanded')
    btn.setAttribute('aria-expanded', expanded)
    card.querySelector('.route-details').setAttribute('aria-hidden', !expanded)
  })
}

function renderCourses(courses) {
  const list = document.querySelector('.courses-list')
  if (!list) return

  list.innerHTML = courses.map((c, i) => `
    <div class="course-card anim-fade-up delay-${i + 1}">
      <div class="course-card-img">
        <img src="${COURSE_IMAGES[i] || COURSE_IMAGES[0]}" alt="${c.name}" loading="lazy" />
        <span class="course-num-badge">课程 ${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="course-card-body">
        <div class="course-grade-badge">
          ${icons.grade} ${c.grade}
        </div>
        <div class="course-card-name">《${c.name}》</div>
        <div class="course-desc">${c.description}</div>
        <div class="course-activities">
          ${c.activities.map(a => `<span class="activity-chip">${a}</span>`).join('')}
        </div>
        <div class="course-locations">
          ${icons.location}
          ${c.locations.join(' · ')}
        </div>
      </div>
    </div>
  `).join('')
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn')
  const panels = document.querySelectorAll('.tab-panel')

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab
      tabs.forEach((t) => t.classList.remove('active'))
      panels.forEach((p) => p.classList.remove('active'))
      btn.classList.add('active')
      document.querySelector(`.tab-panel[data-panel="${target}"]`)?.classList.add('active')
    })
  })
}
