import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
const latest=JSON.parse(readFileSync('release/latest-desktop-build.json','utf8'));const exe=resolve(latest.executable),root=resolve('release')+sep;
if(!exe.startsWith(root)||!existsSync(exe))throw Error('Latest desktop build is missing or outside release');
writeFileSync('release/current-desktop.txt.tmp',relative(process.cwd(),exe)+'\n');renameSync('release/current-desktop.txt.tmp','release/current-desktop.txt');console.log('Launcher now opens '+relative(process.cwd(),exe));
