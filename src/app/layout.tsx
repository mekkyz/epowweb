import type { Metadata } from 'next';
import { Google_Sans_Flex, Work_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui';
import { WebGLErrorSuppressor } from '@/components/WebGLErrorSuppressor';
import { ThemeProvider } from '@/context/ThemeProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { getSession } from '@/lib/auth';
import RolePreview from '@/components/RolePreview';

const display = Google_Sans_Flex({
  variable: '--font-display',
  subsets: ['latin'],
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: false,
});

const sans = Work_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'eASiMOV - ePowWeb - ePowMon | KIT Campus North Power Grid Monitoring',
  description:
    'KIT Campus North power grid datasets.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const user = session ? { username: session.username, role: session.role, name: session.name } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var patterns = ['maxTextureDimension2D', 'WebGL', 'luma.gl', 'Cannot read properties of undefined'];
                var origError = window.onerror;
                window.onerror = function(msg) {
                  if (patterns.some(function(p) { return String(msg).indexOf(p) !== -1; })) {
                    return true;
                  }
                  return origError ? origError.apply(this, arguments) : false;
                };
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
                  if (patterns.some(function(p) { return msg.indexOf(p) !== -1; })) {
                    e.preventDefault();
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <WebGLErrorSuppressor />
        <ThemeProvider>
          <AuthProvider user={user}>
            <ToastProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              {process.env.NODE_ENV === 'development' && <RolePreview />}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
