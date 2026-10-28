# Imported 3D search references and texture styles ? v1.6

The procedural generator can now load GLB or voxel JSON directly as its optimization reference. The reconstruction tool also provides **Use as generator reference**, transferring the current voxel model in memory and switching tools. This is a search target, distinct from the existing fixed-model inspection action.

## Using imported references

1. In **Procedural generator**, click **Load a 3D search reference** in the sidebar, or use the file input in **Interactive 3D reference**.
2. Select a self-contained GLB or the voxel JSON exported by reconstruction. For GLB, choose the import grid (32, 48 or 64) and whether to fill enclosed interiors before loading.
3. The loaded model appears as the single 3D reference. Its occupied bounds are centered and uniformly normalized while preserving proportions; original world units are not used by shape search. Switching asset families retains this target and refits the starting recipe.
4. The initial recipe is fitted from up to 12 large occupied boxes. This gives the optimizer a useful starting structure for non-rock objects rather than starting with a boulder. Press **Start search** for real parameter/structure evolution against the imported target.
5. Select one of the four generated models, then export the recipe, generator or model. **Reference voxel JSON/GLB** exports the normalized target at the preview grid. **Restore built-in references** returns to the authored dataset.

Search still optimizes geometric descriptors and silhouettes, not source-image pixels or material colors. Imported colors are retained in the reference palette; generated colors follow the selected asset family's materials. Imported GLB textures are sampled into reference voxel colors, not retained as an exact original material graph. The existing geometric recipe language is limited to 12 operations and retains its largest connected generated component. Fine details, arbitrary topology and detached parts may therefore be approximated or omitted. The fitted recipe is a compact generative program, not a mesh or voxel grid disguised as code.

A single imported model is used for both fitting and validation across different seed sets. The UI explicitly says that there is no separate held-out geometry. It does not duplicate one model five times and present the copies as independent references. Built-in and prompt datasets retain their original four-training/one-held-out split. Recipe JSON records the imported reference name and validation interpretation; the exported runtime itself does not need the source file.

## Local GLB conversion

The loader reads embedded GLB 2.0 geometry, node transforms, static instancing, base-color factors, vertex colors, UVs, embedded texture pixels, UV transforms/wrap modes and alpha thresholds. It uses [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). Static node transforms are applied before normalizing the whole object.

