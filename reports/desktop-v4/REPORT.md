# Desktop app and prompt workflow

## Open the Windows app

Double-click `launch-desktop.cmd`, or run:

`release/Voxel Generator Workshop-win32-x64/VoxelGeneratorWorkshop.exe`

This portable Windows x64 build includes its own runtime. It needs no browser, Node.js, npm, dev server, account or network connection for offline concepts, 3D proxies, optimization and exports. Keep the entire application directory together when moving it to another machine. The shell uses Electron 45.1.0; rendering remains Three.js in an isolated embedded Chromium renderer.

To rebuild from source:

```sh
npm install
npm run desktop:package
```

`npm run desktop` builds and opens the desktop application from source. `npm run dev` still provides the browser version.

## Which of the four models is exported?

All four are variations from one recipe. They have different seeds; a generator export represents the entire family.

Click a model in the 3D viewport or its numbered button. A lime outline and the export summary show the selected model number, exact seed and resolution. GLB, voxel JSON and texture PNG export that selected model. Rust exports the shared recipe/runtime plus `SELECTED_SEED`, `SELECTED_RESOLUTION`, `SELECTED_SCALE` and `selected_rock()`. Compile and run it without arguments to reproduce the selected preview. Explicit CLI arguments can still generate other seeds. TypeScript similarly provides `selectedRock()`. Recipe JSON records the selected preview as metadata.

Exports are disabled while search is changing the generator; stopping or completing search synchronizes the preview and export state. Imported fixed voxel meshes do not pretend to have a procedural recipe: code export is disabled until a generated model is selected again.

## Prompt -> 2D -> 3D -> optimization

At the top of the application:

1. Type a rock description, then click **Generate 2D reference**.
2. Click **Build 3D reference** to populate the separate reference viewer.
3. Click **Optimize generator** to search against this prompt-specific reference set.

**Offline rendered concept** works immediately. It parses rock-family and proportion keywords and renders a detailed local concept. Supported shape words include layered/shale/flat, shard/basalt/tall, broad/wide and narrow/thin; warm/rust and dark influence reference colors. This deterministic parser is intentionally limited, not general language understanding.

**AI image / configured API** uses the optional OpenAI image API. The desktop main process (or local Vite server in browser development) reads `OPENAI_API_KEY`; the key never enters the renderer or packaged assets. `OPENAI_IMAGE_MODEL` optionally overrides the default `gpt-image-2`. Select AI mode and click Generate to make the API request using your configured account. This requires network access and API access; it is optional. Desktop-generated AI images and their provenance are saved in the app user-data `references` directory.

Set the environment variables before launching the app. For example, in a PowerShell session where your key is already configured, run `./launch-desktop.cmd`. Do not paste keys into prompts or repository files.

The **3D step is a procedural interpretation of the description**. It is not an AI-generated mesh or image-to-3D reconstruction. No image-to-3D provider is configured. Hidden surfaces and depth are authored assumptions, and generated AI artwork may contain details the proxy does not reproduce. Five prompt-specific voxel studies guide the experiment: four training targets and one held-out variation. Optimization now receives these targets in its worker rather than silently using the built-in dataset. Prompt and image provenance are retained in recipe/reference exports. The proxy construction shares authored mechanisms across its variations; the holdout does not establish broad generalization.

## Implementation and checks

- `desktop/main.cjs`, `preload.cjs`: isolated native window, privileged local asset protocol, native save dialogs and narrowly scoped image-generation IPC.
- `desktop/image-service.cjs`: optional image API adapter; only the main/server process handles credentials.
- `src/workflow/prompt.ts`: deterministic description parsing, independent voxel reference construction and initial program adaptation.
- `src/main.ts`: numbered/raycast model selection, exact export defaults, staged workflow and native export integration.
- `src/search/index.ts`, `src/worker.ts`: optional prompt reference datasets and initial programs.
- `scripts/package-desktop.mjs`: portable Windows packaging from explicit app files, excluding credentials and the source workspace.

```sh
npm run check:workflow
npm run check:rust
npm run check:desktop
npm run check:browser
```

The workflow/browser checks need the local dev server. Desktop checks run the packaged executable. Rust checks need rustc.

Verified the actual packaged Windows executable: offline prompt -> 2D concept -> 3D proxy -> completed worker optimization; native file saving; model 3 / seed 44 / resolution 32 exported as Rust and compiled; isolated renderer without Node access; local artwork dialog. Browser tests cover all four export selections, model 4 default Rust reproduction, prompt-specific targets, mocked AI response flow and mobile layout. Sixty prompt target objects across multiple families/resolutions are connected. The native Rust parity suite still passes 72 exact buffer comparisons.

The optional image API adapter was tested with mocked provider success/failure responses. No live paid API request was made during verification. Implementation follows the official [Images API reference](https://developers.openai.com/api/reference/resources/images/methods/generate), [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol) and [Electron isolation guidance](https://www.electronjs.org/docs/latest/tutorial/security).
