import { auth } from '@clerk/nextjs/server';
import { Calendar, CheckCircle2, ClipboardList, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getDailyLogsAction } from '@/actions/daily-logs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function getStatusBadge(status: string) {
  const variants = {
    PENDING: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Pending',
    },
    PENDING_APPROVAL: {
      variant: 'default' as const,
      icon: Clock,
      label: 'Pending Review',
    },
    APPROVED: {
      variant: 'outline' as const,
      icon: CheckCircle2,
      label: 'Approved',
    },
    REJECTED: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Rejected',
    },
  };

  const config = variants[status as keyof typeof variants] || variants.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className='gap-1'>
      <Icon className='h-3 w-3' />
      {config.label}
    </Badge>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EmptyState() {
  return (
    <div className='flex flex-col items-center justify-center rounded-lg border bg-card py-16'>
      <ClipboardList className='h-16 w-16 text-muted-foreground/40' />
      <h3 className='mt-4 font-semibold text-lg'>No pending tasks</h3>
      <p className='mt-2 text-center text-muted-foreground text-sm'>
        All daily logs for the organization are currently approved.
      </p>
    </div>
  );
}

export default async function OrgTasksPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect('/login');
  }

  // Get all logs for the organization
  const allLogs = await getDailyLogsAction();

  // Filter for pending task states (everything except APPROVED)
  const pendingLogs = allLogs.filter((log) => log.status !== 'APPROVED');

  // Calculate stats
  const stats = {
    total: pendingLogs.length,
    pending: pendingLogs.filter((l) => l.status === 'PENDING').length,
    pendingReview: pendingLogs.filter((l) => l.status === 'PENDING_APPROVAL').length,
    rejected: pendingLogs.filter((l) => l.status === 'REJECTED').length,
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-bold text-3xl tracking-tight'>Organization Tasks</h1>
        <p className='mt-2 text-muted-foreground'>
          View all pending, review-requested, and rejected logs for the entire organization
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <div className='rounded-lg border bg-card p-4'>
          <p className='font-medium text-muted-foreground text-sm'>
            Total Pending
          </p>
          <p className='mt-2 font-bold text-2xl'>{stats.total}</p>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <p className='font-medium text-muted-foreground text-sm'>Pending Fill</p>
          <p className='mt-2 font-bold text-2xl text-orange-500'>
            {stats.pending}
          </p>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <p className='font-medium text-muted-foreground text-sm'>Pending Review</p>
          <p className='mt-2 font-bold text-2xl text-blue-500'>
            {stats.pendingReview}
          </p>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <p className='font-medium text-muted-foreground text-sm'>Rejected</p>
          <p className='mt-2 font-bold text-2xl text-red-500'>
            {stats.rejected}
          </p>
        </div>
      </div>

      {pendingLogs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className='rounded-lg border bg-card'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingLogs.map((log) => {
                const totalTasks = Object.keys(log.tasks).length;
                const completedTasks = Object.values(log.tasks).filter(
                  Boolean
                ).length;

                return (
                  <TableRow key={log.id} className='cursor-pointer'>
                    <TableCell className='font-medium'>
                      <Link
                        href={`/tasks/${log.id}`}
                        className='flex items-center gap-2 hover:underline'
                      >
                        <Calendar className='h-4 w-4 text-muted-foreground' />
                        {formatDate(log.log_date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tasks/${log.id}`}
                        className='hover:underline'
                      >
                        {log.template_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        {log.template_category ? (
                          <Badge variant='outline'>
                            {log.template_category}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground text-sm'>
                            —
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        <span className='text-muted-foreground text-sm'>
                          {log.assignee_name || 'Unassigned'}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${log.id}`}>
                        {getStatusBadge(log.status)}
                      </Link>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Link
                        href={`/tasks/${log.id}`}
                        className='hover:underline'
                      >
                        <span className='text-sm'>
                          {completedTasks}/{totalTasks}
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
