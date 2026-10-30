import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/fonts.css';
import './styles/global.css';
// tokens.css и preloader.css подключены в index.html

if (new URLSearchParams(location.search).has('debug')) {
  document.documentElement.dataset.debug = '';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
