import { asset } from '../utils/asset.js'

const SLIDES = [
  asset('/images/shimen/3.jpg'),    // 傍晚稻田·大楼灯光
  asset('/images/routes/scene8.jpg'),
  asset('/images/shimen/2.jpg'),    // 鸟瞰全景·绿野稻田
  asset('/images/routes/scene4.jpg'),
  asset('/images/shimen/1.jpg'),    // 石门湾正门
  asset('/images/routes/scene7.jpg'),
]

export function initHero() {
  const container = document.querySelector('.hero-bg')
  const dotsContainer = document.querySelector('.hero-dots')
  let current = 0
  let timer

  // Create slides
  SLIDES.forEach((src, i) => {
    const slide = document.createElement('div')
    slide.className = 'hero-slide' + (i === 0 ? ' active' : '')
    slide.style.backgroundImage = `url(${src})`
    container.appendChild(slide)
  })

  // Create dots
  SLIDES.forEach((_, i) => {
    const dot = document.createElement('button')
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '')
    dot.setAttribute('aria-label', `Slide ${i + 1}`)
    dot.addEventListener('click', () => goTo(i))
    dotsContainer.appendChild(dot)
  })

  function goTo(index) {
    const slides = container.querySelectorAll('.hero-slide')
    const dots = dotsContainer.querySelectorAll('.hero-dot')
    slides[current].classList.remove('active')
    dots[current].classList.remove('active')
    current = index
    slides[current].classList.add('active')
    dots[current].classList.add('active')
    resetTimer()
  }

  function next() {
    goTo((current + 1) % SLIDES.length)
  }

  function resetTimer() {
    clearInterval(timer)
    timer = setInterval(next, 4000)
  }

  resetTimer()
}
