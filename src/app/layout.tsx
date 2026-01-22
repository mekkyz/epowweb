import type { Metadata } from 'next';
import { Space_Grotesk, Work_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui';
import { WebGLErrorSuppressor } from '@/components/WebGLErrorSuppressor';
import { ThemeProvider } from '@/context/ThemeProvider';

const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = Work_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ePowWeb | KIT Campus North Power Grid Web-Service',
  description:
    'A KIT Campus North power grid and weather datasets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <ToastProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
