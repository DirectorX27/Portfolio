import { AvatarVideo } from '@/components/AvatarVideo/AvatarVideo';
import { Clock } from '@/components/Clock/Clock';
import { Intro } from '@/components/Intro/Intro';
import { Bio } from '@/components/Bio/Bio';
import { Experience } from '@/components/Experience/Experience';
import { ContactButton } from '@/components/ContactButton/ContactButton';
import { OpenToWork } from '@/components/OpenToWork/OpenToWork';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { profile } from '@/config/site';
import styles from './About.module.css';

export function About() {
  return (
    <aside className={styles.about}>
      <div className={styles.media}>
        <AvatarVideo />
        <Clock />
      </div>

      <Intro />
      <Bio />
      <Experience />

      <div className={styles.controls}>
        <ContactButton />
        <div className={styles.meta}>
          {profile.openToWork ? <OpenToWork /> : <span />}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
