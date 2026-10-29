import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createVerificationOutput} from '../tests/verification-output.mjs';

const groups = {
  rules: [['check-runtime'],['smoke'],['combat-input'],['woodcut-ui'],['gunfight']],
  realistic: ['realistic-combat','combat-dynamics','combat-hover-audio','combat-audio-palette','reward-rest','journey-layers'].map(n=>[n]),
  journey: [['check-runtime','--entry','play.html'],['journey-route'],['event-consequences-rules'],['event-consequences-ui']],
  entry: [['check-runtime','--entry','play.html'],['journey-entry']],
  release: [['check-runtime','--entry','dist/web/play.html'],['journey-route','--entry','dist/web/play.html']],
  offline: [['check-runtime','--entry','output/offline-package/KGame-offline/play.html'],['journey-route','--entry','output/offline-package/KGame-offline/play.html']]
};
const group = process.argv[2];
if (!groups[group]) throw new Error('Unknown verification group: '+group);
// Each invocation owns a fresh parent; child suites also refuse existing paths.
const output = await createVerificationOutput('suite-'+group);
const root = fileURLToPath(new URL('../',import.meta.url));
const results = [];
for (const [name,...args] of groups[group]) {
  const startedAt = new Date().toISOString();
  const code = await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['tests/'+name+'.mjs',...args],{
      cwd:root,env:{...process.env,KGAME_VERIFICATION_ROOT:fileURLToPath(output)},stdio:'inherit',windowsHide:true
    });
    child.on('error',reject);child.on('exit',resolve);
  });
  results.push({name,args,startedAt,completedAt:new Date().toISOString(),exitCode:code});
  await fs.writeFile(new URL('suite.json',output),JSON.stringify({group,results,passed:code===0&&results.length===groups[group].length},null,2));
  if(code!==0){process.exitCode=code||1;break;}
}
