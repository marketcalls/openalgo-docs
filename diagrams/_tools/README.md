# Docs diagrams

The architecture and flow images in these docs (`.gitbook/assets/diagram-*.png`) are
rendered from HTML sources in `diagrams/<slug>.html` using a small infographic kit.
Edit the source, then re-render; never edit the PNG directly.

```bash
cd diagrams/_tools
npm install                      # once: puppeteer-core + lucide-static icons
node render.mjs ../<slug>.html ../../.gitbook/assets/diagram-<slug>.png
```

Rendering uses your local Google Chrome (set `CHROME_PATH` if it is not in the default
macOS location). The script prints `ok <file> WxH`, and `WARN overflow` if any label is
clipped. See `KIT.md` for the components, colour roles and writing rules
(the audience is mostly traders, so plain language first).
