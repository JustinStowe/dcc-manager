import type {EffectTemplate,EffectLinks} from '@/domain/effect-templates';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import {EffectTemplateLink} from '@/components/effect-template-link';
export function LinkedEffectView({context,kind,target,templates=[],links={},isGm=false}:{context:SheetContext;kind:'spell'|'item';target:string;templates?:readonly EffectTemplate[];links?:EffectLinks;isGm?:boolean}){
 const linkedId=links[`${kind}:${target}`],template=templates.find(t=>t.id===linkedId);
 return <div>{template&&<p>Self effect: <strong>{template.definition.name}</strong> · {template.definition.remainingRounds===null?'No countdown':`${template.definition.remainingRounds} rounds`} · repeat: {template.repeatPolicy}. Resource cost and effect save together. Resolve Checks and timing before use.</p>}{isGm&&<EffectTemplateLink context={context} kind={kind} target={target} templates={templates} linkedId={linkedId}/>}</div>;
}
