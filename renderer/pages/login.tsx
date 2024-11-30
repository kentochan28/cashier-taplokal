
import Image from 'next/image'
import LoginForm from '../components/LoginForm';

const page = () => {

  return (
    <div className='fixed inset-0 top-0 left-0 w-full flex flex-col items-center justify-center h-screen bg-foreground'>
      <Image src='/images/icon.png' alt='logo' width={180} height={180} className="absolute top-0 left-0 p-4 drop-shadow-lg" />
      <LoginForm />
    </div>
  )
}

export default page