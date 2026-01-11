import { auth } from '@clerk/nextjs/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getEnabledModules } from '@/lib/primus/db-helper';
import { LogTemplateForm } from '../_components/log-template-form';

export default async function CreateTemplatePage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect('/sign-in');
  }

  const enabledModules = await getEnabledModules(orgId, 'primus_gfs');

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' asChild>
          <Link href='/logs/templates'>
            <ArrowLeft className='h-4 w-4' />
          </Link>
        </Button>
        <div>
          <h1 className='font-bold text-2xl tracking-tight'>
            Create Log Template
          </h1>
          <p className='text-muted-foreground'>
            Define a new template for your daily logs.
          </p>
        </div>
      </div>

      <LogTemplateForm mode='create' enabledModules={enabledModules} />
    </div>
  );
}
