import '../../../public/assets/scss/app.scss'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import I18NextProvider from "@/Helper/I18NextContext/I18NextProvider"
import TanstackWrapper from "@/Layout/TanstackWrapper"
import { cache } from 'react'

const getSettings = cache(async () => {
  return await fetch(`${process.env.API_PROD_URL}settings`, { next: { revalidate: 3600 } }).then((res) => res.json()).catch((err) => {
    console.log("Metadata fetch error:", err);
    return null;
  })
})

export async function generateMetadata() {
  // fetch data
  const settingData = await getSettings();
  return {
    metadataBase: new URL('http://localhost:3000'),
    title: settingData?.values?.general?.site_title || "mStore Admin",
    description: settingData?.values?.general?.site_tagline || "mStore Admin Panel",
    icons: {
      icon: settingData?.values?.general?.favicon_image?.original_url,
    },
  }
}

export default function RootLayout({ children, params: { lng } }) {
  return (
    <html lang={lng}>
      <head>
        {/* Preconnect for faster Google Fonts resolution */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <I18NextProvider>
          <TanstackWrapper>{children}</TanstackWrapper>
        </I18NextProvider>
        <ToastContainer theme="colored" />
      </body>
    </html>
  )
}
