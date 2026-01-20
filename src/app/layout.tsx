import type { Metadata } from 'next';
import { Space_Grotesk, Work_Sans } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = Work_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ePowWeb | Smart Meter Data Toolkit',
  description:
    'A modern Next.js experience for the KIT Campus North power grid and weather datasets.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
