import styles from './OpenToWork.module.css';

export function OpenToWork() {
  return (
    <div className={styles.badge}>
      <svg className={styles.indicator} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle className={styles.halo} cx="8" cy="8" r="5" />
        <circle className={styles.dot} cx="8" cy="8" r="2" />
      </svg>
      <span className={styles.label}>Open to work</span>
    </div>
  );
}
