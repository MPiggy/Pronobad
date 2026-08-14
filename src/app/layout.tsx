import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'BetClichy',
  description: 'Interclub badminton predictions for your club',
  applicationName: 'BetClichy',
  appleWebApp: {
    capable: true,
    title: 'BetClichy',
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
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
