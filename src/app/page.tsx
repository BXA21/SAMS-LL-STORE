import Hero from "@/components/Hero";
import AboutSAMS from "@/components/AboutSAMS";
import MissionVision from "@/components/MissionVision";
import Benefits from "@/components/Benefits";
import CatalogPreview from "@/components/CatalogPreview";
import UsageAreas from "@/components/UsageAreas";

import Testimonials from "@/components/Testimonials";
import Statistics from "@/components/Statistics";
import FAQComponent from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <Hero />

      {/* Statistics Section */}
      <Statistics />

      {/* 2. Product Catalog Preview (Our SAMS Solutions) */}
      <CatalogPreview />

      {/* 3. About SAMS Section */}
      <AboutSAMS />

      {/* 4. Mission & Vision Section */}
      <MissionVision />

      {/* 5. Usage Areas Section (Versatile Placements) */}
      <UsageAreas />

      {/* 6. How Our Products Make a Difference / Benefits */}
      <Benefits />



      {/* 8. Testimonials Section */}
      <Testimonials />

      {/* 10. FAQ Section */}
      <FAQComponent />

      {/* 11. Final CTA Section */}
      <FinalCTA />
    </div>
  );
}

