import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ütopya Yarışması — Jüri Oylama',
  description: 'İstanbul Gelişim Üniversitesi Sağlık Bilimleri Fakültesi Sempozyum III',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
