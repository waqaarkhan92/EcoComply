import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Oblicore - Environmental Compliance Management',
  description: 'Compliance Management SaaS for Environmental Permits',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate text-charcoal`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
