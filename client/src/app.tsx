import { LocationProvider, Router, Route } from 'preact-iso';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './routes/Home';
import { NotFound } from './routes/NotFound';

export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary>
        <Router>
          <Route path="/" component={Home} />
          <Route default component={NotFound} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}
