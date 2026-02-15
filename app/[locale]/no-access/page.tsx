import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30">
      <Navigation />

      <main className="flex flex-grow flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>

          <div className="space-y-4">
            <h1 className="font-bold text-4xl text-gray-900 tracking-tight">
              Access Denied
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              It looks like your organization does not have access to Axiom.
              Please contact your administrator or support for more information.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="mailto:support@producex.ai">Contact Support</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
