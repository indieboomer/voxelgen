# Geometry, materials and Rust export update

## Delivered behavior

The layout now follows the workflow vertically: AI-generated 2D artwork, a dedicated interactive 3D reference with its gallery/export controls, then a separate interactive generated-variation viewer. Each viewer has orbit/zoom controls. Both use the same 34 degree field of view and neutral lighting; framing distances differ to show one reference versus four outputs.

Models now contain UV coordinates. A deterministic 128 x 128 RGBA stone texture supplies grain, mineral flecks and fine seams, combined with the voxel mineral palette. Broad palette patches replace the previous per-voxel checkerboard appearance. The material selector switches between textured and solid-color display, and the selected setting is honored by GLB export. Texture PNG can be downloaded separately. GLBs embed the texture images and include base-color and roughness maps. These procedural textures are generated in code; they are not cropped AI artwork.

The runtime API returns positions, normals, colors, UVs, indices, bounding box, voxels and texture pixels. It is independent of the UI, reference set, optimizer and network. The compiled JavaScript package has been rebuilt. Colors are sRGB data; the Three.js adapter converts vertex colors to linear and declares the color texture as sRGB before rendering/export.

## Less spherical geometry

Recipe interpreter version 2 adds bevelled blocks, tapered wedges, five-slab offset strata and directional fracture grooves. Volume operations can specify anisotropic stretch and yaw. Family starters now construct joined fractured blocks, irregular shale stacks, and stepped tapered fins. Seed changes are correlated and smaller than the old independent mass displacements. Parameter and structural mutation both operate on these programs. Version 1 recipes remain supported with identical voxel geometry.

The score now uses three 8 x 8 silhouettes with an intersection-over-union distance, a 5 x 5 x 5 volume-occupancy sketch, and the original normalized shape descriptors. Color remains separate from shape fitness. Complexity uses a stable operation count; strata count as five volume evaluations. Fragment removal is recorded and penalized rather than silently disappearing from evaluation. Reference descriptors are cached.

### Matched independent-seed baseline check

Same current score, same reference dataset and held-out references/seeds for both sides. The old side uses the previously saved C-123 version-1 generator. The new side uses the authored version-2 starter, before selection. This measures representation/starter improvement, not an evolutionary advantage.

| Family | Old saved generator loss | New starter loss | Reduction |
|---|---:|---:|---:|
| boulder | 0.19424 | 0.15344 | 21.0% |
| layered | 0.29514 | 0.12974 | 56.0% |
| shard | 0.37858 | 0.09523 | 74.8% |

### Equal-budget A/B/C search

27 runs, 96 candidates per run, three seeds per candidate, 12 retained individuals, parent selection among four elites. Three search-process seeds per family/method. Search resolution 20. Four references train; one and four generation seeds are held out. Means below use independent validation.

| Family | A random | B parameters | C parameters + structure |
|---|---:|---:|---:|
| boulder | 0.14451 | 0.15907 | 0.17709 |
| layered | 0.19203 | 0.17943 | 0.19549 |
| shard | 0.14335 | 0.13916 | 0.14480 |

C still does not win consistently. In some runs the search fits the four training references and performs worse than the starter on the held-out example. The narrow seed style and small related dataset limit generalization. The new defaults visibly preserve the intended family better, but this is not photorealistic reconstruction or a guarantee of matching the AI concept. Old and new descriptor scores cannot be compared across reports; the matched baseline table above explicitly rescored both.

## Rust export

The Rust generator button downloads a single self-contained .rs file containing the currently selected recipe and a portable runtime. It compiles with rustc --edition=2021 -O rock_generator.rs and uses only the standard library. The recipe is interpreted data, not specialized compiled geometry. The public generate_rock function accepts recipe, seed, resolution and scale and returns voxel cells, triangle buffers, UVs, palette colors, bounding box and RGBA texture bytes. The convenience rock function uses the exported recipe. A CLI main accepts seed, resolution and scale and prints buffer fingerprints; the source can also be imported as a Rust module. No images or reference data are required at runtime. Ready-made examples are in public/rust/.

## Verification

- Production TypeScript check and Vite build pass (the Three.js bundle still triggers the advisory size warning).
- 72 exact JavaScript/native Rust buffer fingerprint comparisons cover six version-1/version-2 family recipes, four seeds including maximum u32, grids 12/28/48 and three scales. Cells, positions, normals, colors, UVs, indices and RGBA texture pixels match. Invalid-resolution rejection is tested.
- The actual browser-downloaded Rust source for an evolved recipe was compiled and matched on an independent seed.
- Eighteen generated models match the compiled standalone JavaScript runtime exactly. Legacy voxel output also matches the archived version-1 implementation.
- Ninety baseline models and 324 saved-generator models are nonempty and connected. Mesh indices and UV ranges are valid. A total of 1,125 mutation checks pass.
- Browser QA verified document order, both viewers, six textured GLB export/import paths (three generated, three reference), embedded 128-pixel images, roughness maps, UVs, PNG pixel parity, solid-material export, search start/stop/completion and a 390-pixel viewport without horizontal overflow. Screenshots of all families were inspected.

## Timings

Windows x64, Node v24.14.1, Intel Core i9-10900F. Five warmups then 30 measured repetitions. Generation includes component cleanup; mesh extraction includes UV generation. Texture generation is measured separately. Times in milliseconds.

| Family | Grid | Voxel median / p95 | Mesh median / p95 |
|---|---:|---:|---:|
| boulder | 24 | 3.98 / 4.50 | 1.48 / 1.96 |
| boulder | 28 | 6.29 / 6.63 | 2.31 / 2.71 |
| boulder | 32 | 9.41 / 10.59 | 3.43 / 4.24 |
| layered | 24 | 6.24 / 9.76 | 1.49 / 3.59 |
| layered | 28 | 9.25 / 10.07 | 2.13 / 2.68 |
| layered | 32 | 14.06 / 15.08 | 2.74 / 4.81 |
| shard | 24 | 3.75 / 4.04 | 1.02 / 1.25 |
| shard | 28 | 5.88 / 8.36 | 1.35 / 2.47 |
| shard | 32 | 8.84 / 9.44 | 2.05 / 2.91 |

128 x 128 stone texture, 30 repetitions: median 0.18 ms; p95 0.24 ms.

No single-frame generation performance is promised. Next useful work: a larger independently authored reference dataset, rotation-aware multiscale silhouettes, and stronger validation against held-out geometry before increasing search budgets.