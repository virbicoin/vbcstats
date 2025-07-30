import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/header'
import Footer from '@/components/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VBC Network Stats',
  description: 'Real-time VirBiCoin network statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-gray-900">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}