// Explicit opt-in provider smoke test; the ordinary check chain stays offline.
import { spawnSync } from 'node:child_process';
const result=spawnSync(process.execPath,['--use-system-ca','node_modules/vitest/vitest.mjs','run','src/lib/ai/live-groq.spec.ts'],{
 env:{...process.env,NODE_USE_SYSTEM_CA:'1',DCC_RUN_LIVE_AI:'1'},stdio:'inherit',windowsHide:true,
});
if(result.error){console.error('Could not start the System AI smoke test.');process.exitCode=1;}
else process.exitCode=result.status??1;
