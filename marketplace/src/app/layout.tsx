import type { Metadata } from 'next'
import { Public_Sans, Source_Serif_4 } from 'next/font/google'
import { MarketHeader } from '@/components/MarketHeader'
import './globals.css'

const sans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'AMP Marketplace',
  description: 'Free and paid themes/plugins for AMP desktop.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <MarketHeader />
        <div className="shell">{children}</div>
      </body>
    </html>
  )
}
