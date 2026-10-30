import { contacts } from '@/config/site';
import styles from './ContactLinks.module.css';

// Ниже 1040: те же ссылки, что раскрываются из Connect, рядом внизу страницы
export function ContactLinks() {
  return (
    <nav className={styles.root} aria-label="Contacts">
      <ul className={styles.list}>
        {contacts.map((item) => (
          <li key={item.label} className={styles.item}>
            <a className={styles.pill} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
