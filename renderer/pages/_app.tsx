import React, { Suspense } from 'react'
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Nav from './Nav'
import { Toaster } from 'react-hot-toast'
import Loading from './loading'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main>
      <Nav />
      <Toaster />
      <Suspense fallback={<Loading/>} >
        <Component {...pageProps} />
      </Suspense>
    </main>
  )
}

export default MyApp
