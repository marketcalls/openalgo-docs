// Render an infographic built with the kit (kit/kit.css + kit/kit.js) to PNG.
//
//   node render-html.mjs input.html output.png
//
// input.html contains only the diagram markup: a <div id="canvas"> ... </div>
// followed by an optional <script> with connect(...) calls. The kit, fonts and
// Lucide icons are injected. Output is the #canvas element at 2x.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import puppeteer from 'puppeteer-core'

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('usage: node render-html.mjs input.html output.png')
  process.exit(2)
}
const HERE = path.dirname(new URL(import.meta.url).pathname)
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const body = fs.readFileSync(input, 'utf8')
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/kit/kit.css"><script src="/kit/kit.js"></script></head>
<body>${body}</body></html>`

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  if (url.startsWith('/icons/')) {
    const f = path.join(HERE, 'node_modules/lucide-static/icons', path.basename(url))
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': 'image/svg+xml' }); return fs.createReadStream(f).pipe(res)
  }
  if (url.startsWith('/kit/')) {
    const f = path.join(HERE, path.basename(url))
    res.writeHead(200, { 'content-type': url.endsWith('.css') ? 'text/css' : 'text/javascript' })
    return fs.createReadStream(f).pipe(res)
  }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(html)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.setViewport({ width: 2600, height: 2000, deviceScaleFactor: 2 })
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' })
  await page.waitForFunction('window.__ready', { timeout: 30000 })
  const status = await page.evaluate('window.__ready')
  if (status !== 'ok' || errors.length) {
    console.error('RENDER ' + status + (errors.length ? ' ' + errors.join('; ') : ''))
    process.exitCode = 1
  } else {
    // Warn about text that overflows its box (clipped or overlapping labels).
    const overflow = await page.evaluate(() => [...document.querySelectorAll('#canvas b, #canvas span, #canvas .wlabel')]
      .filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.textContent.trim().slice(0, 40)))
    const canvas = await page.$('#canvas')
    const box = await canvas.boundingBox()
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
    await canvas.screenshot({ path: output, omitBackground: true })
    console.log(`ok ${output} ${Math.round(box.width * 2)}x${Math.round(box.height * 2)}` + (overflow.length ? ` WARN overflow: ${overflow.join(' | ')}` : ''))
  }
} finally {
  await browser.close()
  server.close()
}
