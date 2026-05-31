import { Inter, Cormorant_Garamond } from 'next/font/google';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export default function EspyralLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${cormorant.variable}`}>
      {children}
    </div>
  );
}
