import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, IBM_Plex_Mono, Playfair_Display } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
})

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "OpenQuill — Personal Finance Without Bank Credentials",
  description: "Open-source personal finance app. Paste your bank statement, get spending categories, debt tracking, and savings goals. No Plaid, no bank login required.",
  manifest: "/manifest.json",
  openGraph: {
    title: "OpenQuill — Personal Finance Without Bank Credentials",
    description: "Paste your bank statement. See where your money goes. No Plaid, no passwords, no credential sharing.",
    type: "website",
    siteName: "OpenQuill",
    url: "https://openquill.vercel.app",
    images: [
      {
        url: "/screenshots/dashboard.png",
        width: 1280,
        height: 800,
        alt: "OpenQuill dashboard showing income, spending, and category breakdown",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenQuill — Personal Finance Without Bank Credentials",
    description: "Paste your bank statement. See where your money goes. No Plaid, no passwords, no credential sharing.",
    images: ["/screenshots/dashboard.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OpenQuill",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF7F2",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bricolageGrotesque.variable} ${ibmPlexMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  )
}
