# Taller previews, live AI diagnostics and smooth meshes

## Preview area

The generated Recipe output across four seeds viewer is now 800 CSS pixels high, exactly twice its previous 400-pixel height. The reference viewer is unchanged. Resize handling updates the camera aspect automatically. Browser and packaged Windows tests assert the 800-pixel size.

## AI image generation: root cause and changes

A real request using the configured environment credential returned HTTP 401 (invalid API key), not an image. The sanitized result is in live-ai.json. Successful live image generation is therefore still blocked until a valid image-API key is supplied; an application patch cannot repair a rejected credential. Previous verification used mocked responses and did not establish live account access. A stale CommonJS module in the Vite process also broke connection configuration during development; configuration reload now clears that cache. The actual dev-server settings endpoint returns HTTP 200, and its real generation request reaches the provider and reports the rejected credential.

The app now provides AI image connection settings directly above the workflow. A replacement key overrides the environment credential. On Windows, it is stored using Electron safeStorage asynchronous encryption for the current Windows account, and restored on restart. A model-only edit preserves the encrypted key. Browser development keeps credentials in the local server session; the renderer does not receive them back. Keys are not embedded in the executable, runtime exports or model files. The [Electron safeStorage documentation](https://www.electronjs.org/docs/latest/api/safe-storage) describes the platform protection.

Configured AI is selected automatically. Each request immediately shows elapsed progress and a Cancel image request control. Success decodes and scrolls to the new image. Errors restore the controls and remain visible; missing/rejected credentials open the settings panel. Cancellation aborts the local request, and a 180-second timeout prevents indefinite waiting. Provider errors, rate limits and network failures are reported without including keys. The [official Images API reference](https://developers.openai.com/api/reference/resources/images/methods/generate) defines the request/response contract used by this adapter.

Full request/response success, error and cancellation paths have been verified with provider fixtures, including the native IPC -> image adapter -> fetch -> cached PNG -> renderer path. This is explicitly separate from live verification, which failed authentication. No replacement credential is available to this development run.

## Smoothing analysis and choice

The goal is to soften voxel stair steps while keeping the compact generator runtime, geological family shape, texture support, and matching Rust exports. The choice below is an engineering judgement for this application, not a universal algorithm ranking.

| Candidate | Fit for this application | First-stage decision |
|---|---|---|
| Smooth Voxels style linked-vertex averaging | Directly demonstrates the desired visual style. Applying it to greedily merged meshes would first require a suitable connected surface topology, since merged quads introduce uneven neighborhoods. | Use the vertex-relaxation idea, without adopting a separate authoring language or its library. |
| Dual contouring | Attractive for fracture planes and sharp features, but its strongest feature reconstruction relies on Hermite edge intersections/normals and a robust QEF solver. Our interchange representation contains binary occupancy and palette IDs. | Best candidate for a later feature-preserving version after introducing a reliable scalar/Hermite field. |
| Surface Nets + constrained relaxation | Works naturally with binary segmented data, creates one shared node per active cell and a linked quad surface, and keeps vertex motion bounded to its source cell. Small enough to implement independently in TypeScript and Rust. | Chosen for the first implementation. |
| Marching cubes + Laplacian smoothing + decimation | A viable triangular pipeline, but adds case-table/topology handling plus a simplifier that must respect colors/UVs. Unbounded relaxation would also need shrinkage/feature controls. | More stages and validation work than needed for the current binary-rock experiment. |

Sources: the [Smooth Voxels manual](https://www.smoothdev.nl/smoothvoxels/) describes linked-vertex averaging; [Constrained Elastic SurfaceNets](https://www.merl.com/publications/TR99-24) establishes bounded node relaxation for binary data; [Dual Contouring of Hermite Data](https://people.eecs.berkeley.edu/~jrs/meshpapers/JuLosassoSchaeferWarren.pdf) describes Hermite/QEF feature reconstruction. The [0 FPS contouring analysis](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/) supplies a practical primal/dual implementation comparison. These are consulted references; this project uses its own implementation and no assets or source code from the Smooth Voxels playground.

## Implemented pipeline

Four Model geometry choices are now available:

- Voxel: existing exposed cube faces.
- Low-poly: existing material-aware greedy rectangles and triangulation.
- Smooth: full-resolution Surface Nets with two bounded Jacobi relaxation passes.
- Smooth low-poly: the same method on a coarser extraction grid (ceil(source resolution / 2)) to reduce triangles. This is coarse extraction, not an edge-collapse/QEM decimation pass.

Source voxel data stays unchanged. Smooth modes pad the binary field with empty samples, place nodes at the average of edge crossings, connect them around sign-changing edges, relax them twice at strength 0.35, and constrain them to the interior of their original dual cells. A local fill resolves alternating binary faces to avoid four quads sharing an ambiguous edge. This may close tiny diagonal cracks. Every quad is triangulated with flat per-triangle normals for a faceted rock look. Palette material IDs and planar texture coordinates are retained per output face.

Coarse extraction uses a 25% occupancy threshold and majority material selection within each block. Fine detail and small mineral seams can disappear or expand. If coarse sampling would erase a nonempty tiny model, extraction falls back to full detail. These are intentional first-version tradeoffs, and the UI reports the actual extraction resolution. General arbitrary-segmentation manifold reconstruction is not claimed; closed edge pairing is tested on the documented batch.

The source is src/runtime/surface-nets.ts, mirrored by the standalone Rust template. GLB, TypeScript and Rust exports honor both smooth modes, including selected seed/resolution/default mode. All remain independent of references, UI, optimizer and network. Greedy/voxel output stays compatible.

## Triangle counts

Family starters, seed 42, source grid 28.

| Family | Voxel | Greedy | Smooth full | Smooth low-poly |
|---|---:|---:|---:|---:|
| boulder | 3272 | 1582 | 3252 | 848 |
| layered | 3176 | 1148 | 3176 | 892 |
| shard | 2220 | 946 | 2220 | 628 |

Smooth low-poly here extracts at grid 14. Full smoothing changes the outline without promising fewer triangles. Fracture-detail retention and silhouette fidelity should be reviewed against the full-detail and greedy views.

## Verification

- 80 smoothed meshes across families, seeds, resolutions 12/28/48, scales, single-voxel, thin-slab, solid and shell fixtures: finite arrays, nondegenerate outward triangles, unit normals, UV ranges, positive signed volume, paired edges after coordinate welding, determinism and unchanged source cells.
- 288 exact JavaScript/native Rust buffer comparisons across all four mesh modes, recipe versions 1/2, extreme seeds and three grids/scales. Twelve additional native comparisons cover odd grids and tiny-model fallback.
- Seventy-two models match the compiled standalone JavaScript runtime. Existing greedy surface-coverage and baseline generation checks remain available.
- Browser tests verify actual viewer size, settings requests, cleared key fields, visible progress, image display, rejected-key guidance, cancellation, smooth textured GLB import, downloaded Rust compilation and mobile layout.
- Windows tests verify encrypted persistence and restart, model-only configuration changes, restored credentials used by the backend, fixture image display through the actual native adapter, visible 401 failure, cancellation and native smooth Rust export. Provider responses are mocked in these success-path tests.
- The real image-API request failed with HTTP 401; no new image from a valid live account was verified.

## Mesh extraction timings

Windows x64, Node v24.14.1, Intel Core i9-10900F. Source boulder grid 28, seed 42. Three warmups then 12 measured repetitions. Mesh extraction only; excludes voxel generation, textures and rendering. Milliseconds:

| Mode | Median | p95 |
|---|---:|---:|
| smooth | 25.87 | 26.33 |
| smooth-coarse | 4.06 | 4.34 |

These timings do not establish per-frame generation suitability. Next steps: multi-vertex treatment of more complex topology, a reliable Hermite field for sharp-feature dual contouring, or feature/material-aware decimation if coarse sampling is too destructive.

## Reproduce

```sh
npm run check:smoothing
node --import tsx scripts/smoothing-edge-check.ts
npm run check:rust
npm run check:smoothing:browser
npm run desktop:package
npm run check:smoothing:desktop
```

The live checker, node scripts/live-ai-check.mjs, makes a real image request using OPENAI_API_KEY from the environment. It is not part of the automatic test suite. To use the app with a valid account, enter a replacement key in AI image connection settings, save it, then Generate 2D reference. Never put keys into prompts or model exports.

## Windows update packaging

The app was open during an attempted overwrite, which caused a Windows file-lock failure. Missing files in the legacy package were restored without overwriting existing/locked files or terminating the running app. Packaging now creates separate build folders. QA locates the latest built executable from `release/latest-desktop-build.json`; the stable launcher uses `release/current-desktop.txt`, updated only after the local build is ready. The ZIP contains a complete portable app directory. Use `launch-desktop.cmd` to open the updated build; an already running window keeps its existing session.
