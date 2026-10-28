# Six-view reconstruction

Six-view geometry adds top and bottom masks, X-Z footprint carving, proper opposite-view orientation, calibrated top/bottom scale and all six source colors. Tests cover a footprint notch invisible to four side views, six directional colors, consistent masks and physical scale. Top images have the front (+Z) down; bottom images have the front up.

The initial per-voxel texture interpretation was superseded by source-derived, whole-model appearances in v1.8. See the [current usage and verification report](../source-textures-v11/REPORT.md). Images and browser/native records in this folder are historical checks of the initial six-view implementation; current texture previews and native checks are in `../source-textures-v11/`.
