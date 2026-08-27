import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Royal Duke Cyber Range | Auburn AIS',
  description: 'An interactive cyber-physical mission showing how enterprise compromise can propagate into industrial operations.',
  openGraph: {
    title: 'Royal Duke Cyber Range',
    description: 'When the Brainstem Bleeds.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Royal Duke Cyber Range — When the Brainstem Bleeds' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Royal Duke Cyber Range',
    description: 'When the Brainstem Bleeds.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
