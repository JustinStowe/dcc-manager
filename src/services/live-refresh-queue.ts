export function createLiveRefreshQueue(options:{blocked:()=>boolean;refresh:()=>void;waiting:(value:boolean)=>void;schedule:(run:()=>void)=>unknown;cancel:(timer:unknown)=>void}){
 let pending=false,disposed=false,timer:unknown=null;
 function flush(){if(disposed||!pending)return;if(options.blocked()){options.waiting(true);return;}pending=false;options.waiting(false);options.refresh();}
 function request(){if(disposed)return;pending=true;if(timer!==null)options.cancel(timer);timer=options.schedule(()=>{timer=null;flush();});}
 function dispose(){disposed=true;if(timer!==null)options.cancel(timer);timer=null;pending=false;}
 return{request,flush,dispose};
}
