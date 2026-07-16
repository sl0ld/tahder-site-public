import '../styles.css';
import '../tools.css';
import '../review.css';
import '../admin.css';
import '../dashboard.css';

export const metadata = {
  title: 'تحضيري',
  description: 'مساعد المعلم الذكي داخل منصة مدرستي',
  icons: {
    icon: [
      { url: '/assets/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
