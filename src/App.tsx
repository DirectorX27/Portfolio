import { Page } from '@/components/Page/Page';
import { About } from '@/components/About/About';
import { Gallery } from '@/components/Gallery/Gallery';

export function App() {
  return (
    <Page aside={<About />}>
      <Gallery />
    </Page>
  );
}
