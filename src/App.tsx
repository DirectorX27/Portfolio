import { useEffect } from 'react';
import { Page } from '@/components/Page/Page';
import { About } from '@/components/About/About';
import { Gallery } from '@/components/Gallery/Gallery';
import { reveal } from '@/lib/ready';

export function App() {
  useEffect(reveal, []);

  return (
    <Page aside={<About />}>
      <Gallery />
    </Page>
  );
}
