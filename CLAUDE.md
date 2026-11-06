# CLAUDE.md

Guidance for working in the OpenAlgo documentation repository (published at
https://docs.openalgo.in through GitBook). The platform source lives in the
separate `openalgo` repository; this repo only documents it.

## Audience

About 90% of readers are traders and about 10% are developers. Write and draw for
a trader first: plain language, what a feature does for them, then the technical
detail for developers.

## Architecture diagrams must track the code

Every architecture, flow and lifecycle diagram in these docs is an illustrated PNG
(`.gitbook/assets/diagram-<slug>.png`). The published images use the user-approved
AI-generated style. Their factual blueprints remain in `diagrams/<slug>.html`,
and the complete generation prompts live in `diagrams/prompts/<slug>.txt`.
`diagrams/generated-images.json` records provenance and checksums. The built-in
generator's model version is not exposed; do not claim a specific model version.
There are no text (box-drawing) diagrams, and new ones must not be added.

**Whenever the architecture changes, a new feature is implemented, or an existing
component, flow, port, process, database or integration changes in `openalgo`,
the affected diagrams must be updated in the same piece of work.** A diagram that
no longer matches the code is worse than no diagram: traders trust the picture.

How to update:

1. Find the affected diagrams: `rg -l 'diagram-' -g '*.md'` and read the
   sources in `diagrams/*.html` for the components you changed.
2. Verify the new behaviour in the `openalgo` code (and its `docs/` design docs),
   not from memory.
3. Update the HTML blueprint and its generation prompt together. Follow
   `diagrams/README.md` for the approved style, then use the built-in image
   generator and copy the final PNG into the existing asset path. Inspect every
   label, arrow, branch and boundary against the source. Regenerate errors and
   refresh the manifest checksums. The HTML renderer remains available for
   reference previews; render those to a separate path so they do not overwrite
   the published AI-generated asset.
4. For a new diagram, embed it with the repo convention, on its own line:
   `<figure><img src="REL/.gitbook/assets/diagram-<slug>.png" alt="..."><figcaption></figcaption></figure>`
   where `REL` is the relative path for the page depth.
5. Update the alt text and any surrounding prose that the change made wrong.

Never leave a blueprint, prompt and published PNG describing different behaviour.
Do not manually paint over generated labels; correct the prompt and regenerate.

## Conventions

- Images use the GitBook `<figure>` tag, never Markdown image syntax.
- Screenshots of the OpenAlgo UI live in `.gitbook/assets/openalgo-ui-*.png`. Mask
  the broker name (OpenAlgo is broker-neutral); do not show API keys or webhook URLs.
- Say "sandbox mode" / "analyzer mode", never "paper trading".
- No emojis or icon glyphs in text.
- Folder trees, code, schemas and command output stay as text code blocks.
