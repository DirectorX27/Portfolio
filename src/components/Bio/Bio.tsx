import { profile } from '@/config/site';
import styles from './Bio.module.css';

export function Bio() {
  return (
    <section className={styles.bio} aria-labelledby="bio-title">
      <h2 id="bio-title" className={styles.title}>
        About
      </h2>
      <p className={styles.text}>{profile.about}</p>
    </section>
  );
}
