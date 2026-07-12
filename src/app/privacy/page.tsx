import React from 'react';
import { ShieldAlert, Key, Eye, Lock, FileSignature, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | SAMS LLC Oman',
  description: 'Official privacy policy of SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS) in compliance with Oman PDPL Royal Decree No. 6/2021.',
};

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24 pt-20">
      {/* Hero Header */}
      <div className="bg-navy text-white py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-fire/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
              Data Protection
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-light max-w-xl mx-auto leading-relaxed">
            Data Privacy Standards under Sultanate of Oman Royal Decree No. 6/2021 (PDPL)
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        {/* Intro Alert Box */}
        <div className="bg-light-grey border-l-4 border-fire p-6 rounded-r-2xl mb-12 space-y-2 text-xs sm:text-sm text-gray-650 leading-relaxed font-light">
          <p>
            <strong>SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS)</strong> is committed to preserving the privacy, confidentiality, and integrity of your personal and commercial data. 
          </p>
          <p>
            This Policy sets out how we collect, process, secure, and manage your data in compliance with the **Oman Personal Data Protection Law (PDPL)** promulgated by **Royal Decree No. 6/2021**.
          </p>
        </div>

        {/* Legal Content Sections */}
        <div className="space-y-12 text-gray-700 leading-relaxed font-light text-sm sm:text-base">

          {/* Section 1 */}
          <section id="priv-sec-1" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">1.</span> Personal Data Collected
            </h2>
            <p>
              When you submit a quotation enquiry, complete a purchase, or communicate with our representatives, SAMS collects specific categories of personal data necessary to execute services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Identifiable Information:</strong> Full name, company name, commercial registration (CR) number (if applicable).
              </li>
              <li>
                <strong>Contact Information:</strong> Active phone number (mobile/WhatsApp), email address.
              </li>
              <li>
                <strong>Delivery & Logistics Data:</strong> Complete shipping address (Governorate, City, Way number, House/Office block).
              </li>
              <li>
                <strong>Transaction Details:</strong> Cart items snapshot, quantity selected, total quote amount, and transaction status. We do not store full credit card numbers; payment data is securely processed directly by our payment gateway, <strong>Paymob</strong>.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="priv-sec-2" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">2.</span> Purpose and Lawful Basis for Processing
            </h2>
            <p>
              Under Article 11 of the Oman PDPL, data processing is only permitted under clear lawful conditions. SAMS processes your data on the following bases:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contractual Necessity:</strong> To generate custom pricing quotes, register enquiries in our sales portal, deliver safety products via local couriers, and complete secure card transactions.
              </li>
              <li>
                <strong>Legal Compliance:</strong> To issue formal tax invoices matching commercial accounting requirements enforced by the Oman Tax Authority.
              </li>
              <li>
                <strong>Consent:</strong> When you voluntarily submit the safety Enquiry form, request product placement advice, or initiate a WhatsApp consultation.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="priv-sec-3" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">3.</span> Data Subject Rights under Oman PDPL
            </h2>
            <p>
              Royal Decree No. 6/2021 grants Omani citizens and residents specific statutory rights regarding their personal data. SAMS fully respects and provides execution mechanisms for these rights:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Right to Withdraw Consent:</strong> You have the right to revoke your consent for processing at any time by contacting our support team.
              </li>
              <li>
                <strong>Right to Access & Copy:</strong> You have the right to request a copy of the personal data SAMS holds about you.
              </li>
              <li>
                <strong>Right to Rectification:</strong> You may request the immediate correction of inaccurate or incomplete personal data.
              </li>
              <li>
                <strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> You may request that SAMS delete your personal data when it is no longer required for the purpose it was collected, subject to statutory tax and financial retention laws.
              </li>
              <li>
                <strong>Right to Object:</strong> You can object to data processing for direct marketing or promotional communication.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="priv-sec-4" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">4.</span> Data Security & Storage
            </h2>
            <p>
              SAMS implements strict technical, administrative, and physical security measures to safeguard against unauthorized access, deletion, disclosure, or modification of client files:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                All local data communication is encrypted using industry-standard SSL/TLS protocols.
              </li>
              <li>
                Client databases (stored fallback on client localStorage or structured tables in Supabase) are subject to Row Level Security (RLS) policies, allowing access only to authenticated admin personnel.
              </li>
              <li>
                Payment transactions are processed entirely in an PCI-DSS compliant environment hosted by Paymob. SAMS staff have no access to card details.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="priv-sec-5" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">5.</span> Data Sharing & Third-Party Disclosure
            </h2>
            <p>
              SAMS does not sell, lease, or rent customer personal data. We only share information with third parties strictly necessary for business operations:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Logistics Providers:</strong> Sharing name, phone, and delivery address with courier services in Oman to execute shipping.
              </li>
              <li>
                <strong>Payment Processor (Paymob):</strong> Safely sharing billing and order amounts for card validation.
              </li>
              <li>
                <strong>Judicial Authorities:</strong> Disclosure will only occur if officially requested by Omani courts or Royal Oman Police (ROP) under valid warrants.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="priv-sec-6" className="space-y-4">
            <h2 className="font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2">
              <span className="text-fire">6.</span> Updates to this Policy
            </h2>
            <p>
              SAMS reserves the right to modify this Privacy Policy periodically to reflect shifts in technology, database infrastructure, or changes in Omani ministerial decisions regarding Royal Decree 6/2021. Any modifications will be posted directly on this page with an updated revision date.
            </p>
          </section>

          {/* Contact details */}
          <div className="bg-light-grey p-8 rounded-2xl border border-gray-150 space-y-4 mt-8">
            <h3 className="font-display text-lg uppercase font-bold text-navy flex items-center gap-2">
              <Eye className="w-5 h-5 text-fire shrink-0" />
              Privacy Officer Contacts
            </h3>
            <p className="text-xs sm:text-sm text-gray-550 leading-relaxed font-light">
              To exercise your rights under the Oman Personal Data Protection Law (PDPL), submit access or deletion requests, or inquire about our data handling, please contact SAMS Data Protection Officer:
            </p>
            <div className="pt-2 text-xs sm:text-sm space-y-1 font-semibold text-navy">
              <p>Email: <a href="mailto:info@samsoman.com" className="text-fire hover:underline">info@samsoman.com</a></p>
              <p>Phone: +968 77554070</p>
              <p>Address: Swift Advanced Management Solutions LLC, Ruwi, Muscat, Oman</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
