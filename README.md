# Voxel Generator Workshop — Stage 1: Procedural Rock Generators

Build the first working stage of **Voxel Generator Workshop**: a tool for automatically searching for procedural model generators. The test case is voxel rocks for the game **Hot Vampires**.

Implement the application, run it, and test it. Do not stop at a plan or mockup.

## Goal

I want to investigate whether a program can search for good recipes for building rocks: change geometric operations, their arrangement, and their parameters; evaluate the generated models; and retain the best generators.

The output should be a small library that generates varied rocks from a seed, without an AI model, network access, or reference data at runtime.

AI may assist with writing this software and creating reference assets for testing. The recipe search mechanism itself must operate without LLMs, neural networks, or external AI services.

Do not draw conclusions about Steam AI disclosure requirements. This prototype tests technical feasibility and output quality.

## Workflow and technology

First inspect the repository and project instructions. If an application already exists, follow its technology choices.

For an empty repository, use TypeScript, Three.js, and Vite. React is acceptable for the interface. Keep the generation and search library separate from the UI and Three.js.

Do not require an account, backend, or paid API. Run the search in a Web Worker to keep the UI responsive.

Make routine decisions independently. Start with a small, complete implementation and expand it only after the entire workflow runs.

## 1. Rock and recipe representation

The model's source must be a recipe stored as versioned JSON conforming to a small language of geometric operations.

A recipe must describe a generator of an entire family of variations, rather than a list of voxels for one model.

Implement a limited set of operations, such as:

- Create a main volume: an ellipsoid or rounded box.
- Add smaller masses.
- Scale and rotate.
- Cut with a plane.
- Create chips by subtracting volumes.
- Create layering or offsets with a shared direction.
- Apply bounded surface perturbation.
- Assign colors.
- Sample the result onto a voxel grid.

Use noise mainly for detail. The silhouette should emerge from the volume construction, cuts, and connected masses.

Operations should use shared parameters, such as a layering axis, elongation, fracture direction, and erosion level. This should produce correlated variation.

Set limits on recipe length, operation count, and resolution. Ensure deterministic results for the same generator version, recipe, and seed.

Do not execute generated text using eval. Search over validated data structures.

## 2. Three rock families

Support:

- A compact boulder.
- A flat or layered rock.
- An angular shard.

Each family must support changes to recipe structure. Assigning three names to the same noise generator is insufficient.

Start with approximately 24–32 voxels along the longest axis for previews. Choose the exact value after measuring performance.

## 3. Reference data

Prepare a small reference dataset that allows the prototype to run without additional configuration.

You may use AI-generated models if suitable tools are available. Do not assume that an image generator can produce a real 3D model.

If AI model generation is unavailable, prepare carefully selected independent demonstration recipes or manually designed voxel examples. Clearly document their provenance. Do not present them as AI-generated models.

Demonstration examples should be created independently of the population being searched. If they share construction mechanisms with that population, state this limitation in the experiment report.

Add import and export for a simple voxel JSON format. Treat GLB import as an extension once the core experiment works.

Keep provenance metadata for the examples.

## 4. Similarity, diversity, and validity evaluation

Implement explicit, non-neural descriptors. Select a small, useful set, such as:

- Bounding-box proportions.
- Occupied volume fraction.
- Center of mass.
- Compactness.
- Asymmetry.
- Occupancy profiles by height.
- Silhouettes from several directions.
- Number and sizes of connected components.
- Surface measurements at multiple scales.

Do not use the normal distribution of the final voxel mesh as a simple measure of angularity: its normals will be dominated by the grid axes.

Normalize descriptors so that one numerical scale does not dominate the score. Evaluate shape quality separately from color.

Evaluate each recipe across multiple seeds. Compare the characteristics of entire sets, accounting for both similarity to the references and coverage of their variation.

Penalize:

- Empty models.
- Unwanted disconnected fragments.
- Nearly identical results across different seeds.
- Excessive recipe complexity.

Do not reward diversity at the expense of completely departing from the reference style.

