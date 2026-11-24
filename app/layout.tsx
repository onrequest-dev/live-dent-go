import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import RemoveContextMenu from "@/components/removeContexetMenu";
// import Backgroundjob from "@/components/backgroundjob";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "live-dent go",
  description:
    "نظام رقمي متكامل يدير جميع جوانب عيادة الأسنان بكل احترافية وسهولة",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
      </head>
      <body className={inter.className}>
        {children}
        {/* <Backgroundjob /> */}
        {/* <RemoveContextMenu /> */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('SW registered:', registration);
                    
                    // ✅ إضافة هذا الجزء لإجبار التفعيل الفوري
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    
                    registration.onupdatefound = () => {
                      const installingWorker = registration.installing;
                      if (installingWorker == null) return;
                      
                      installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                          if (navigator.serviceWorker.controller) {
                            // نسخة جديدة جاهزة، يمكن إخبار المستخدم هنا
                            console.log('New content is available; please refresh.');
                          } else {
                            console.log('Content is cached for offline use.');
                          }
                        }
                      };
                    };
                  })
                  .catch(error => {
                    console.error('SW registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
