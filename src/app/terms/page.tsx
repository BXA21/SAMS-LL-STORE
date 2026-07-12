import React from 'react';
import Link from 'next/link';
import { Shield, FileText, Calendar, Scale, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions | SAMS LLC Oman',
  description: 'Official terms of service and commercial policies of SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS) in Oman.',
};

export default function TermsPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24 pt-20">
      {/* Hero Header */}
      <div className="bg-navy text-white py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-fire/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
              Legal Framework
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-light max-w-xl mx-auto leading-relaxed">
            Commercial and Electronic Agreements of Swift Advanced Management Solutions LLC (SAMS)
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        {/* Document Metadata Card */}
        <div className="bg-light-grey p-6 rounded-2xl border border-gray-150 mb-12 flex flex-wrap gap-6 items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-fire" />
            <span>Effective Date: July 4, 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-fire" />
            <span>Registered LLC, Muscat, Oman</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-fire" />
            <span>Governing Law: Sultanate of Oman</span>
          </div>
        </div>

        {/* Legal Content */}
        <div className="space-y-12 text-gray-700 leading-relaxed font-light text-sm sm:text-base">
          
          {/* Section 1 */}
          <section id="legal-sec-1" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">1.</span> Acceptance of Terms and Corporate Identity
            </h2>
            <p>
              This User Agreement and Commercial Terms (hereinafter referred to as the <strong>&quot;Agreement&quot;</strong>) constitute a legally binding electronic contract between you (whether as an individual customer or corporate entity, hereinafter <strong>&quot;Client&quot;</strong> or <strong>&quot;You&quot;</strong>) and <strong>SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC</strong>, a limited liability company registered under the laws of the Sultanate of Oman (hereinafter referred to as <strong>&quot;SAMS&quot;</strong>, <strong>&quot;We&quot;</strong>, or <strong>&quot;Us&quot;</strong>).
            </p>
            <p>
              By accessing, browsing, interacting with, or purchasing safety solutions from this e-commerce portal, you acknowledge that you have read, understood, and unconditionally agree to be bound by this Agreement. If you do not agree to these terms, you must immediately cease all interactions with this portal.
            </p>
          </section>

          {/* Section 2 */}
          <section id="legal-sec-2" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">2.</span> Electronic Contracting & Transactions
            </h2>
            <p>
              In accordance with the <strong>Oman Electronic Transactions Law</strong> promulgated by <strong>Royal Decree No. 69/2008</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Your electronic consent, checkout submissions, and confirmation actions on this portal represent legal declarations of intent to contract.
              </li>
              <li>
                Invoice documents and sales quotes generated via our online portal or sent via official emails (ending in `@samsoman.com`) carry full commercial validity under Omani civil and commercial courts.
              </li>
              <li>
                Online card transactions are validated securely via <strong>Paymob</strong>, SAMS&apos;s authorized third-party transaction processor, operating under local central bank compliance standards.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="legal-sec-3" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">3.</span> Consumer Protection Compliance
            </h2>
            <p>
              SAMS complies fully with the <strong>Oman Consumer Protection Law</strong> promulgated by <strong>Royal Decree No. 66/2014</strong> and its executive regulations. Clients have the right to accurate, transparent pricing, quality certification, and fair exchange or refund parameters:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Product Description:</strong> SAMS guarantees that all extinguishing balls and decorative flower pots sold on this site are genuine, imported safety solutions meeting national civil defense specifications.
              </li>
              <li>
                <strong>Pricing Transparency:</strong> Product selling prices are clearly indicated in Omani Rials (OMR). Quotations requested via the Enquiry portal are valid for fourteen (14) calendar days from issuance.
              </li>
              <li>
                <strong>Return & Exchange Policy:</strong> Under Article 22 of Royal Decree No. 66/2014, consumers have the right to replace or return a product within fifteen (15) days of purchase if the product contains a factory defect or fails to meet the approved standard, provided it remains in its original packaging and has not been deployed, activated, or damaged.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="legal-sec-4" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">4.</span> Technical Specifications & Safety Lifespan
            </h2>
            <p>
              Our automatic fire safety products (specifically GFO and AFO automatic suppression balls and decorative flower pots) are built around dry chemical safety agents. Clients must note the following:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Self-Activation:</strong> These devices activate automatically upon direct contact with open flames (3-5 seconds response). They do not trigger by heat alone.
              </li>
              <li>
                <strong>Service Life:</strong> Products are warrantied for a active lifespan of <strong>five (5) years</strong> from the date of manufacture. No refilling, hydrostatic testing, or active maintenance is required during this 5-year period.
              </li>
              <li>
                <strong>Placement Instructions:</strong> Optimal safety coverage depends on correct mounting, height, and proximity to fire risks (e.g. electrical switchboards, engine cabins, reception counters). SAMS representatives provide recommendations, but the client retains final accountability for placement.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="legal-sec-5" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">5.</span> Disclaimer of Liability & Safety Notice
            </h2>
            <p>
              <strong>IMPORTANT LEGAL NOTICE:</strong> While GFO and AFO automatic fire safety devices are highly effective at suppressing fires at their starting stage and preventing rapid spread, they are designed as <em>supplementary safety aids</em>.
            </p>
            <p>
              They are not intended to replace mandatory commercial fire protection systems, alarm networks, or standard civil defense procedures mandated by Omani authorities. SAMS accepts no liability for property damage, bodily injuries, or direct or indirect losses arising from the failure of a fire to activate the ball (e.g. due to incorrect placement, shielding from flames, or extreme environmental parameters).
            </p>
          </section>

          {/* Section 6 */}
          <section id="legal-sec-6" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">6.</span> Governing Law and Disputes
            </h2>
            <p>
              This Agreement, its interpretation, and all commercial transactions conducted through this portal shall be governed exclusively by the laws, decrees, and ministerial decisions in force in the <strong>Sultanate of Oman</strong>.
            </p>
            <p>
              Any disputes, controversies, or claims arising out of or relating to your use of this website, product purchases, or enquiries shall be referred exclusively to the competent courts of <strong>Muscat, Sultanate of Oman</strong>.
            </p>
          </section>

          {/* Contact Section */}
          <div className="bg-light-grey p-8 rounded-2xl border border-gray-150 space-y-4 mt-8">
            <h3 className="font-display text-lg uppercase font-bold text-navy flex items-center gap-2">
              <FileText className="w-5 h-5 text-fire shrink-0" />
              Legal Enquiries
            </h3>
            <p className="text-xs sm:text-sm text-gray-550 leading-relaxed font-light">
              For any questions regarding commercial compliance, Royal Decrees, product certification copies, or general corporate terms, please reach out to our legal compliance officer:
            </p>
            <div className="pt-2 text-xs sm:text-sm space-y-1 font-semibold text-navy">
              <p>Email: <a href="mailto:info@samsoman.com" className="text-fire hover:underline">info@samsoman.com</a></p>
              <p>Corporate Line: +968 77554070</p>
              <p>Office Address: Unit No. 2, Al Shumoor Building, Way no 2706, CBD, Ruwi, Muscat, Sultanate of Oman</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
