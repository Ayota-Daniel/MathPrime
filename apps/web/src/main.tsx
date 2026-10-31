import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router, queryClient } from './router';
import { useGame } from './store/game';
import './index.css';

function Root() {
  const hydrate = useGame((s) => s.hydrate);
  const hydrated = useGame((s) => s.hydrated);
  useEffect(() => { void hydrate(); }, [hydrate]);
  if (!hydrated) return null;
  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
