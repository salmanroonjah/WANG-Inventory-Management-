import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function mount() {
  const container = document.getElementById('root');
  if (!container) return;
  const root = createRoot(container);
  root.render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
