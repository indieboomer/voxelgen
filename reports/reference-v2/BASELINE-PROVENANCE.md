# Reference provenance

All 15 examples were authored for this prototype as analytic voxel equations in `src/references.ts`. They are not AI-generated models, scanned assets, or Hot Vampires assets. The first four examples in each family train the score; the fifth is held out. Exported resolution-28 examples are in `public/references/`; evaluation resamples the same independent equations at resolution 20.

References were written independently of the evolving population. They use ellipsoidal intersections, planar constraints, tapered diamond volumes and directional strata. Because both reference construction and recipe construction use elementary solids, the benchmark is intentionally limited and cannot establish transfer to externally authored art.

No third-party reference assets are used. Colors are manually selected grayscale stone palettes. Reference metadata is embedded in each voxel JSON file. Regenerate the JSON files using `node --import tsx scripts/export-references.ts`.
