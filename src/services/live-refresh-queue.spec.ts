import {describe,expect,it} from 'vitest';
import {createLiveRefreshQueue} from './live-refresh-queue';
function setup(){let blocked=false,refreshed=0,waiting=false;const tasks=new Map<number,()=>void>();let id=0;const queue=createLiveRefreshQueue({blocked:()=>blocked,refresh:()=>{refreshed++;},waiting:v=>{waiting=v;},schedule:run=>{tasks.set(++id,run);return id;},cancel:key=>{tasks.delete(key as number);}});return{queue,tasks,block(v:boolean){blocked=v;},run(){const all=[...tasks.values()];tasks.clear();all.forEach(run=>run());},state(){return{refreshed,waiting};}};}
describe('automatic refresh queue',()=>{
 it('coalesces a burst of changes into one authorized reload',()=>{const s=setup();s.queue.request();s.queue.request();s.queue.request();expect(s.tasks.size).toBe(1);s.run();expect(s.state()).toEqual({refreshed:1,waiting:false});});
 it('waits while editing and refreshes once editing finishes',()=>{const s=setup();s.block(true);s.queue.request();s.run();expect(s.state()).toEqual({refreshed:0,waiting:true});s.block(false);s.queue.flush();s.queue.flush();expect(s.state()).toEqual({refreshed:1,waiting:false});});
 it('keeps a newer signal pending while another refresh is in progress',()=>{const s=setup();s.queue.request();s.run();s.block(true);s.queue.request();s.run();expect(s.state().refreshed).toBe(1);s.block(false);s.queue.flush();expect(s.state().refreshed).toBe(2);});
 it('cancels timers on unmount and ignores late socket events',()=>{const s=setup();s.queue.request();s.queue.dispose();s.run();s.queue.request();s.queue.flush();expect(s.tasks.size).toBe(0);expect(s.state().refreshed).toBe(0);});
});
