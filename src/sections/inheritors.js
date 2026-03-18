import { getData } from '../utils/storage.js'
import inheritorDefault from '../data/inheritors.json'

const CATEGORY_COLORS = {
  '民间文学':  '#7b5ea7',
  '传统舞蹈':  '#d4618c',
  '传统戏剧':  '#c8502a',
  '曲艺':     '#8c6a3a',
  '传统美术':  '#3a7abf',
  '传统技艺':  '#2d8a5a',
  '传统医药':  '#5a7a3a',
  '民俗':     '#c8963c',
}

export function initInheritors() {
  const data = getData('inheritors', inheritorDefault)
  const categories = ['全部', ...new Set(data.map(d => d.category))]

  renderFilters(categories)
  renderCards(data)

  document.querySelector('.category-filters')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill')
    if (!pill) return
    const cat = pill.dataset.cat

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'))
    pill.classList.add('active')

    document.querySelectorAll('.inheritor-card').forEach((card) => {
      const match = cat === '全部' || card.dataset.category === cat
      if (match) {
        card.classList.remove('hidden')
        card.style.position = ''
        card.style.visibility = ''
      } else {
        card.classList.add('hidden')
      }
    })
  })
}

function renderFilters(categories) {
  const container = document.querySelector('.category-filters')
  if (!container) return
  container.innerHTML = categories.map((c, i) => `
    <button class="filter-pill${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</button>
  `).join('')
}

function renderCards(data) {
  const grid = document.querySelector('.inheritors-grid')
  if (!grid) return

  grid.innerHTML = data.map((item, i) => {
    const color = CATEGORY_COLORS[item.category] || '#c8963c'
    return `
      <div class="inheritor-card anim-fade-up delay-${(i % 4) + 1}"
           data-category="${item.category}"
           style="--cat-color: ${color}">
        <span class="inheritor-emoji">${item.emoji}</span>
        <div class="inheritor-name">${item.name}</div>
        <div class="inheritor-project">${item.project}</div>
        <div class="inheritor-category-badge">${item.category}</div>
        <div class="inheritor-desc">${item.description}</div>
      </div>
    `
  }).join('')
}
