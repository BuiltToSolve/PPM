import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Petrol Pump Manager',
  description: 'Manage daily operations, sales, operators and fuel rates',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Navbar />
      </body>
    </html>
  );
}
