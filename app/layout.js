import { Geist } from 'next/font/google';
import './globals.css';
import Providers from '@/components/shared/Providers';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata = {
  title: 'GymEngine',
  description: 'Gym renewal automation portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
