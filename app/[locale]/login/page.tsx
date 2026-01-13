import { redirect } from "next/navigation";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const { redirect: redirectUrl } = await searchParams;

  // Build the sign-in URL with redirect parameter if provided
  const signInPath = redirectUrl
    ? `/${locale}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : `/${locale}/sign-in`;

  redirect(signInPath);
}