A worker intersects each triangle with candidate voxel boxes using [Box3/triangle intersection](https://threejs.org/docs/pages/Box3.html). Barycentric coordinates at the closest point provide the surface color. Texture RGB is decoded to linear, multiplied by material/vertex color, converted back to sRGB and quantized to a deterministic 216-color cube. Optional exterior flood fill identifies enclosed volume; inward color propagation fills those cells. Surface-only import preserves an open shell. Conservative voxelization can close gaps smaller than a voxel; choose a finer import grid or surface-only mode when relevant. All components of the reference are retained.

No external resources are loaded. Limits are 40 MB per reference, 250,000 triangles, 256 materials, eight million decoded texture pixels (each texture capped at a 1024-pixel longest edge), and fifty million candidate triangle/voxel tests. Import can be cancelled. External buffer/image URLs and GLBs requiring Draco, Meshopt or KTX2 decoders are rejected with an explanation; export a static, uncompressed GLB with embedded PNG/JPEG images. Skinned models need a static pose export. Animation playback, full PBR appearance, normal/roughness/emissive maps and exact original texture reproduction are outside this voxel-reference conversion.

Voxel JSON accepts the workshop's version 1 format, resolutions 12?96 and palettes of at most 256 colors. Empty or invalid imports leave the previous target intact. Preview/search grids resample the source deterministically; the optimizer evaluates at grid 20, so sub-grid details cannot drive a precise fit.

## Texture styles

The new **Texture style** selector has five choices:

| Style | Detail | Rendering |
| --- | --- | --- |
| Natural | Existing 128 ? 128 procedural detail | Linear filtering/mipmaps |
| Minecraft-like | Original 16 ? 16 quantized, contrasting pixel patches | Nearest filtering, no mipmaps |
| Valheim-like | Original 64 ? 64 coarse painted mottling and directional brush patches | Linear filtering/mipmaps |
| Tiny pixelated | Original 8 ? 8 restrained pixel palette | Nearest filtering, no mipmaps |
| Flat color | Material/vertex colors without a detail map | No color texture on GLB |

The names describe broad visual influences; these patterns contain no copied game textures. Styles change surface detail, not voxel occupancy, positions, indices or triangle counts. The existing **Material display** control is a preview override; use **Flat color** when the flat appearance should be part of the exported generator defaults.

Styles apply to previews, reference previews, PNG, GLB, standalone TypeScript and Rust defaults. For super-low-poly meshes, detail style is selected **before** source-to-target atlas rebaking; styles are not applied as a destructive filter across atlas seams. Pixel atlases retain nearest filtering. Flat super-low-poly converts rebaked source colors into constant per-triangle vertex colors and replaces the atlas with a neutral texture. Flat colors also survive the vertex-color-only display override.

Flat-color PNG is intentionally a neutral white 16 ? 16 texture because the material colors live in the mesh vertex attributes. It is not a complete colored model on its own. Super-low-poly styles return a rebaked atlas, so atlas dimensions differ from the base pattern sizes in the table. Always use the returned texture, UVs and vertex colors together. Selected model/seed/grid/mode/style are carried into recipe metadata and generator exports.

Runtime 3.1 supports `generateRock({recipe, seed, meshMode, textureStyle})` and `meshVoxels(voxels, scale, meshMode, textureStyle)`, with natural as the backward-compatible default. Styles are `natural`, `minecraft`, `valheim`, `tiny`, `flat`. Rust adds `TextureStyle`, `generate_rock_styled` and `SELECTED_TEXTURE_STYLE`; the original generation APIs still default to natural. The compiled Rust CLI accepts style as a fifth argument after seed/grid/scale/mode. All patterns and flat-color handling are deterministic and standard-library-only in Rust.

## Checks and delivery

- [Core and export verification](verification.json): local triangle/box voxelization, shell versus filled volume, source colors, normalization, valid block fitting, actual 96-candidate search against a single model, validation on unseen seeds, and 100 exact JavaScript/Rust buffer comparisons across two families, all five geometry modes and all five texture styles. Style changes preserve geometry. The selected Rust default also matches.
- The existing 288 exact JavaScript/Rust checks passed for six version 1/2 recipes, four old geometry modes, extreme seeds and multiple scales/grids.
- [Browser checks](browser.json): real reconstructed JSON and GLB become targets and drive search; one-reference validation is labeled honestly; all styles export matching PNG dimensions, GLB material state, standalone TypeScript output and compiled selected Rust textures; super-low-poly style switching; direct reconstruction transfer; invalid imports preserve the target; mobile layout. Zero remote requests and page errors.
- [Native Windows checks](desktop.json): JSON and GLB imports under the application protocol, source-driven search, selected model 4 / seed 45, all four new styles on super-low-poly output, PNG/GLB saves through native dialogs, compiled styled Rust matching selected output, flat/solid color preservation and the reconstruction bridge. Zero remote requests and page errors.
- [Portable build verification](release.json): the final ZIP's application archive matches the tested Windows build. The launcher points to that versioned build, leaving already open older copies untouched.

Open `launch-desktop.cmd` to run Windows v1.6, or extract `release/VoxelGeneratorWorkshop-Windows-x64.zip`. Run `npm run check:references`, `npm run check:references:browser`, and `npm run check:references:desktop` for the new verification scripts. The desktop test uses an isolated profile.

Source: `src/imports/reference.ts` (normalization, fitting and voxelization), `src/imports/load-reference.ts` (GLB extraction), `src/imports/worker.ts`, `src/runtime/texture-style.ts`, the shared Rust runtime/export adapter, and the existing application/search adapters.
