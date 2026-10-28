# Voxel and low-poly geometry modes

## Application behavior

The Model geometry selector in the left sidebar switches between Voxel and Low-poly. Both reference and generated viewers, reference thumbnails, imported voxel objects and GLB exports use the chosen mode. Source voxels, seed variation, shape evaluation and reference construction do not change. Selected model/seed are retained when switching.

The selected mesh panel reports quads, triangles and reduction compared with the exposed-face voxel mesh. Show triangle edges displays the actual triangle topology. It is an inspection setting: GLBs always export filled triangles, even when the preview shows wireframe. Material textures and colors remain available in both modes.

## Geometry pipeline

1. Face culling: visit each voxel and omit faces with an occupied neighbor, including neighbors with a different palette material. Interior faces cannot be seen through these opaque materials.
2. Greedy meshing: for each signed face direction and grid slice, build a material-index mask. Grow the widest rectangle from the first remaining cell, extend it through identical rows, emit one quad and clear that rectangle. Only coplanar faces with the same material index merge. Holes and different material regions remain separate.
3. Triangulation: each rectangle emits four vertices and two outward-facing triangles. Opposite directions reverse winding. Normals remain flat. UVs use the same global planar object coordinates as voxel mode, so merged faces preserve texture placement and scale.

This produces a lower-polygon representation of the exact same stepped voxel surface. It does not alter the silhouette or voxel data. Vertices are kept separate per quad for normal/material discontinuities. Palette indices remain merge boundaries even if two palette colors happen to be equal.

## API and export

JavaScript / TypeScript:

```ts
const rock = generateRock({recipe, seed: 42, resolution: 28, meshMode: 'lowpoly'});
const mesh = meshVoxels(voxels, 1, 'lowpoly');
// meshMode defaults to voxel; stats = {visibleFaces, quads, triangles}.
```

GLB exports contain the displayed mode. Recipe JSON preview metadata records meshMode; voxel JSON preserves the original grid. The generated TypeScript module includes meshMode and selectedRock(). The standalone runtime ZIP has been rebuilt and includes greedy.js.

Rust exports embed SELECTED_MESH_MODE and selected_rock() reproduces the selected seed, resolution, scale and meshing mode. The rock(seed,resolution) helper also uses the exported mode. Explicit runtime selection:

```rust
let model = generate_rock_with_mode(&RECIPE, 42, 28, 1.0, MeshMode::Greedy)?;
// generate_rock(...) remains compatible and defaults to MeshMode::Voxel.
```

The standalone Rust CLI accepts an optional fourth argument, voxel or lowpoly, after seed, resolution and scale. Without that override it uses the exported mode. Ready-made Rust low-poly examples are saved in public/rust/.

## Measured triangle counts

Family starters, seed 42, resolution 28. The baseline already removes hidden faces.

| Family | Voxel triangles | Low-poly triangles | Reduction |
|---|---:|---:|---:|
| boulder | 3,272 | 1,582 | 51.7% |
| layered | 3,176 | 1,148 | 63.9% |
| shard | 2,220 | 946 | 57.4% |

A uniform 12-cube grid drops from 1,728 exposed-face triangles to 12 triangles (six quads). Highly fragmented color patterns limit merging because material boundaries are preserved.

## Verification

- 44 voxel/greedy pairs have exactly identical oriented unit-face coverage including material identity. Fixtures include solid and two-material cubes, checkerboards, cavities, concave shapes, thin slabs, empty grids, random grids, and seeded generated rocks at resolutions 12/28/48 and scales 0.5/1/2. Tests detect overlaps, missing faces, incorrect winding, degenerate triangles, UV discontinuities, changed bounds and mutated source data.
- 144 exact JavaScript/native Rust fingerprint comparisons cover both modes, all families, recipe versions 1 and 2, four seeds including maximum u32, three resolutions and three scales. All position, normal, color, UV, index, voxel and texture buffers match.
- 36 models match the compiled standalone JavaScript runtime in both modes.
- Browser QA exports and independently imports voxel and greedy textured GLBs for all three families, and reference GLBs in greedy mode. Actual downloaded Rust generators compile with the greedy default; downloaded TypeScript wrappers reproduce the preview. Wireframe does not turn exports into line primitives. Imported voxel grids retain their data through mode switches and round trips. Mobile layout passes.
- The rebuilt portable Windows app was launched and tested. Native save dialogs export greedy Rust and a textured triangle GLB with the expected counts; switching keeps seed 44 selected. Screenshots of the two topology modes were inspected.
- Baseline generation, mutation, browser search start/stop/completion and texture-export checks still pass.

## CPU mesh extraction measurement

Windows x64, Node v24.14.1, Intel Core i9-10900F. One pre-generated boulder grid, seed 42, resolution 28. Three warmups and 20 measured repetitions; generation, textures and rendering are excluded. Times in milliseconds.

| Mode | Median | p95 |
|---|---:|---:|
| voxel | 2.30 | 2.93 |
| lowpoly | 2.33 | 2.87 |

Triangle reduction is measured; no GPU frame-rate improvement is inferred from these CPU timings.

## Reproduce

```sh
npm run check:meshing
npm run check:rust
npm run package:runtime
node --import tsx scripts/export-check.ts
npm run check:meshing:browser
npm run desktop:package
node scripts/mesh-desktop-check.mjs
```

Browser checks require the Vite dev server; the desktop check launches the packaged executable. Geometry output remains deterministic and independent of the UI, references, search and network.