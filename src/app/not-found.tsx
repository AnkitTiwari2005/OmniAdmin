// force-dynamic prevents Next.js from prerendering /_not-found at build time,
// which avoids the React useState SSR issue with the shared chunk.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: 'hsl(224, 71%, 3.5%)',
          color: 'hsl(210, 40%, 98%)',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient orbs */}
          <div
            style={{
              position: 'absolute',
              top: '-6rem',
              right: '-6rem',
              width: '24rem',
              height: '24rem',
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.12)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6rem',
              left: '-4rem',
              width: '20rem',
              height: '20rem',
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.08)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '2.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1.5rem',
              backdropFilter: 'blur(16px)',
              maxWidth: '28rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '5rem',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                margin: 0,
              }}
            >
              404
            </div>
            <p
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                margin: 0,
                color: 'hsl(210, 40%, 98%)',
              }}
            >
              Page Not Found
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                margin: 0,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6,
              }}
            >
              The page you're looking for doesn't exist or has been moved.
            </p>
            <a
              href="/"
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem 1.5rem',
                background: 'hsl(210, 40%, 98%)',
                color: 'hsl(222, 47%, 11%)',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'opacity 0.2s',
              }}
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
