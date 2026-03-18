import './style.css'
import { initNav } from './sections/nav.js'
import { initHero } from './sections/hero.js'
import { initResources } from './sections/resources.js'
import { initInheritors } from './sections/inheritors.js'
import { initTasks } from './sections/tasks.js'
import { initScrollAnimations, initCounters } from './utils/scroll-anim.js'

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initHero()
  initResources()
  initInheritors()
  initTasks()

  // Init scroll animations after everything is rendered
  requestAnimationFrame(() => {
    initScrollAnimations()
    initCounters()
  })
})
