import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import { ToastProvider } from '@/components/toast'
import backgroundImage from './background.png'
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
        {/*
          The pinning lives on this wrapper, not on the image. `fill` sets
          `position: absolute` as an *inline* style, which beats any `fixed`
          class — so a `fixed` image is still absolutely positioned against the
          document and scrolls away with the content, while the tint below
          stays put. Absolute inside a fixed parent gives the intended result.
        */}
        <div className="fixed inset-0 -z-20">
          <Image
            src={backgroundImage}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="fixed inset-0 -z-10 bg-shuttle/70" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
