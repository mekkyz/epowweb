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

const display = Google_Sans_Flex({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = Work_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'eASiMOV - ePowWeb - SMDT | KIT Campus North Power Grid Web-Service',
  description:
    'A KIT Campus North power grid and weather datasets.',
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
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
