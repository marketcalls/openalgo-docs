# CLAUDE.md

Guidance for working in the OpenAlgo documentation repository (published at
https://docs.openalgo.in through GitBook). The platform source lives in the
separate `openalgo` repository; this repo only documents it.

## Audience

About 90% of readers are traders and about 10% are developers. Write and draw for
a trader first: plain language, what a feature does for them, then the technical
detail for developers.

## Architecture diagrams are images built from sources, and must track the code

Every architecture, flow and lifecycle diagram in these docs is an illustrated PNG
(`.gitbook/assets/diagram-<slug>.png`) rendered from an HTML source
(`diagrams/<slug>.html`) with the kit in `diagrams/_tools/`. There are no text
(box-drawing) diagrams any more, and new ones must not be added.

**Whenever the architecture changes, a new feature is implemented, or an existing
component, flow, port, process, database or integration changes in `openalgo`,
the affected diagrams must be updated in the same piece of work.** A diagram that
no longer matches the code is worse than no diagram: traders trust the picture.

How to update:

1. Find the affected diagrams: `grep -rl "diagram-" --include=*.md .` and read the
   sources in `diagrams/*.html` for the components you changed.
2. Verify the new behaviour in the `openalgo` code (and its `docs/` design docs),
   not from memory.
3. Edit `diagrams/<slug>.html` (or create a new one following
   `diagrams/_tools/KIT.md`), then render:
   ```bash
   cd diagrams/_tools && npm install        # once
   node render.mjs ../<slug>.html ../../.gitbook/assets/diagram-<slug>.png
   ```
   Fix any `WARN overflow`, and open the PNG to check it before committing.
4. For a new diagram, embed it with the repo convention, on its own line:
   `<figure><img src="REL/.gitbook/assets/diagram-<slug>.png" alt="..."><figcaption></figcaption></figure>`
   where `REL` is the relative path for the page depth.
5. Update the alt text and any surrounding prose that the change made wrong.

Never edit a diagram PNG directly, and never leave a source and its PNG out of sync.

## Conventions

- Images use the GitBook `<figure>` tag, never Markdown image syntax.
- Screenshots of the OpenAlgo UI live in `.gitbook/assets/openalgo-ui-*.png`. Mask
  the broker name (OpenAlgo is broker-neutral); do not show API keys or webhook URLs.
- Say "sandbox mode" / "analyzer mode", never "paper trading".
- No emojis or icon glyphs in text.
- Folder trees, code, schemas and command output stay as text code blocks.
