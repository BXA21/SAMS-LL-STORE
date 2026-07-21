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
import { dbService } from "@/services/dbService";
import type { Product, Testimonial, FAQ } from "@/types/database";

/*
 * The home page loads its content on the server so the products,
 * testimonials and FAQ are present in the delivered HTML. Previously every
 * one of these sections fetched after hydration, leaving visitors without
 * working JavaScript on an effectively empty page.
 */
export default async function Home() {
  let products: Product[] = [];
  let testimonials: Testimonial[] = [];
  let faqs: FAQ[] = [];

  try {
    [products, testimonials, faqs] = await Promise.all([
      dbService.getProducts(),
      dbService.getTestimonials(),
      dbService.getFAQs(),
    ]);
  } catch (error) {
    // Each section refreshes on mount, so this degrades rather than failing.
    console.error("Home: failed to load content on the server", error);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <Hero />

      {/* Statistics Section */}
      <Statistics />

      {/* 2. Product Catalog Preview (Our SAMS Solutions) */}
      <CatalogPreview initialProducts={products.slice(0, 6)} />

      {/* 3. About SAMS Section */}
      <AboutSAMS />

      {/* 4. Mission & Vision Section */}
      <MissionVision />

      {/* 5. Usage Areas Section (Versatile Placements) */}
      <UsageAreas />

      {/* 6. How Our Products Make a Difference / Benefits */}
      <Benefits />



      {/* 8. Testimonials Section */}
      <Testimonials initialTestimonials={testimonials} />

      {/* 10. FAQ Section */}
      <FAQComponent initialFaqs={faqs} />

      {/* 11. Final CTA Section */}
      <FinalCTA />
    </div>
  );
}

