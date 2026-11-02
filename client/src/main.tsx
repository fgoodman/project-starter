import { render } from 'preact';
import './index.css';
import { App } from './app.tsx';
import { StoreProvider } from './store';

render(
  <StoreProvider>
    <App />
  </StoreProvider>,
  document.getElementById('app')!,
);
