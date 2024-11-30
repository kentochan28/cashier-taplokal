"use client"
import React from 'react'
import Lottie from 'lottie-react'
import loader from '../public/json/loader.json'

const Loading = () => {
  return (
    <div className='fixed top-0 left-0 w-full h-full flex justify-center items-center bg-white z-50'>
    <Lottie
      animationData={loader}
      loop={true}
    />
  </div>
  )
}

export default Loading