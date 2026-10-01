import React from 'react';
import type { Metadata } from 'next';
import { Eye } from 'lucide-react';
import { legalMessages } from '@/i18n/messages/legal';
import { localeAlternates, resolveLocale, type LangParams } from '@/i18n/server';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = legalMessages[locale].privacy;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: localeAlternates(locale, '/privacy'),
  };
}

const sectionHeading = 'font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2';
const introBox =
  'bg-light-grey border-s-4 border-fire p-6 rounded-e-2xl mb-12 space-y-2 text-xs sm:text-sm text-gray-650 leading-relaxed font-light';
const body = 'space-y-12 text-gray-700 leading-relaxed font-light text-sm sm:text-base';

/* English policy text — the original. */
function PrivacyEn() {
  return (
    <>
      <div className={introBox}>
        <p>
          <strong>SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS)</strong> is committed to preserving the privacy, confidentiality, and integrity of your personal and commercial data.
        </p>
        <p>
          This Policy sets out how we collect, process, secure, and manage your data in compliance with the <strong>Oman Personal Data Protection Law (PDPL)</strong> promulgated by <strong>Royal Decree No. 6/2021</strong>.
        </p>
      </div>

      <div className={body}>
        <section id="priv-sec-1" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">1.</span> Personal Data Collected
          </h2>
          <p>
            When you submit a quotation enquiry, complete a purchase, or communicate with our representatives, SAMS collects specific categories of personal data necessary to execute services:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong>Identifiable Information:</strong> Full name, company name, commercial registration (CR) number (if applicable).
            </li>
            <li>
              <strong>Contact Information:</strong> Active phone number (mobile/WhatsApp), email address.
            </li>
            <li>
              <strong>Delivery &amp; Logistics Data:</strong> Complete shipping address (Governorate, City, Way number, House/Office block).
            </li>
            <li>
              <strong>Transaction Details:</strong> Cart items snapshot, quantity selected, total quote amount, and transaction status. We do not store full credit card numbers; payment data is securely processed directly by our payment gateway, <strong>Paymob</strong>.
            </li>
          </ul>
        </section>

        <section id="priv-sec-2" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">2.</span> Purpose and Lawful Basis for Processing
          </h2>
          <p>
            Under Article 11 of the Oman PDPL, data processing is only permitted under clear lawful conditions. SAMS processes your data on the following bases:
          </p>
          <ul className="list-disc ps-6 space-y-2">
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

        <section id="priv-sec-3" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">3.</span> Data Subject Rights under Oman PDPL
          </h2>
          <p>
            Royal Decree No. 6/2021 grants Omani citizens and residents specific statutory rights regarding their personal data. SAMS fully respects and provides execution mechanisms for these rights:
          </p>
          <ul className="list-disc ps-6 space-y-3">
            <li>
              <strong>Right to Withdraw Consent:</strong> You have the right to revoke your consent for processing at any time by contacting our support team.
            </li>
            <li>
              <strong>Right to Access &amp; Copy:</strong> You have the right to request a copy of the personal data SAMS holds about you.
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

        <section id="priv-sec-4" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">4.</span> Data Security &amp; Storage
          </h2>
          <p>
            SAMS implements strict technical, administrative, and physical security measures to safeguard against unauthorized access, deletion, disclosure, or modification of client files:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>All local data communication is encrypted using industry-standard SSL/TLS protocols.</li>
            <li>
              Client databases (stored fallback on client localStorage or structured tables in Supabase) are subject to Row Level Security (RLS) policies, allowing access only to authenticated admin personnel.
            </li>
            <li>
              Payment transactions are processed entirely in an PCI-DSS compliant environment hosted by Paymob. SAMS staff have no access to card details.
            </li>
          </ul>
        </section>

        <section id="priv-sec-5" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">5.</span> Data Sharing &amp; Third-Party Disclosure
          </h2>
          <p>
            SAMS does not sell, lease, or rent customer personal data. We only share information with third parties strictly necessary for business operations:
          </p>
          <ul className="list-disc ps-6 space-y-2">
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

        <section id="priv-sec-6" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">6.</span> Updates to this Policy
          </h2>
          <p>
            SAMS reserves the right to modify this Privacy Policy periodically to reflect shifts in technology, database infrastructure, or changes in Omani ministerial decisions regarding Royal Decree 6/2021. Any modifications will be posted directly on this page with an updated revision date.
          </p>
        </section>

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
            <p>Phone: <span dir="ltr">+968 77554070</span></p>
            <p>Address: Swift Advanced Management Solutions LLC, Ruwi, Muscat, Oman</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* الترجمة العربية للسياسة — مطابقة لبنود النص الإنجليزي دون إضافة أو حذف. */
function PrivacyAr() {
  return (
    <>
      <div className={introBox}>
        <p>
          تلتزم <strong>شركة سويفت للحلول الإدارية المتقدمة ش.م.م (SAMS)</strong> (<span dir="ltr">SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC</span>) بالحفاظ على خصوصية بياناتك الشخصية والتجارية وسريتها وسلامتها.
        </p>
        <p>
          توضح هذه السياسة كيفية جمعنا لبياناتك ومعالجتها وتأمينها وإدارتها وفقًا لـ <strong>قانون حماية البيانات الشخصية العُماني</strong> الصادر بـ <strong>المرسوم السلطاني رقم 6/2021</strong>.
        </p>
      </div>

      <div className={body}>
        <section id="priv-sec-1" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">1.</span> البيانات الشخصية التي نجمعها
          </h2>
          <p>
            عند إرسالك طلب عرض سعر، أو إتمامك عملية شراء، أو تواصلك مع ممثلينا، تجمع SAMS فئات محددة من البيانات الشخصية اللازمة لتقديم الخدمات:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong>بيانات التعريف:</strong> الاسم الكامل، واسم الشركة، ورقم السجل التجاري (إن وجد).
            </li>
            <li>
              <strong>بيانات التواصل:</strong> رقم هاتف فعّال (الجوال/واتساب)، والبريد الإلكتروني.
            </li>
            <li>
              <strong>بيانات التوصيل والشحن:</strong> عنوان الشحن الكامل (المحافظة، والمدينة، ورقم الطريق، ورقم المنزل/المكتب).
            </li>
            <li>
              <strong>تفاصيل المعاملة:</strong> بيان بمنتجات السلة، والكمية المختارة، وإجمالي مبلغ العرض، وحالة المعاملة. ولا نخزّن أرقام البطاقات الائتمانية كاملة؛ إذ تُعالج بيانات الدفع بشكل آمن ومباشر عبر بوابة الدفع الخاصة بنا <strong>Paymob</strong>.
            </li>
          </ul>
        </section>

        <section id="priv-sec-2" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">2.</span> الغرض من المعالجة وأساسها القانوني
          </h2>
          <p>
            وفقًا للمادة (11) من قانون حماية البيانات الشخصية العُماني، لا يُسمح بمعالجة البيانات إلا وفق شروط قانونية واضحة. وتعالج SAMS بياناتك استنادًا إلى الأسس التالية:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong>الضرورة التعاقدية:</strong> لإعداد عروض أسعار مخصصة، وتسجيل الاستفسارات في بوابة المبيعات، وتوصيل منتجات السلامة عبر شركات التوصيل المحلية، وإتمام معاملات الدفع بالبطاقة بشكل آمن.
            </li>
            <li>
              <strong>الامتثال القانوني:</strong> لإصدار فواتير ضريبية رسمية مطابقة لمتطلبات المحاسبة التجارية التي يفرضها جهاز الضرائب في سلطنة عُمان.
            </li>
            <li>
              <strong>الموافقة:</strong> عندما ترسل طوعًا نموذج استفسار السلامة، أو تطلب المشورة بشأن أماكن تركيب المنتجات، أو تبدأ استشارة عبر واتساب.
            </li>
          </ul>
        </section>

        <section id="priv-sec-3" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">3.</span> حقوق صاحب البيانات وفقًا لقانون حماية البيانات الشخصية العُماني
          </h2>
          <p>
            يمنح المرسوم السلطاني رقم 6/2021 المواطنين والمقيمين في سلطنة عُمان حقوقًا قانونية محددة فيما يتعلق ببياناتهم الشخصية. وتحترم SAMS هذه الحقوق احترامًا كاملًا وتوفر آليات لممارستها:
          </p>
          <ul className="list-disc ps-6 space-y-3">
            <li>
              <strong>الحق في سحب الموافقة:</strong> يحق لك سحب موافقتك على المعالجة في أي وقت من خلال التواصل مع فريق الدعم لدينا.
            </li>
            <li>
              <strong>الحق في الاطلاع والحصول على نسخة:</strong> يحق لك طلب نسخة من البيانات الشخصية التي تحتفظ بها SAMS عنك.
            </li>
            <li>
              <strong>الحق في التصحيح:</strong> يمكنك طلب التصحيح الفوري للبيانات الشخصية غير الدقيقة أو غير المكتملة.
            </li>
            <li>
              <strong>الحق في المحو (&quot;الحق في النسيان&quot;):</strong> يمكنك أن تطلب من SAMS حذف بياناتك الشخصية عندما لا تعود مطلوبة للغرض الذي جُمعت من أجله، مع مراعاة القوانين النظامية الخاصة بالاحتفاظ بالسجلات الضريبية والمالية.
            </li>
            <li>
              <strong>الحق في الاعتراض:</strong> يمكنك الاعتراض على معالجة بياناتك لأغراض التسويق المباشر أو المراسلات الترويجية.
            </li>
          </ul>
        </section>

        <section id="priv-sec-4" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">4.</span> أمن البيانات وتخزينها
          </h2>
          <p>
            تطبّق SAMS تدابير أمنية تقنية وإدارية ومادية صارمة للحماية من الوصول غير المصرح به إلى ملفات العملاء أو حذفها أو الإفصاح عنها أو تعديلها:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>تُشفَّر جميع اتصالات البيانات المحلية باستخدام بروتوكولات SSL/TLS المعتمدة في هذا المجال.</li>
            <li>
              تخضع قواعد بيانات العملاء (المخزنة احتياطيًا في التخزين المحلي localStorage لدى العميل أو في جداول منظمة على Supabase) لسياسات الأمان على مستوى الصفوف (RLS)، بحيث لا يُسمح بالوصول إليها إلا لموظفي الإدارة الذين تم التحقق من هويتهم.
            </li>
            <li>
              تتم معالجة معاملات الدفع بالكامل في بيئة متوافقة مع معيار PCI-DSS تستضيفها Paymob، ولا يمكن لموظفي SAMS الاطلاع على بيانات البطاقات.
            </li>
          </ul>
        </section>

        <section id="priv-sec-5" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">5.</span> مشاركة البيانات والإفصاح لأطراف ثالثة
          </h2>
          <p>
            لا تبيع SAMS البيانات الشخصية للعملاء ولا تؤجرها. ولا نشارك المعلومات إلا مع الأطراف الثالثة التي تقتضيها عمليات العمل بشكل ضروري:
          </p>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong>مزودو خدمات الشحن:</strong> مشاركة الاسم ورقم الهاتف وعنوان التوصيل مع شركات التوصيل في سلطنة عُمان لتنفيذ الشحن.
            </li>
            <li>
              <strong>معالج الدفع (Paymob):</strong> مشاركة بيانات الفوترة ومبالغ الطلبات بشكل آمن للتحقق من البطاقة.
            </li>
            <li>
              <strong>الجهات القضائية:</strong> لا يتم الإفصاح إلا بناءً على طلب رسمي من المحاكم العُمانية أو شرطة عُمان السلطانية بموجب أوامر قانونية سارية.
            </li>
          </ul>
        </section>

        <section id="priv-sec-6" className="space-y-4">
          <h2 className={sectionHeading}>
            <span className="text-fire">6.</span> تحديثات هذه السياسة
          </h2>
          <p>
            تحتفظ SAMS بالحق في تعديل سياسة الخصوصية هذه من وقت لآخر لتعكس التطورات في التقنية أو البنية التحتية لقواعد البيانات أو أي تغييرات في القرارات الوزارية العُمانية المتعلقة بالمرسوم السلطاني رقم 6/2021. وستُنشر أي تعديلات مباشرة على هذه الصفحة مع تاريخ مراجعة محدّث.
          </p>
        </section>

        <div className="bg-light-grey p-8 rounded-2xl border border-gray-150 space-y-4 mt-8">
          <h3 className="font-display text-lg uppercase font-bold text-navy flex items-center gap-2">
            <Eye className="w-5 h-5 text-fire shrink-0" />
            بيانات التواصل مع مسؤول الخصوصية
          </h3>
          <p className="text-xs sm:text-sm text-gray-550 leading-relaxed font-light">
            لممارسة حقوقك بموجب قانون حماية البيانات الشخصية العُماني، أو لتقديم طلبات الاطلاع أو الحذف، أو للاستفسار عن طريقة تعاملنا مع البيانات، يرجى التواصل مع مسؤول حماية البيانات في SAMS:
          </p>
          <div className="pt-2 text-xs sm:text-sm space-y-1 font-semibold text-navy">
            <p>البريد الإلكتروني: <a href="mailto:info@samsoman.com" className="text-fire hover:underline">info@samsoman.com</a></p>
            <p>الهاتف: <span dir="ltr">+968 77554070</span></p>
            <p>العنوان: شركة سويفت للحلول الإدارية المتقدمة ش.م.م، روي، مسقط، سلطنة عُمان</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function PrivacyPage({ params }: { params: LangParams }) {
  const locale = await resolveLocale(params);
  const t = legalMessages[locale].privacy;

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-24 pt-20">
      {/* Hero Header */}
      <div className="bg-navy text-white py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-fire/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
              {t.eyebrow}
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-300 font-light max-w-xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        {locale === 'ar' ? <PrivacyAr /> : <PrivacyEn />}
      </div>
    </div>
  );
}
