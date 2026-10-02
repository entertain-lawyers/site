'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an API route or just console
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>New Post Page Error: {error.message}</h2>
      <pre>{error.stack}</pre>
    </div>
  );
}
