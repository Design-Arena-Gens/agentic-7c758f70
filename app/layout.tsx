import type { Metadata } from 'next';
import { Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'جدول المهام اليومية',
  description: 'منصة بسيطة لإدارة ومتابعة المهام اليومية بطريقة منظمة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${notoNaskh.className} bg-slate-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
