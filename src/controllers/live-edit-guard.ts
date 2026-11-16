export function createLiveEditGuard(doc:Document){
 const dirty=new Set<HTMLFormElement>();
 function edited(event:Event){const target=event.target;if(target instanceof Element){const form=target.closest('form');if(form)dirty.add(form);}}
 function saved(event:Event){const form=(event as CustomEvent<{form?:HTMLFormElement}>).detail?.form;if(form)dirty.delete(form);}
 function reset(event:Event){if(event.target instanceof HTMLFormElement)dirty.delete(event.target);}
 function blocked(){
  if(doc.querySelector('dialog[open],form[aria-busy="true"],input[aria-label^="Unenhanced "]'))return true;
  const active=doc.activeElement;if(active?.matches('input,textarea,select,[contenteditable="true"]'))return true;
  for(const form of dirty){if(!form.isConnected||form.getClientRects().length===0||!form.querySelector('input:not([type="hidden"]),textarea,select'))dirty.delete(form);else return true;}
  return false;
 }
 doc.addEventListener('input',edited,true);doc.addEventListener('change',edited,true);doc.addEventListener('reset',reset,true);doc.addEventListener('dcc:form-saved',saved);
 return{blocked,dispose(){doc.removeEventListener('input',edited,true);doc.removeEventListener('change',edited,true);doc.removeEventListener('reset',reset,true);doc.removeEventListener('dcc:form-saved',saved);dirty.clear();}};
}
export function announceFormSaved(form:HTMLFormElement|null){if(form)document.dispatchEvent(new CustomEvent('dcc:form-saved',{detail:{form}}));}
