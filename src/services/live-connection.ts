export interface LiveChannel {on(type:'broadcast',filter:{event:string},callback:()=>void):LiveChannel;subscribe(callback:(state:string)=>void):LiveChannel}
export interface LiveClient {realtime:{setAuth():Promise<unknown>};channel(topic:string,options:{config:{private:boolean}}):LiveChannel;removeChannel(channel:LiveChannel):Promise<unknown>}
export function createLiveConnection(client:LiveClient,userId:string,changed:()=>void,status:(state:string)=>void){
 let disposed=false,connecting=false,channel:LiveChannel|null=null;
 async function connect(){if(disposed||connecting||channel)return;connecting=true;try{await client.realtime.setAuth();if(disposed)return;channel=client.channel(`dcc:user:${userId}`,{config:{private:true}}).on('broadcast',{event:'changed'},()=>{if(!disposed)changed();}).subscribe(state=>{if(!disposed)status(state);});}catch{if(!disposed)status('CHANNEL_ERROR');}finally{connecting=false;}}
 function dispose(){disposed=true;if(channel)void client.removeChannel(channel).catch(()=>{});channel=null;}
 return{connect,dispose};
}
