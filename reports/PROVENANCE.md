# Reference provenance - geology study v2

The current workshop uses a nine-object AI-generated 2D contact sheet produced with the built-in image_gen tool on 2026-10-28. The original image is saved at `public/art/rock-reference-board-v2.png`. The exact final prompt is recorded in `reports/reference-v2/IMAGE-PROMPT.md`.

This is raster artwork, not AI-generated 3D models. No image-to-3D service was available. Fifteen voxel reference objects were authored in `src/references.ts` as visual interpretations of the artwork: five granite boulders, five layered shale stacks, and five basalt fins. The first three objects per family correspond loosely to the three pictured concepts; the remaining two extrapolate the family, with the fifth held out. They are not faithful multiview reconstructions. Hidden surfaces, depths, and dimensions are authored assumptions.

References use independently constructed bevelled block unions, fracture cuts, overlapping tilted strata, tapered fins, coherent mineral veins, and family-specific palettes. They do not call the evolving recipe interpreter. Shared geometric concepts still limit benchmark independence. Search evaluates voxel descriptors, never the generated artwork pixels; no AI or network is used during search or runtime generation.

Resolution-28 reference JSON files, including per-object provenance, are in `public/references-v2/`. Regenerate with `node --import tsx scripts/export-references.ts`. Reference JSON and GLB exports are also available in the workshop. Reference thumbnails are real rendered voxel objects, not the AI images. Both reference and output objects share neutral lighting and the same camera. Inspect reference mode isolates the reference for closer orbiting.

The original non-AI dataset remains in `src/references-v1.ts` and `public/references/`. Its provenance is retained in `reports/reference-v2/BASELINE-PROVENANCE.md`. Original experiment results remain in `reports/experiment.json`; current results are in `reports/reference-v2/experiment.json`. Scores across these different datasets must not be compared directly.
