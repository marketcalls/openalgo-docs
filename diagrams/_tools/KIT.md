# OpenAlgo docs infographic kit - authoring guide

Audience: about 90% traders, 10% developers. Every image must be understandable
by a trader who has never read code, while keeping the technical facts correct
for developers (as small secondary text or chips).

Reference pilot (open both before starting):
- source:  diagrams/_tools/pilot-market-data.html
- output:  diagrams/_tools/pilot-market-data-v2.png

Render:
    cd diagrams/_tools
    node render-html.mjs <input.html> <output.png>
It prints `ok <file> WxH` (plus `WARN overflow: ...` if any text is clipped - fix it) or `RENDER error ...`.
Always open the PNG with the Read tool and look at it before you are done.

## File contents
Only the markup: one `<div id="canvas" style="width:1680px">...</div>` followed by an
optional `<script>` with `connect(...)` calls. Kit CSS/JS, fonts and icons are injected.
Keep `width:1680px` for every image so the set looks consistent (use 1280px only for very small diagrams).

## Structure of every image
1. Title block:
   <div class="title"><div class="eyebrow">Topic</div><h1>Plain-language headline</h1><p style="max-width:1000px">One sentence a trader understands.</p></div>
   The headline says what the picture SHOWS or why it matters ("Every order takes the same safe path"), not a component name.
2. The diagram, built from the components below.
3. Optional legend (only if 3+ colours are used) and optional .note callouts for one key takeaway.

## Components
- Node card: `<div class="node ROLE" id="x"><div class="ic" data-icon="LUCIDE-NAME"></div><div class="tx"><b>Title</b><span>short plain explanation</span></div></div>`
  - variants: add `big`, `stack` (icon on top), `wide`, `hero` (the main subject; use once).
  - technical detail as chips inside .tx: `<div class="chips"><span class="chip">port 8765</span><span class="chip">sandbox.db</span></div>`
- Roles (colour meaning, keep consistent across all images):
  client (blue: you, your tools, TradingView/Amibroker/Excel/Python), app (teal: the OpenAlgo server, web app, API),
  service (violet: engines, workers, schedulers, processing steps), data (amber: databases, files, message bus),
  broker (green: broker and broker adapters), security (rose: login, API key checks, limits, protection),
  external (grey: Telegram, email, AI providers, other third parties), ai (pink: the AI agent/LLM).
- Zone (a boundary such as "Your OpenAlgo server", "Separate process", "Sandbox"):
  `<div class="zone" style="--c:var(--app)"><div class="zl"><span data-icon="server"></span>Label</div> ...children... </div>`
- Numbered steps for flows: `<div class="step" style="--c:var(--client)"><div class="n">1</div><div class="node ...">...</div></div>`
  For a request lifecycle, a clear numbered vertical or horizontal sequence of cards beats a tangle of arrows.
- Note: `<div class="note"><span data-icon="lightbulb"></span><div>Key takeaway in one sentence.</div></div>`
- Layout helpers: .row (flex row), .col (flex column), .grid (set grid-template-columns inline), gap via inline style.
- Arrows: in the script, `connect('fromId','toId',{color:'client', label:'order', dashed:true, from:'right', to:'left', bend:60, both:true})`.
  Sides are chosen automatically; set from/to only when needed. Label arrows only when it adds meaning. Keep arrows few and readable (no crossing spaghetti).
- Icons: any Lucide icon name (https://lucide.dev), e.g. server, database, radio, radio-tower, plug-zap, cable, shield-check, key-round,
  chart-candlestick, workflow, bot, sheet, code-xml, send, bell, mail, clock, timer, gauge, layers, cpu, globe, lock, user, users,
  smartphone, monitor, webhook, zap, activity, list-checks, file-text, scroll-text, hard-drive, cloud, container, terminal, rocket,
  git-branch, repeat, refresh-cw, circle-check, circle-x, triangle-alert, lightbulb, filter, split, merge, calendar-clock, wallet, trending-up.
  A wrong name makes the render fail with "unknown icon"; check with: ls node_modules/lucide-static/icons | grep NAME

## Rules
- Plain language first ("Checks your API key", "Sends the order to your broker"); jargon only in the small <span> or chips.
- Facts must match the current code (the validated spec you were given). Never invent components.
- 5 to 14 cards per image. If the source has more, group related items into one card with chips, or split into two images only if they show two different ideas.
- No emojis. No broker names unless the page is about a specific broker (use "Your broker").
- No text smaller than the kit defaults; no text outside the canvas.
- Aspect: aim for landscape (width 1680, height 700-1500 CSS px). Very tall flows: use a two-column layout.
