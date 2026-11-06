# Docs diagrams

The published architecture and flow PNGs now use the approved AI-generated style.
See `../README.md` for prompts, provenance and the image update workflow. This kit
still renders the HTML factual blueprints as separate reference previews.

```bash
cd diagrams/_tools
npm install                      # once: puppeteer-core + lucide-static icons
node render.mjs ../<slug>.html /tmp/openalgo-reference-<slug>.png
```

Use Node.js 22.12 or newer, as required by the pinned renderer dependencies.

Rendering uses your local Google Chrome (set `CHROME_PATH` if it is not in the default
macOS location). The script prints `ok <file> WxH`, and `WARN overflow` if any label is
clipped. See `KIT.md` for the components, colour roles and writing rules
(the audience is mostly traders, so plain language first). Do not use this
renderer to overwrite published AI-generated assets.
