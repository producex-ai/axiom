import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { checkProductActive } from '@/db/producex/queries';

export default async function AuthCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    redirect('/sign-in');
  }
  if (!orgId) {
    redirect('/no-access');
  }
  const hasAccess = await checkProductActive(orgId);
  if (!hasAccess) {
    redirect('/no-access');
  }

  return <>{children}</>;
}
