# Source-derived whole-model textures ? Windows v1.8

Reconstruction texture modes now derive their colors from the original foreground images. Minecraft-like and Valheim-like are whole-model appearances, not procedural patterns repeated on each voxel. Six-view carving, top/bottom orientation and scale calibration remain intact.

## Controls

In **Multi-view reconstruction**, reconstruct the object and choose **Texture mode**:

| Mode | Color source | Appearance |
| --- | --- | --- |
| Default | Original foreground image samples | Existing projected-image appearance |
| Each voxel is one color | Averaged source pixels covering the voxel | One source-derived palette color on every face of a voxel |
| Minecraft-like / whole-model pixels | Coarse, foreground-only block averages of each original view | Crisp color pixels across the object; no voxel-sized tile repetition |
| Valheim-like / averaged source colors | The same source-derived color patches | Smooth interpolation of low-resolution colors for a softer painted appearance |

**Source color resolution** is shown for Minecraft-like and Valheim-like. Choose 4, 8, 16, 24, 32 or 64 color blocks across the longest foreground dimension of each source view. Lower values heavily pixelate and average more original pixels; higher values retain more details. The default is 16. Both style and resolution update an already reconstructed preview automatically. They are included in saved projects and export metadata. Existing projects without a resolution use 16.

These styles contain no generated grayscale grain, random shading, repeated block frames or copied game textures. Every used texture patch comes from averaged foreground RGB in the original views. Minecraft-like uses nearest filtering; Valheim-like blends neighboring source-color patches. The geometry is independent of these settings.

## Source-color processing

For the two styled appearances, each view is reduced once to a coarse color grid anchored to its complete foreground bounds. Each grid cell averages original RGB, weighted by alpha and excluding removed-background pixels. Empty cells extend the nearest valid foreground color so silhouette borders and holes do not pick up backdrop colors.

The filtered views are packed into a padded atlas. Mesh faces project into the appropriate whole-view patch, using the same front/back/left/right/top/bottom projection as reconstruction. UVs do not reset at voxel or greedy-rectangle boundaries. A merged greedy face still covers the complete relevant portion of the image, so merging does not reduce it to a repeated texture tile. Styled textures already contain source RGB; white vertex tint avoids multiplying their colors a second time. All atlas sampling clamps rather than repeats.

The one-color-per-voxel representation now averages the foreground footprint of a voxel in its selected visible source view, with a minimum three-pixel source neighborhood. Color tables are computed once per projected grid cell and reused by interior voxels. This suppresses source-pixel noise even at a fine voxel grid. The compact palette still groups colors into at most 216 occupied bins, but each used bin stores the actual mean of its source colors instead of a fixed artificial RGB-cube value. Uniform source colors therefore retain their measured mean.

The default projected-image texture remains the direct source-image path. Voxel JSON stores averaged per-voxel palette colors plus appearance metadata. GLB and Texture PNG carry the whole-model source atlas; projects contain the input images needed to recreate it. One-color-per-voxel GLB uses vertex colors without a texture map, so its optional PNG is neutral white.

Source photos can disagree in exposure, pose or lighting. Image averaging does not estimate illumination or invent material colors for surfaces not observed in a view. Very low color resolutions deliberately remove small markings. The resolution control exposes that tradeoff.

## Six-view support retained

Choose **Six views / add top + bottom** to use all six silhouettes. Front is +Z, back -Z, left -X, right +X, top +Y and bottom -Y. In the top image, the front (+Z) is down; in the bottom image, it is up. Existing rotate/flip/shift controls can align reference sheets with another convention.

Top/bottom pixel scale is calibrated using the mean physical width inferred from front/back foreground bounds. Their image height represents depth, not object height. All six silhouettes constrain the voxel volume; top/bottom also provide source colors for their corresponding surfaces. Four-view and two-view projects remain supported. Missing required views disable reconstruction. Hidden cavities remain ambiguous even with six views.

## Verification

- [Source-color tests](verification.json): synthetic foreground noise of ?40 red, ?20 green and ?10 blue around RGB (190,100,50) averages to that exact source mean. Used atlas patches contain that mean, with no added grain. Removed magenta/cyan backgrounds are excluded. Voxel colors remain stable at grids 32 and 96. Coarse/fine gradients retain different amounts of detail. UVs stay in a non-repeating atlas, and merged faces retain the same whole-model color scale as voxel faces. Six-view geometry and deterministic output are preserved.
- Six-view footprint/orientation/source-color tests passed, including a notch that four side silhouettes cannot constrain, all six directional colors, scale invariance and wrong-bottom-flip detection. Legacy reconstruction/segmentation tests also passed.
- [Browser checks](browser.json): six source views and real top/bottom file uploads; every appearance exported as GLB/PNG/voxel JSON; independent GLB imports confirm clamped UVs, correct filter and no repeated voxel tiles. Color resolution changes automatically refresh the model and survive project reload. Greedy mode, generator-reference transfer, mobile layout, zero external requests and zero page errors passed.
- [Windows checks](desktop.json): native inputs and exports under the application protocol; source-based whole-model atlases; no double vertex tint; source resolution restored from a six-view project; an older four-view project falls back to default appearance and resolution 16. No API key or external requests were used.
- [Release verification](release.json) checks that the portable ZIP contains the application archive from the tested v1.8 Windows build.

Run `npm run check:source-textures`, `npm run check:source-textures:browser` and `npm run check:source-textures:desktop`. Native QA uses an isolated profile; browser fixtures should be generated before native tests. Source changes are in `src/reconstruction/source-colors.ts`, `core.ts`, `texture.ts`, `types.ts` and `ui.ts`.

Reopen `launch-desktop.cmd` for v1.8, or extract the updated `release/VoxelGeneratorWorkshop-Windows-x64.zip`. The existing procedural-generator texture styles are independent of these reconstruction settings.
