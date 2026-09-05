// force-dynamic prevents Next.js from prerendering /_not-found at build time,
// which avoids the React useState SSR issue with the shared chunk.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fafafa' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: '#374151',
          }}
        >
          <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0, color: '#111827' }}>404</h1>
          <p style={{ fontSize: '1.125rem', margin: 0, color: '#6b7280' }}>Page not found</p>
          <a
            href="/"
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: '#111827',
              color: '#fff',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
