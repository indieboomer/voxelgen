# Detailed references - v2 update

The reference gallery now contains nine AI-generated concept images on a single contact sheet and fifteen authored 3D voxel interpretations. Geometric detail replaces the previous mostly smooth primitive references: joined bevelled masses, oblique fracture grooves, overlapping offset shelves, tapered fins, coherent mineral seams and natural family palettes. True 3D thumbnails, close inspection, and reference voxel/GLB exports make the dataset reviewable. Display vertex colors are converted from sRGB to linear before lighting to avoid washed-out stone colors.

## Repeated equal-budget experiment

Same A/B/C algorithms and 96-candidate budget as the original experiment; three search-process seeds per family and method, three training seeds, four independent validation seeds, four training references and one held-out reference. Search resolution remains 20; previews can use up to 48. Each entry is the mean held-out loss over three search runs.

| Family | A random | B parameters | C structure + parameters |
|---|---:|---:|---:|
| boulder | 0.009411 | 0.007632 | 0.010176 |
| layered | 0.021834 | 0.013231 | 0.010779 |
| shard | 0.017276 | 0.009646 | 0.013452 |

The more detailed reference art does not make the small recipe language or descriptor loss perceptually stronger. The current optimizer still frequently prefers simpler shapes. There is no consistent structural-search advantage; inspection shows the runtime cannot yet reproduce all the ledges and broad fracture planes depicted in the concepts. These are better targets, not a claim that generated output now matches the artwork. Color detail is deliberately excluded from the shape score. Full candidate distributions and histories are recorded in experiment.json; selected recipes are in public/recipes-v2/. Original results are preserved separately.

## Validation

TypeScript and production build pass. Existing runtime verification still passes. All 90 reference objects (15 objects across six resolutions: 12, 20, 24, 28, 32, 48) are nonempty and single-component, with finite geometry, valid indices and exact voxel JSON round trips. Browser QA verified concept selection, focus/comparison switching, all fifteen 3D thumbnails, three reference GLB exports loaded independently through GLTFLoader, and a 390px mobile viewport without horizontal overflow. Existing search start/stop and completion checks also pass. Screenshots of all three families were captured and inspected.

## Provenance and limits

See ../PROVENANCE.md and IMAGE-PROMPT.md. The AI output is a 2D image. Voxel interpretation is authored code and does not establish accurate 3D reconstruction. Detail can be lost at the resolution-20 search grid. The fifth reference is held out from scoring, but all examples share an authored family construction, so generalization remains weakly tested. Next: extend recipe structure with bevelled polyhedra and explicit strata, then add multiview silhouette and surface-scale descriptors before drawing conclusions from increased search budgets.