import type { ReactNode } from 'react';
import styles from '@/styles/sheet-section.module.css';

export function SheetSection({title,children}:{title:string;children:ReactNode}){
  return <details className={styles.section}><summary className={styles.heading}><h3>{title}</h3><span className={styles.indicator} aria-hidden="true" /></summary><div className={styles.body}>{children}</div></details>;
}
