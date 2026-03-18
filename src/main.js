import './style.css'
import { initNav } from './sections/nav.js'
import { initHero } from './sections/hero.js'
import { initResources } from './sections/resources.js'
import { initInheritors } from './sections/inheritors.js'
import { initStudyJournal } from './sections/study-journal.js'
import { initScrollAnimations, initCounters } from './utils/scroll-anim.js'

document.addEventListener('DOMContentLoaded', () => {
  initNav()
  initHero()
  initResources()
  initInheritors()
  initStudyJournal()

  // Init scroll animations after everything is rendered
  requestAnimationFrame(() => {
    initScrollAnimations()
    initCounters()
  })
})
