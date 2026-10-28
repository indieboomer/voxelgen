# Shape-preserving reconstruction smoothing

Enable **Shape-preserving smoothing** in Multi-view reconstruction, then reconstruct. Try **Load arched chest demo** for six locally generated reference images. All processing runs locally without AI or model weights.

The derived surface fits the original image contours using bounded dual contouring. It is deliberately conservative: it reduces voxel stair steps while retaining hard planar faces and creases. It does not globally relax the object into a rounded blob.

## Controls

- **Automatic** fits supported surfaces across the model. **Selected region** restricts fitting to a normalized 3D box, with an interior transition. Top-third and whole-cube presets help place it.
- **Protect this box** excludes a region. Multiple protected boxes are supported.
- The **3D surface brush** paints smooth or protected areas directly on the model. Return to Inspect to rotate normally. This is separate from painting the source image masks.
- Strength blends toward the fitted positions. Maximum shift is measured **per axis in voxel units**, capped at half a voxel. Crease angle controls which contour directions can blend.
- Thin-part protection pins coordinates across solids and finite gaps at most two voxels wide. It can retain visible steps around narrow details; disable it only when the tradeoff is acceptable.
- The diagnostic overlay shows planes, curves, creases, corners and protected/thin regions. It is excluded from exports.

Preview and **GLB** use the fitted surface. **Voxel JSON and procedural-generator references retain the original voxel grid**. Project files retain smoothing settings, boxes and brush strokes. Existing projects default to smoothing off. All four reconstruction texture modes project source colors onto the fitted triangles; Default rebakes a triangle atlas, Minecraft/Valheim retain whole-view source color patches, and one-color-per-voxel retains palette colors.

## Implementation

Source masks are traced into closed directed contours, simplified with a 0.6-source-pixel Ramer-Douglas-Peucker tolerance. Segment intersections provide Hermite positions and silhouette normals. Nearby compatible contour directions blend; large turns remain crease constraints. A regularized QEF fits one vertex per active dual cell. Each coordinate is bounded to its original cell neighborhood, and selected/protected regions constrain displacement. Texture color boundaries do not imply geometric creases.

Original sign connectivity is retained. Topology checks require paired triangle edges and connected manifold vertex links. Triangle orientation, minimum area/edge length, and source-silhouette samples are checked; failing displacements are reduced toward the voxel baseline. Unsupported nonmanifold contacts fall back visibly to the original mesh. No morphology fills source gaps. This is not semantic chest detection and cannot infer hidden cavities or missing details from silhouettes. It does not perform a global triangle self-intersection proof. Coarse grids can still show steps, particularly at protected details or where the half-voxel movement bound is reached.

The approach follows [Dual Contouring of Hermite Data](https://people.eecs.berkeley.edu/~jrs/meshpapers/JuLosassoSchaeferWarren.pdf), using source silhouettes rather than an inferred continuous 3D field for the Hermite constraints.

## Verification

`npm run check:hard-surface` checks planes, an analytically rendered arched chest, selected/protected regions, a thin bar, a narrow slit, deterministic output, manifold edge pairing, positive volume, nondegenerate triangles, texture modes and fallback.

At grid 32 the chest lid RMS error fell from 0.01858 to 0.01060 world units (42.9%). Cube plane error and chest body plane spread were both zero. The selected-lid test left 12,744 lower-body expanded vertices on their original voxel grid. Thin-gap protection retained a 0.0325-unit gap versus 0.02344 without it. Source cells stayed unchanged. These are fixture-specific results, not guarantees for arbitrary inputs.

`npm run check:hard-surface:browser` passed real browser reconstruction, all four GLB materials imported independently, diagnostic overlay export isolation, box and 3D brush controls, project restore, cancellation/restart and mobile layout. Existing source-texture, six-view and reconstruction checks also passed.

`npm run check:hard-surface:desktop` exercises the separately packaged Windows executable with an isolated QA profile: native voxel/GLB/PNG saves, all four texture modes, protected region, project roundtrip and legacy defaults. Machine-readable results are in this directory. The portable release is version 1.9.0; launch it through `launch-desktop.cmd` after reopening the app.

On this machine, the chest benchmark measured smoothing at 562 ms / 1,420 ms / 2,332 ms for grids 32 / 48 / 64 (6,920 / 15,624 / 28,192 triangles). These are indicative single runs; timings vary with inputs and hardware. See `benchmark.json`.
