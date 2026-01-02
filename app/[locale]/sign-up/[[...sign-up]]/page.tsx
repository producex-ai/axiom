import { SignUp } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';
import Navigation from '@/components/Navigation';

export default async function SignUpPage() {
  const t = await getTranslations('login');

  return (
    <div className='min-h-screen bg-white'>
      <Navigation />
      <div className='flex' style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Left side - Produce Supply Image */}
        <div className='relative hidden lg:flex lg:w-1/2'>
          <div className='absolute inset-0 z-10 bg-gradient-to-br from-emerald-600/20 to-emerald-800/40' />
          <img
            src='https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
            alt={t('page.imageAlt')}
            className='h-full w-full object-cover'
          />
          <div className='absolute inset-0 z-20 flex items-end p-12'>
            <div className='text-white'>
              <h2 className='mb-4 font-bold text-3xl'>{t('hero.headline')}</h2>
              <p className='text-lg opacity-90'>{t('hero.description')}</p>
            </div>
          </div>
        </div>

        {/* Right side - Clerk Sign Up */}
        <div className='flex w-full items-center justify-center bg-muted/30 p-8 lg:w-1/2'>
          <div className='w-full max-w-md'>
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-lg border-0',
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
