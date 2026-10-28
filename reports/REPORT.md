# Stage 1 experiment report

27 runs: three families x three methods x three search-process seeds. Each run evaluates 96 candidates on the same three seeds at resolution 20. Population capacity 12, parent selection among the best four; elitist retention. A samples independent random recipes; B mutates the fixed two-operation family template; C mutates parameters and adds/removes/replaces operations. Total: 2,592 candidate evaluations, 7,776 generated training shapes.

Four hand-designed references train each family. One reference and seeds 1009, 2027, 4093, 8191 are held out. Lower loss is better. No color descriptor affects fitness.

| Family | A random | B parameters | C joint |
|---|---:|---:|---:|
| boulder | 0.010053 | 0.008061 | 0.008672 |
| layered | 0.009912 | 0.010809 | 0.009037 |
| shard | 0.008724 | 0.009946 | 0.008751 |

These are means over three runs, not significance estimates. C is not universally superior. The small dataset and descriptor loss often favor a simple single mass. Structural search is implemented and observed, but these results do not establish an advantage over parameter tuning. Full random-candidate distributions, best candidates, and convergence histories are in experiment.json. Those distributions are search-set losses; only selected best candidates receive independent validation.

## Measurements

Windows x64, Node v24.14.1, Intel Core i9-10900F @ 2.80 GHz. Five warmups, then 30 repetitions per family/resolution. CPU wall time from performance.now; generation includes component cleanup; mesh time is measured separately. Times are milliseconds.

| Family | Grid | Voxel median / p95 | Mesh median / p95 |
|---|---:|---:|---:|
| boulder | 24 | 1.77 / 2.19 | 1.88 / 2.70 |
| boulder | 28 | 2.60 / 3.52 | 2.52 / 4.38 |
| boulder | 32 | 4.22 / 5.45 | 3.76 / 5.03 |
| layered | 24 | 1.42 / 1.61 | 0.97 / 1.36 |
| layered | 28 | 2.21 / 2.38 | 1.42 / 2.71 |
| layered | 32 | 3.31 / 3.70 | 2.17 / 3.49 |
| shard | 24 | 1.57 / 1.85 | 1.22 / 2.09 |
| shard | 28 | 2.54 / 2.79 | 2.10 / 3.24 |
| shard | 32 | 3.88 / 4.72 | 2.71 / 3.95 |

Preview default is 28, search resolution is 20. These measurements do not promise generation within a frame. Stable operation count (operations x grid volume), not wall time, estimates search cost; complexity contributes a fixed penalty.

## Verification and limitations

Production build and type check passed. Tests cover deterministic buffers, different seeds, 450 valid mutations, 90 nonempty single-component baseline models, voxel JSON round trip, bounds/indices, and nine exact comparisons against the compiled runtime. A headless Chrome run tested start/stop, completed search, pinning, batches, and GLB export followed by GLTFLoader import (one mesh, 5,072 vertices). Screenshots were inspected.

This is a technical feasibility prototype with deliberately small hand-designed data, not an art-quality benchmark. References use independent analytic equations but share primitive construction ideas. The score uses normalized extents, occupancy, center, asymmetry, compactness proxy, and height profiles; it lacks detailed silhouette and multiscale perceptual evaluation. Color is a palette choice, not optimized shape fitness. The runtime retains the largest component, discarding detached chips; the experiment therefore measures cleaned geometry and does not report raw fragment counts. No face merging is used; internal faces are removed. Arbitrary valid recipes can still produce empty output; these receive a severe search penalty. Batch validity checks concern baseline and saved selected generators, not all possible recipes.

The three family templates have different proportions and initial operation structures; evolved programs can simplify them. There is no crossover, GLB import UI, or specialized code compiler. The exported module interprets recipe JSON. Next: larger independently authored voxel datasets, stronger silhouette descriptors, explicit fragment-discard statistics, and more repeated search budgets before assessing structural-search benefit.