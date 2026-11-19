import "./globals.css";
import { Manrope } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "./components/ui";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "Sutura — wallets, merchant payments and cash agents",
    template: "%s · Sutura",
  },
  description:
    "Sutura moves money between customer wallets, merchants and cash agents on a double-entry ledger, with tools for developers and operations staff.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem("sutura_theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme="auto";}catch(e){document.documentElement.dataset.theme="auto";}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable} data-theme="auto" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
