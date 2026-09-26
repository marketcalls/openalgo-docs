// OpenAlgo docs infographic kit runtime.
//  - <div class="ic" data-icon="server"></div> is filled with the Lucide icon.
//  - <span data-icon="shield"></span> anywhere gets the icon too.
//  - connect(fromId, toId, opts) draws a curved arrow between two elements.
//      opts: { label, color: 'client'|'app'|..., dashed, from: 'right'|'left'|'top'|'bottom',
//              to: side, bend: number, both: bool, width }
// The page sets window.__ready once icons are inlined and wires are drawn.
(function () {
  const pending = []
  window.connect = (a, b, opts = {}) => pending.push([a, b, opts])

  const ROLE = { client: '#38bdf8', app: '#2dd4bf', service: '#a78bfa', data: '#fbbf24', broker: '#4ade80',
    external: '#94a3b8', security: '#fb7185', ai: '#f472b6', muted: '#64748b' }

  async function inlineIcons() {
    const els = [...document.querySelectorAll('[data-icon]')]
    const names = [...new Set(els.map(e => e.dataset.icon))]
    const svgs = {}
    await Promise.all(names.map(async n => {
      const r = await fetch('/icons/' + n + '.svg')
      if (!r.ok) throw new Error('unknown icon: ' + n)
      svgs[n] = await r.text()
    }))
    els.forEach(e => { e.innerHTML = svgs[e.dataset.icon] })
  }

  function side(r, s) {
    switch (s) {
      case 'left': return { x: r.left, y: r.top + r.height / 2, dx: -1, dy: 0 }
      case 'right': return { x: r.right, y: r.top + r.height / 2, dx: 1, dy: 0 }
      case 'top': return { x: r.left + r.width / 2, y: r.top, dx: 0, dy: -1 }
      default: return { x: r.left + r.width / 2, y: r.bottom, dx: 0, dy: 1 }
    }
  }
  function autoSides(ra, rb) {
    const ax = ra.left + ra.width / 2, ay = ra.top + ra.height / 2
    const bx = rb.left + rb.width / 2, by = rb.top + rb.height / 2
    const dx = bx - ax, dy = by - ay
    if (Math.abs(dx) > Math.abs(dy) * 1.2) return dx > 0 ? ['right', 'left'] : ['left', 'right']
    return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom']
  }

  function draw() {
    const canvas = document.getElementById('canvas')
    const cr = canvas.getBoundingClientRect()
    const NS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(NS, 'svg')
    svg.id = 'wires'
    svg.setAttribute('width', cr.width); svg.setAttribute('height', cr.height)
    const defs = document.createElementNS(NS, 'defs')
    svg.appendChild(defs)
    canvas.prepend(svg)
    const markers = {}
    const marker = (color) => {
      if (markers[color]) return markers[color]
      const id = 'm' + Object.keys(markers).length
      const m = document.createElementNS(NS, 'marker')
      m.setAttribute('id', id); m.setAttribute('viewBox', '0 0 10 10'); m.setAttribute('refX', '8'); m.setAttribute('refY', '5')
      m.setAttribute('markerWidth', '7'); m.setAttribute('markerHeight', '7'); m.setAttribute('orient', 'auto-start-reverse')
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M0,0 L10,5 L0,10 z'); p.setAttribute('fill', color)
      m.appendChild(p); defs.appendChild(m)
      return (markers[color] = id)
    }
    for (const [a, b, o] of pending) {
      const ea = document.getElementById(a), eb = document.getElementById(b)
      if (!ea || !eb) throw new Error('connect: missing element ' + (!ea ? a : b))
      const ra0 = ea.getBoundingClientRect(), rb0 = eb.getBoundingClientRect()
      const rel = r => ({ left: r.left - cr.left, right: r.right - cr.left, top: r.top - cr.top, bottom: r.bottom - cr.top, width: r.width, height: r.height })
      const ra = rel(ra0), rb = rel(rb0)
      const [sa, sb] = o.from && o.to ? [o.from, o.to] : autoSides(ra, rb)
      const p1 = side(ra, o.from || sa), p2 = side(rb, o.to || sb)
      const gap = 6
      p1.x += p1.dx * gap; p1.y += p1.dy * gap; p2.x += p2.dx * (gap + 4); p2.y += p2.dy * (gap + 4)
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const k = o.bend != null ? o.bend : Math.max(40, dist * 0.4)
      const c1 = { x: p1.x + p1.dx * k, y: p1.y + p1.dy * k }, c2 = { x: p2.x + p2.dx * k, y: p2.y + p2.dy * k }
      const color = ROLE[o.color] || o.color || '#7dd3fc'
      const glow = document.createElementNS(NS, 'path')
      const d = `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`
      glow.setAttribute('d', d); glow.setAttribute('fill', 'none'); glow.setAttribute('stroke', color)
      glow.setAttribute('stroke-width', (o.width || 2.2) + 6); glow.setAttribute('stroke-opacity', '.12'); glow.setAttribute('stroke-linecap', 'round')
      const path = document.createElementNS(NS, 'path')
      path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', color)
      path.setAttribute('stroke-width', o.width || 2.2); path.setAttribute('stroke-linecap', 'round')
      if (o.dashed) path.setAttribute('stroke-dasharray', '7 7')
      path.setAttribute('marker-end', `url(#${marker(color)})`)
      if (o.both) path.setAttribute('marker-start', `url(#${marker(color)})`)
      svg.appendChild(glow); svg.appendChild(path)
      if (o.label) {
        const t = 0.5, mt = 1 - t
        const x = mt ** 3 * p1.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * p2.x
        const y = mt ** 3 * p1.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * p2.y
        const l = document.createElement('div')
        l.className = 'wlabel'; l.textContent = o.label
        l.style.left = x + 'px'; l.style.top = y + 'px'; l.style.borderColor = color + '66'
        canvas.appendChild(l)
      }
    }
  }

  window.addEventListener('load', async () => {
    try {
      await inlineIcons()
      await document.fonts.ready
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      draw()
      window.__ready = 'ok'
    } catch (e) {
      window.__ready = 'error: ' + (e && e.message || e)
    }
  })
})()
