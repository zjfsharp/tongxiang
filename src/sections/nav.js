export function initNav() {
  const nav = document.querySelector('.nav')
  const hamburger = document.querySelector('.nav-hamburger')
  const drawer = document.querySelector('.nav-drawer')

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled')
    } else {
      nav.classList.remove('scrolled')
    }
  }, { passive: true })

  // Hamburger
  hamburger?.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open')
    hamburger.setAttribute('aria-expanded', isOpen)
  })

  // Close drawer on link click
  drawer?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => drawer.classList.remove('open'))
  })

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'))
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}
