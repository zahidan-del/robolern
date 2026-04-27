import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RoboLearn — Platform E-Learning Robotika',
  description: 'Platform e-learning robotika terbaik untuk SD, SMP, SMA/SMK, dan Kuliah',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
