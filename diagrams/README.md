# Documentation diagrams

The documentation uses 66 feature, architecture, flow and lifecycle images in
`.gitbook/assets/diagram-<slug>.png`. Each has an HTML factual blueprint and a
saved generation prompt. The user approved the style using the broker-login and
market-data samples in `previews/`.

The images were generated with the built-in image generator. Its model version
is not exposed or verified. The original request named GPT Image 2.6, and the user
then chose the built-in generator with this limitation understood.

## Files

- `<slug>.html`: components, relationships and technical facts to preserve.
- `prompts/<slug>.txt`: the complete prompt for the accepted image.
- `generated-images.json`: asset paths, provider, source and image checksums,
  generation date and visual review notes.
- `_tools/`: the original HTML authoring kit and reference renderer.

## Updating an image

Verify the changed behaviour against the OpenAlgo source first. Update the HTML
blueprint and prompt together. Preserve conditional branches, failures, process
boundaries and important numbers or API paths; shorten redundant prose to keep
labels readable.

Generate one image per diagram using the built-in image generator. Match the
approved samples: deep navy background, dark cards, white headings, pale gray
body text, thin colored outlines, simple outline icons and clearly directed
arrows. Use generous spacing and a landscape layout where practical. Group
related details rather than shrinking the text.

Copy the generated file from the generator's output directory into the existing
`.gitbook/assets/diagram-<slug>.png` path. Inspect it at full size and at typical
documentation width. Check spelling, identifiers, numbers, arrowheads, branches
and boundaries against the blueprint. Regenerate any material error. Keep the
final image unchanged rather than painting over generated labels.

Update the manifest with the final source and image SHA-256 values and review
notes. Update the surrounding page and its figure alt text when their meaning
changes. Keep the GitBook figure path stable so existing embeds continue working.

Run the manifest check before committing:

```bash
node diagrams/_tools/check-generated.mjs
```

It checks complete coverage, unique PNGs, dimensions, provenance and checksums
for each blueprint, prompt and image. It cannot verify the meaning of generated
text or arrows; visual inspection remains required.

## HTML reference previews

The original renderer can help inspect the factual blueprint, but its output is
a separate reference preview. It does not reproduce the AI-generated image.
Render to a separate path; see `_tools/README.md`. Do not overwrite a published
AI-generated asset with the HTML renderer.
