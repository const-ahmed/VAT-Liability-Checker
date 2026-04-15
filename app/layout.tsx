import type { Metadata } from "next";
import "govuk-frontend/dist/govuk/govuk-frontend.min.css";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://findvat.co.uk"),
  title: {
    default: "VAT Liability Checker",
    template: "%s | VAT Liability Checker",
  },
  description: "Check the VAT liability of a supply under UK law.",
  openGraph: {
    type: "website",
    url: "https://findvat.co.uk",
    title: "VAT Liability Checker",
    description: "Check the VAT liability of a supply under UK law.",
    siteName: "VAT Liability Checker",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 576,
        alt: "VAT Liability Checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VAT Liability Checker",
    description: "Check the VAT liability of a supply under UK law.",
    images: ["/og.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Both classes are required — without them the background, fonts and header break.
    <html lang="en" className="govuk-template">
      <body className="govuk-template__body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
