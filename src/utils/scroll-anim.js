// Intersection Observer based scroll animations

export function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          // Don't unobserve — let it stay visible
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )

  document.querySelectorAll(
    '.anim-fade-up, .anim-fade-in, .anim-slide-left'
  ).forEach((el) => observer.observe(el))
}

export function animateCounter(el, target, duration = 1800) {
  const start = performance.now()
  const easeOut = (t) => 1 - Math.pow(1 - t, 3)

  const step = (now) => {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const current = Math.round(easeOut(progress) * target)
    el.textContent = current
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

export function initCounters() {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target
          const target = parseInt(el.dataset.target, 10)
          animateCounter(el, target)
          counterObserver.unobserve(el)
        }
      })
    },
    { threshold: 0.5 }
  )

  document.querySelectorAll('[data-counter]').forEach((el) =>
    counterObserver.observe(el)
  )
}
