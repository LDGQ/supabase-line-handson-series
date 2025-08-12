// ハンズオン1-2: Next.js プロジェクトの基本レイアウト
// Vercel デプロイ対応の LIFF × Supabase アプリケーション
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LIFF × Supabase App',
  description: 'LIFF and Supabase integration example',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
