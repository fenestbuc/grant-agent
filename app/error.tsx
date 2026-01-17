'use client';

/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            }}
          >
            <svg
              style={{
                margin: '0 auto 1rem',
                height: '3rem',
                width: '3rem',
                color: '#ef4444',
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#0f172a',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: '#64748b',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              A critical error occurred. Please try again or return to the home page.
            </p>
            {error.digest && (
              <p
                style={{
                  color: '#94a3b8',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={reset}
                style={{
                  backgroundColor: '#0f172a',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  backgroundColor: 'white',
                  color: '#0f172a',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
