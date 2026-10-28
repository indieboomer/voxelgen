# Trees, bushes and super low-poly meshes — v1.4

The sidebar now includes **Tree** and **Bush** alongside the three rock families. The top description workflow recognizes both, builds five procedural target variations, and searches version 3 recipes. New recipes combine tapered trunks, branch capsules and irregular ellipsoidal foliage clusters. Wood and three foliage shades remain separate materials. Existing version 1 and 2 rock recipes are compatible.

The new AI-generated vegetation concept board supplies three tree and three bush studies. Its exact prompt is recorded in [IMAGE-PROMPT.md](IMAGE-PROMPT.md). The 3D targets are independently authored voxel interpretations, with a fifth held-out variation. They are not AI-reconstructed meshes.

## Super low-poly

Select **Model geometry › Super low-poly / retopology + baked atlas**. This is a separate geometry reduction pass after coarse Surface Nets smoothing:

1. Weld the smoothed triangle mesh by exact source position.
2. Accumulate face-plane quadrics and rank edge contractions by geometric error.
3. Require the manifold link condition, two incident faces, compatible wood/foliage groups, nonzero surviving triangles and a normal-change guard. Contraction candidates lie on the original edge. Deterministic rounding and tie breaks are shared by TypeScript and Rust.
4. Contract until the target is reached or no safe candidate remains. Keep flat triangle normals.
5. Create a fresh UV atlas with a padded tile per triangle. Project each texel to the nearest triangle of the original smoothed source, interpolate its UV, and transfer the original procedural detail multiplied by its material color. A spatial triangle index accelerates projection. Two-pixel gutters dilate boundary colors.

This follows the quadric simplification approach described by [Garland and Heckbert](https://www.cs.cmu.edu/afs/cs.cmu.edu/user/garland/www/quadrics/index.html), with edge-constrained placement and explicit topology/material guards for this implementation. It changes geometry, triangle connectivity, UVs and texture pixels. It is not just a coarser voxel grid.

| Family | Smoothed source, seed 42, grid 28 | Super low-poly target / measured | Atlas |
| --- | ---: | ---: | ---: |
| Boulder | 848 triangles | 160 / 160 | 256 × 256 |
| Layered stone | 892 | 160 / 160 | 256 × 256 |
| Shard | 628 | 160 / 160 | 256 × 256 |
| Tree | 784 | 256 / 256 | 256 × 256 |
| Bush | 680 | 192 / 192 | 256 × 256 |

The source voxel grid stays intact. Topology constraints may retain more triangles for other recipes; the UI reports actual and target counts. Very small meshes may already have fewer triangles than the target. Super low-poly colors are baked into the atlas, so runtime vertex colors are white. Use the returned texture with the returned UVs. The app's solid-material view derives a flat color from that atlas. PNG exports the actual selected model's atlas; GLB embeds it. Wireframe remains a preview aid.

The simplifier and baker run in a dedicated worker in both the browser and Windows app. The UI reports progress while generating four seed models and five references. Results are cached for material, wireframe and selection changes. A grid-28 tree measured about 1.4 seconds for one cold generator call on this machine; grid 48 about 6.4 seconds. Full uncached reference/batch preparation takes longer. Search does not repeatedly rebake intermediate super-low-poly candidates; it builds the final result after completion.

## Export and application support

- Rust exports the complete standard-library-only generator, including version 3 plants, simplification and atlas baking. The selected seed, grid, scale and geometry mode are the defaults.
- The standalone JavaScript runtime package now supports recipes 1–3 and all five geometry modes. `generateRock` retains its existing API name for compatibility, including when generating plants.
- The AI image request now asks for a nature asset appropriate to the prompt, including bark, branches and foliage for plants. Live image generation still requires a valid configured API key; this change makes no paid test requests.
- Windows builds use a fresh versioned output directory so an already open copy is not overwritten. Run `launch-desktop.cmd` after closing/reopening the app to use the activated build, or extract the portable ZIP.

## Verification

Machine-readable results:

- [Geometry and Rust parity](verification.json): 72 plant/reference fixtures across grids 12–48; both materials present; connected geometry; 200 structural mutations per plant; two 96-candidate searches; 50 exact JS/Rust buffer comparisons across all five families and geometry modes. Ten super-low-poly cases checked for paired manifold edges, positive volume, nondegenerate triangles and deterministic output, including exact rebaked RGBA pixels.
- Existing 288 JS/Rust comparisons for recipe versions 1–2 and the four previous geometry modes passed. Existing 72 source/compiled runtime comparisons passed.
- [Browser checks](browser.json): tree/bush/boulder GLB round trips, selected model 3 / seed 44, exact atlas PNG pixel checks, downloaded Rust compilation, exact standalone TypeScript output, material switching, offline bush prompt through worker optimization, and mobile layout.
- [Concurrency check](concurrency.json): a 50 ms UI timer completed in about 57 ms during background baking; starting search during initial meshing completed successfully and displayed the final retopologized model.
- [Native Windows checks](desktop.json): background meshing under the application protocol, tree/bush native GLB/PNG saves, selected model 4 / seed 45 Rust compilation, and offline tree description through optimization.

Run `npm run check:vegetation`, `npm run check:vegetation:browser`, and `npm run check:vegetation:desktop`. The last command uses the latest packaged executable and an isolated QA profile.

The initial plant implementation is broadleaf-style trees and solid clustered shrubs. It does not yet provide leaf cards, wind animation, skeletal branches, botanical species presets or conifer geometry. The new atlas transfers base color/detail without baking directional illumination. Strong simplification can round narrow features; targets are conservative enough to retain the tested trunks and crowns.
