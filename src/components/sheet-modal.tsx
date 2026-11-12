'use client';
import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react';
import styles from '@/styles/sheet-controls.module.css';
export function SheetModal({open,title,pending,onClose,children}:{open:boolean;title:string;pending:boolean;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null),titleId=useId();
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();else if(!open&&dialog.open)dialog.close();},[open]);
  function onCancel(event:SyntheticEvent<HTMLDialogElement>){event.preventDefault();if(!pending)onClose();}
  return <dialog ref={ref} className={styles.modal} aria-labelledby={titleId} onCancel={onCancel} onClose={onClose}><h2 id={titleId}>{title}</h2>{children}</dialog>;
}
