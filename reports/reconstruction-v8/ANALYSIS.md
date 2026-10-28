# Local multi-view voxel reconstruction — approach and implementation plan

| Approach | Strength | Fit for 2 or 4 cardinal views |
| --- | --- | --- |
| Orthographic silhouette intersection / visual hull | Deterministic, robust to texture and shading; direct voxel output; easy to inspect | Best initial implementation. Four views constrain width and depth. Front/back alone need an explicit depth assumption. |
| Calibrated photo-consistency / space carving | Can refine shape using matching surface appearance and visibility | Needs known cameras and compatible lighting/texture; opposing views have little overlapping visible surface. Unsafe to infer extra geometry here. |
| Classical feature matching + stereo / multi-view stereo | Useful for many overlapping perspective photographs | Two opposite or four 90-degree views often lack shared features. Requires camera calibration or enough overlap to estimate it. |
| Shape from shading | Uses image brightness | Lighting/material ambiguity makes it unreliable for general objects. |
| Learned image-to-3D | May invent unseen structure | Excluded by the requirement. |

Chosen pipeline: image decoding locally › alpha or dominant solid background detection › perceptual color threshold with border-connected flood fill › optional enclosed-background removal and manual mask correction › foreground-height alignment, mirror/scale/offset controls › orthographic intersection on an adjustable cubic voxel grid › projected surface color and texture atlas › local preview and exports. Heavy work runs in a Web Worker.

No AI, weights, image service, remote upload, Python server or network dependency is used by reconstruction. Front is +Z, back is -Z, left is -X, right is +X. A natural back photograph reverses world X, and the projector accounts for it automatically. Source masks and per-view consistency diagnostics make carving reviewable.

Grid mode selects cells across the reconstruction cube. Voxel-size mode selects world units per cell, bounded by a safe maximum grid. Object height defines world scale. Front/back-only mode exposes depth/height and reports that the shape is an extrusion assumption. Four views derive depth from the side silhouettes. Perspective photos should be captured head-on from a distance; this implementation does not estimate camera intrinsics or poses. Hidden cavities, invisible top/bottom shape and unseen surface color are not uniquely recoverable.

For solid-color removal, direct perceptual color comparison plus connectivity is the first choice: no learned/statistical foreground classifier is required. Alpha masks are preferred when present. Border-connected removal preserves enclosed object areas that happen to match the background; users can explicitly include enclosed matching regions or paint keep/remove strokes. Masks are previewed before reconstruction.

References:

- [Laurentini, How Many 2D Silhouettes Does It Take to Reconstruct a 3D Object? (1997)](https://www.sciencedirect.com/science/article/pii/S1077314296905081): silhouette volume intersection and the visual hull; concavities can remain unobservable.
- [Kutulakos and Seitz, A Theory of Shape by Space Carving (1998)](https://publications.ri.cmu.edu/a-theory-of-shape-by-space-carving): calibrated photo-consistency, visibility and the maximal consistent shape.
- [OpenCV GrabCut documentation](https://docs.opencv.org/4.13.0/d8/d83/tutorial_py_grabcut.html): an alternative interactive classical segmentation approach using fitted color distributions and graph cuts; not needed for the initial solid-background workflow.

Implementation and verification: pure TypeScript segmentation/reconstruction modules; separate tool UI inside the existing browser/Electron application; worker progress/cancel; original/removed-background previews and correction tools; source-color GLB, atlas PNG, compatible voxel JSON and restorable project export. Verify synthetic known geometry, direction/mirroring, silhouette constraints, scale and cell size, segmentation failure cases, deterministic output, two/four-view ambiguity, GLB round trips and native Windows saves. Preserve the existing generator tool.
