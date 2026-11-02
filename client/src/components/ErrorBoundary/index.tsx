import { useEffect, useErrorBoundary } from 'preact/hooks';
import { useLocation } from 'preact-iso';

/** Without this, a page that crashes leaves a blank screen, or the router stuck on the old page. */
export function ErrorBoundary({ children }: { children: preact.ComponentChildren }) {
  const [error, reset] = useErrorBoundary();
  const { path } = useLocation();

  useEffect(() => {
    if (error) reset();
  }, [path]);

  if (!error) return <>{children}</>;

  return (
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Something went wrong</h1>
      <p class="text-gray-600 mb-4">This page couldn't be shown.</p>
      <button type="button" class="underline cursor-pointer" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}
