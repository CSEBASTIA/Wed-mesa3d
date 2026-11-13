import { createRoot } from 'react-dom/client';
import { App } from './App';
import { store } from './core/store';
import { actions } from './app/context';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Acceso para depurar desde la consola del navegador (solo en desarrollo).
if (import.meta.env.DEV) Object.assign(window, { taller: { store, actions } });
