import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const metadata='release/latest-desktop-build.json';
export const desktopExecutable=existsSync(metadata)?resolve(JSON.parse(readFileSync(metadata,'utf8')).executable):resolve('release/Voxel Generator Workshop-win32-x64/VoxelGeneratorWorkshop.exe');
