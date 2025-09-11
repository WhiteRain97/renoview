import './globals.css';

export const metadata = {
  title: 'Renoview',
  description: 'Remodel ROI tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
