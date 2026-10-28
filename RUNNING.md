# Running Voxel Generator Workshop

**Voxel / low-poly switch:** choose **Model geometry** in the sidebar. Low-poly performs face culling, material-aware greedy rectangle merging and triangulation, preserving the voxel silhouette and textures. Preview counts show the reduction; **Show triangle edges** inspects topology. GLB, Rust and TypeScript exports honor the selected mode. See [meshing details and checks](reports/meshing-v5/REPORT.md).

**Portable Windows download:** `release/VoxelGeneratorWorkshop-Windows-x64.zip` (extract the whole folder).

**Windows desktop build:** double-click `launch-desktop.cmd`, or `release/Voxel Generator Workshop-win32-x64/VoxelGeneratorWorkshop.exe`. Keep the whole app folder together. No browser or dev server is required. See [desktop and prompt workflow](reports/desktop-v4/REPORT.md).

The top prompt panel now guides 2D concept -> procedural 3D reference -> optimization. Choose among four numbered models to set the exact export seed; Rust exports the whole generator with `selected_rock()` and matching CLI defaults.

Requires Node 22.12+ and a WebGL browser. Tested on Windows, Node 24 and Chrome.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` produces the static app in `dist/`.

## Current workflow

1. Choose a rock family. The 2D AI concept cards select a corresponding authored voxel reference.
2. Inspect the separate 3D reference view immediately below the artwork. Choose any of five reference thumbnails, orbit/zoom, or download reference voxel JSON / textured GLB.
3. Inspect generated variations in the next 3D view. Set seed and resolution, choose A/B/C, then start or stop the worker search. Click an elite to inspect its program. Pin a recipe and generate another batch.
4. Export the selected recipe, voxel JSON, TypeScript wrapper, self-contained Rust generator, texture PNG or textured GLB. The surface-material selector controls whether GLBs include textures.

Both viewers use neutral lighting and the same perspective field of view; each has independent orbit/zoom. Artwork is 2D, not AI-generated 3D geometry. Its fifteen voxel interpretations are independently authored code. See [provenance](reports/PROVENANCE.md).

## Standalone JavaScript runtime

The ready-to-use package is `public/runtime.zip`. Unzip `runtime-dist` and use its ESM module from any application:

```ts
import {generateRock, type Recipe} from './runtime-dist/index.js';
const rock = generateRock({recipe: myRecipe, seed: 42, resolution: 28, scale: 1, meshMode: 'lowpoly'});
// rock.positions, normals, colors, uvs: Float32Array
// rock.indices: Uint32Array
// rock.texture: {width:128, height:128, pixels:Uint8Array} (RGBA)
// rock.voxels: dense grid, palette, material metadata, discardedFraction
// rock.boundingBox: {min:number[], max:number[]}
```

The generated TypeScript wrapper expects the unzipped directory to be renamed `runtime` alongside it. It interprets JSON recipes; it does not contain specialized compiled geometry. No UI, reference files, optimizer or network is needed. `node --import tsx examples/generate.ts` demonstrates independent use.

To rebuild the runtime and ZIP:

```powershell
npm run package:runtime
Compress-Archive -Path runtime-dist -DestinationPath public/runtime.zip -Force
```

Colors and texture pixels are sRGB. The preview adapter converts vertex colors to linear and sets the color-map color space. UVs are object-coordinate planar projections per face orientation; internal voxel faces are removed. Low-poly mode greedily merges coplanar faces of the same material before triangulating; both modes use planar UVs without a texture atlas.

## Rust export

**Rust generator (.rs)** downloads the selected recipe and a complete standard-library-only Rust runtime. Compile and run directly:

```sh
rustc --edition=2021 -O rock_generator.rs
./rock_generator 42 28 1
```

On Windows use `./rock_generator.exe`. Arguments are seed (u32), resolution (12-48), and positive scale. The CLI prints deterministic buffer fingerprints for inspection. To use it as a module:

```rust
mod rock_generator;
fn main() {
    let rock = rock_generator::generate_rock(
        &rock_generator::RECIPE, 42, 28, 1.0,
    ).expect("valid rock");
    println!("{} vertices", rock.positions.len() / 3);
    // rock.uvs, rock.indices, rock.colors, rock.texture.pixels, etc.
}
```

The module interprets an exported recipe constant. It generates a seed-dependent family, not a fixed mesh. It contains no reference data and requires no crates or external files. Ready-made source examples are in `public/rust/`.

## Recipes and materials

Interpreter version 2 supports ellipsoid masses, bevelled blocks, tapered wedges, five-slab offset strata, planar cuts, chips, directional fractures, layering perturbations and bounded noise. Volume operations can specify `stretch: [x,y,z]` and `angle` (yaw). Default families use angular geometry instead of ellipsoid silhouettes. Version 1 recipes retain their old voxel behavior.

Recipes permit 1-12 bounded operations, grids 12-48, and deterministic u32 seeds. Empty arbitrary recipes are possible and are penalized by the optimizer; callers should check output length. The runtime keeps the largest six-connected component and reports how much was discarded. The evaluator penalizes discarded material.

Stone grain and fine mineral seams are actual procedural RGBA textures, combined with broad voxel palette regions. Both JavaScript and Rust generate them without images or network calls. Textures remain separate from shape scoring. Use the solid-material option to inspect geometry without texture detail.

Voxel JSON: `{version:1, resolution:28, cells:number[], palette:number[][], material?:{family,seed}, provenance?:string}`. Indexing is `x + n*(y+n*z)`; zero is empty; other values index RGB palette entries in 0-255. Imports validate resolution, cells, palette and material metadata.

## Checks and experiments

```sh
npm run check
npm run check:shape
npm run check:rust
node --import tsx scripts/reference-check.ts
node --import tsx scripts/selected-batch-check.ts
npm run package:runtime
node --import tsx scripts/export-check.ts
npm run check:browser
npm run experiment
```

Browser checks require the dev server and Chrome at the Windows path in `scripts/workshop-v3-check.ts`. Rust checks require `rustc`. No browser installation is downloaded automatically.

Current results, timings and limitations: [geometry/material/Rust report](reports/geometry-v3/REPORT.md). Current saved generators: `public/recipes-v3/`. `npm run experiment` evaluates 27 equal-budget A/B/C runs at resolution 20 (96 candidates/run), saving full distributions and histories in `reports/geometry-v3/experiment.json`. The UI also offers a 480-candidate mode. Selection uses three training seeds and four training references, then reports four independent seeds and one held-out reference. Similarity includes three projected silhouettes, coarse 3D occupancy and normalized geometric descriptors. No AI participates in search.

Historical results are preserved in `reports/REPORT.md` and `reports/reference-v2/REPORT.md`; the descriptor changed, so scores across reports are not directly comparable. The current report explicitly rescores old and new generators for a matched comparison. AI artwork and reference provenance remain in `reports/PROVENANCE.md` and `reports/reference-v2/IMAGE-PROMPT.md`.

## Source map

- `src/runtime/index.ts`: dependency-free sampling, geometry, UVs, textures and voxel import.
- `src/search/index.ts`: descriptors, evaluation and A/B/C evolution.
- `src/references.ts`: current authored voxel reference geometry.
- `src/export/rock_runtime.rs`: portable Rust template; `rust.ts` emits selected recipe constants.
- `src/worker.ts`: search lifecycle and cancellation.
- `src/main.ts`: workshop, Three.js materials/viewers and export adapters.

Hot Vampires is not modified or integrated. No Steam AI-disclosure conclusions are made.
