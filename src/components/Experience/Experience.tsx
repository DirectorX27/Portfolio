import { useEffect } from 'react';
import { experience } from '@/data/experience';
import { waitFor } from '@/lib/ready';
import styles from './Experience.module.css';

export function Experience() {
  // Прелоудер ждёт логотипы, чтобы они не появлялись позже строк
  useEffect(() => {
    experience.forEach((item) => {
      const img = new Image();
      img.src = item.logo;
      waitFor(img.decode());
    });
  }, []);

  return (
    <section className={styles.experience} aria-labelledby="experience-title">
      <h2 id="experience-title" className={styles.title}>
        Experience
      </h2>
      <ul className={styles.list}>
        {experience.map((item) => (
          <li key={item.id} className={styles.row}>
            <img className={styles.logo} src={item.logo} alt="" width={22} height={22} />
            <span className={styles.company}>{item.company}</span>
            <span className={styles.period}>{item.period}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