For cost optimization, primarily use a stable operation-count estimate. Measure actual execution time separately so that timing noise does not drive evolution.

Split seeds into search seeds and independent validation seeds. If the number of examples allows it, also hold out some references for final evaluation.

## 5. Genuine program search

Implement a simple evolutionary algorithm operating on recipes.

It must support:

- A population.
- Selection.
- Retention of the best individuals.
- Parameter mutations.
- Structural mutations: adding, removing, or replacing an operation.
- Score history logging.
- Saving the best result.

Crossover is optional if it substantially complicates the first version.

Validate recipes after mutation. Enforce cost limits.

Choose population size, generation count, and seed count to suit the available hardware. Provide a quick demonstration mode and a longer experiment mode.

Do not call numerical parameter tuning alone “code evolution.” Show the structural changes that actually occurred in the interface.

## 6. Comparison with simpler methods

Prepare three experimental variants:

- **A.** Random recipes without selection.
- **B.** Parameter-only optimization with a fixed structure.
- **C.** Joint optimization of recipe parameters and structure.

Compare them under a clearly documented budget, preferably the same number of candidate evaluations and the same conditions.

Report results on independent seeds. For random search, show both the distribution of results and the best candidate found.

Do not assume that C must win. If it does not, report the result honestly, including limitations of the scoring function and data.

When the budget permits, repeat the experiment with several seeds for the search process itself.

## 7. Workshop interface

Build a usable interface with:

- A reference gallery.
- A 3D viewer with rotation and zoom.
- Rock family selection.
- Seed and resolution controls.
- Search start and stop controls.
- A progress chart.
- A gallery of the best recipes.
- A preview of multiple variations of one recipe.
- An A/B/C comparison.
- A readable view of recipe operations.
- Export controls.

The user should be able to pin a favorite recipe and generate a new batch of rocks from it.

Show references and outputs side by side using the same camera and lighting settings. Avoid visual effects that conceal poor geometry.

## 8. Game library and export

Separate:

- The workshop and optimizer.
- Recipes and parameters.
- A lightweight runtime for generating voxels and geometry.
- The Three.js preview adapter.

The runtime must not depend on the UI, optimizer, reference dataset, or network services.

Provide an API similar to:

```ts
generateRock({ recipe, seed, resolution, scale })
```

The result should contain geometry data in typed arrays, color or material information, and a bounding box.

Remove internal faces. If you implement face merging, preserve color boundaries and geometry correctness.

Export:

- The recipe as JSON.
- A TypeScript module containing the recipe and runtime invocation.
- A standalone runtime package.
- A selected model as GLB.

Explain in the documentation whether the exported module interprets a recipe or contains specialized compiled code. Both are acceptable for this first stage, but do not describe one as the other.

Provide a minimal example of using the library outside the workshop. Do not modify Hot Vampires without access to its repository and a separate instruction to integrate it.

## 9. Verification

Verify at least:

- Identical output for the same recipe and seed.
- Genuine variation across different seeds.
- Recipe validity after mutations.
- Absence of empty and invalid geometry in a test batch.
- Matching results between the workshop and exported runtime.
- Operation of the exported generator without reference data.
- Opening the exported GLB through an independent import path.
- Correct search start and stop behavior.

Measure voxel generation and mesh construction separately. Report resolution, repetition count, median, p95, and the measurement environment. Do not claim suitability for generation within a single frame without measurements.

Visually inspect the rock gallery and test the interface in a browser if a suitable tool is available.

## 10. Deliverables

Deliver:

- A working application.
- Source code for the generator, optimizer, and runtime.
- Demonstration references with provenance documentation.
- Saved best recipes.
- Results of the A/B/C experiment.
- Run instructions.
- A short report covering what works, what the experiment demonstrated, limitations, and the next step.

Prioritize a complete, verified workflow:

**References → recipe search → evaluation on new seeds → export → independent generation.**

Do not expand the first stage to include trees, characters, rigging, or animation. First demonstrate on rocks that the workshop can find useful generators and export them for use in a game.
