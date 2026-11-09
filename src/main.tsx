import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { enableResponsiveTables } from './utils/responsiveTables.js';

function mount() {
  const container = document.getElementById('root');
  if (!container) return;
  enableResponsiveTables();
  const root = createRoot(container);
  root.render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
