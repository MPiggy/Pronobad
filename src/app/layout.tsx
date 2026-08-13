import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pronobad',
  description: 'Interclub badminton predictions for your club',
  applicationName: 'Pronobad',
  appleWebApp: {
    capable: true,
    title: 'Pronobad',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Members zoom to read scores — never disable it.
  maximumScale: 5,
  themeColor: '#15202f',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
