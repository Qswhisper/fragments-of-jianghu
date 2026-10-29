import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const candidates=process.env.KGAME_PYTHON?[[process.env.KGAME_PYTHON]]:process.platform==='win32'?[['python'],['py','-3']]:[['python3'],['python']];
const python=candidates.find(([exe,...prefix])=>spawnSync(exe,[...prefix,'-c','import sys;assert sys.version_info>=(3,11)'],{windowsHide:true,stdio:'ignore'}).status===0);
if(!python)throw Error('Install Python 3.11+ or set KGAME_PYTHON to its executable path.');
const [exe,...prefix]=python,script=fileURLToPath(new URL('./setup-assets.py',import.meta.url));
const child=spawn(exe,[...prefix,script,...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>process.exitCode=code??1);
