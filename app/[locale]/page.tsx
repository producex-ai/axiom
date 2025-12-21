import Footer from "@/components/Footer";
import {
  CTASection,
  CustomerSection,
  HeroSection,
  MetricsSection,
  PositioningSection,
  ProblemSection,
  SolutionSection,
} from "@/components/home";
import Navigation from "@/components/Navigation";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <MetricsSection />
      <CustomerSection />
      <PositioningSection />
      <CTASection />
      <Footer />
    </main>
  );
}
