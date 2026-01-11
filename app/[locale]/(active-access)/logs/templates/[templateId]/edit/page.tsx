import { auth } from '@clerk/nextjs/server';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLogTemplateByIdAction } from '@/actions/log-templates';
import { Button } from '@/components/ui/button';
import { getEnabledModules } from '@/lib/primus/db-helper';
import { LogTemplateForm } from '../../_components/log-template-form';

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { templateId } = await params;
  const template = await getLogTemplateByIdAction(templateId);

  if (!template) {
    notFound();
  }

  const { orgId } = await auth();
  const enabledModules = orgId
    ? await getEnabledModules(orgId, 'primus_gfs')
    : [];

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
            Edit Log Template
          </h1>
          <div className='mt-1 flex items-center gap-2 text-muted-foreground text-sm'>
            <p>Update your log template details and tasks.</p>
            {template.due_date && (
              <>
                <span>•</span>
                <span className='flex items-center gap-1'>
                  <Calendar className='h-3 w-3' />
                  Due {new Date(template.due_date).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <LogTemplateForm
        mode='edit'
        enabledModules={enabledModules}
        initialData={{
          id: template.id,
          name: template.name,
          category: template.category,
          sop: template.sop,
          task_list: template.task_list,
          review_time: template.review_time,
        }}
      />
    </div>
  );
}
