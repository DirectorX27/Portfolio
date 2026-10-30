import type { ReactNode } from 'react';
import styles from './Page.module.css';

type Props = { aside: ReactNode; children: ReactNode };

export function Page({ aside, children }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {aside}
        {children}
      </div>
    </div>
  );
}
