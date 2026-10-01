import React from 'react';
import type { Metadata } from 'next';
import { Shield, FileText, Calendar, Scale } from 'lucide-react';
import { legalMessages } from '@/i18n/messages/legal';
import { localeAlternates, resolveLocale, type LangParams } from '@/i18n/server';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = legalMessages[locale].terms;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: localeAlternates(locale, '/terms'),
  };
}

const sectionHeading = 'font-display text-xl sm:text-2xl uppercase font-bold text-navy flex items-center gap-2';

/* English legal text — the original agreement. */
function TermsEn() {
  return (
    <>
      <section id="legal-sec-1" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">1.</span> Acceptance of Terms and Corporate Identity
        </h2>
        <p>
          This User Agreement and Commercial Terms (hereinafter referred to as the <strong>&quot;Agreement&quot;</strong>) constitute a legally binding electronic contract between you (whether as an individual customer or corporate entity, hereinafter <strong>&quot;Client&quot;</strong> or <strong>&quot;You&quot;</strong>) and <strong>SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC</strong>, a limited liability company registered under the laws of the Sultanate of Oman (hereinafter referred to as <strong>&quot;SAMS&quot;</strong>, <strong>&quot;We&quot;</strong>, or <strong>&quot;Us&quot;</strong>).
        </p>
        <p>
          By accessing, browsing, interacting with, or purchasing safety solutions from this e-commerce portal, you acknowledge that you have read, understood, and unconditionally agree to be bound by this Agreement. If you do not agree to these terms, you must immediately cease all interactions with this portal.
        </p>
      </section>

      <section id="legal-sec-2" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">2.</span> Electronic Contracting &amp; Transactions
        </h2>
        <p>
          In accordance with the <strong>Oman Electronic Transactions Law</strong> promulgated by <strong>Royal Decree No. 69/2008</strong>:
        </p>
        <ul className="list-disc ps-6 space-y-2">
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

      <section id="legal-sec-3" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">3.</span> Consumer Protection Compliance
        </h2>
        <p>
          SAMS complies fully with the <strong>Oman Consumer Protection Law</strong> promulgated by <strong>Royal Decree No. 66/2014</strong> and its executive regulations. Clients have the right to accurate, transparent pricing, quality certification, and fair exchange or refund parameters:
        </p>
        <ul className="list-disc ps-6 space-y-2">
          <li>
            <strong>Product Description:</strong> SAMS guarantees that all extinguishing balls and decorative flower pots sold on this site are genuine, imported safety solutions meeting national civil defense specifications.
          </li>
          <li>
            <strong>Pricing Transparency:</strong> Product selling prices are clearly indicated in Omani Rials (OMR). Quotations requested via the Enquiry portal are valid for fourteen (14) calendar days from issuance.
          </li>
          <li>
            <strong>Return &amp; Exchange Policy:</strong> Under Article 22 of Royal Decree No. 66/2014, consumers have the right to replace or return a product within fifteen (15) days of purchase if the product contains a factory defect or fails to meet the approved standard, provided it remains in its original packaging and has not been deployed, activated, or damaged.
          </li>
        </ul>
      </section>

      <section id="legal-sec-4" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">4.</span> Technical Specifications &amp; Safety Lifespan
        </h2>
        <p>
          Our automatic fire safety products (specifically GFO and AFO automatic suppression balls and decorative flower pots) are built around dry chemical safety agents. Clients must note the following:
        </p>
        <ul className="list-disc ps-6 space-y-2">
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

      <section id="legal-sec-5" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">5.</span> Disclaimer of Liability &amp; Safety Notice
        </h2>
        <p>
          <strong>IMPORTANT LEGAL NOTICE:</strong> While GFO and AFO automatic fire safety devices are highly effective at suppressing fires at their starting stage and preventing rapid spread, they are designed as <em>supplementary safety aids</em>.
        </p>
        <p>
          They are not intended to replace mandatory commercial fire protection systems, alarm networks, or standard civil defense procedures mandated by Omani authorities. SAMS accepts no liability for property damage, bodily injuries, or direct or indirect losses arising from the failure of a fire to activate the ball (e.g. due to incorrect placement, shielding from flames, or extreme environmental parameters).
        </p>
      </section>

      <section id="legal-sec-6" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">6.</span> Governing Law and Disputes
        </h2>
        <p>
          This Agreement, its interpretation, and all commercial transactions conducted through this portal shall be governed exclusively by the laws, decrees, and ministerial decisions in force in the <strong>Sultanate of Oman</strong>.
        </p>
        <p>
          Any disputes, controversies, or claims arising out of or relating to your use of this website, product purchases, or enquiries shall be referred exclusively to the competent courts of <strong>Muscat, Sultanate of Oman</strong>.
        </p>
      </section>

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
          <p>Corporate Line: <span dir="ltr">+968 77554070</span></p>
          <p>Office Address: Unit No. 2, Al Shumoor Building, Way no 2706, CBD, Ruwi, Muscat, Sultanate of Oman</p>
        </div>
      </div>
    </>
  );
}

/* الترجمة العربية للاتفاقية — مطابقة لبنود النص الإنجليزي دون إضافة أو حذف. */
function TermsAr() {
  return (
    <>
      <section id="legal-sec-1" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">1.</span> قبول الشروط والهوية المؤسسية
        </h2>
        <p>
          تشكّل اتفاقية المستخدم والشروط التجارية هذه (ويُشار إليها فيما بعد بـ <strong>&quot;الاتفاقية&quot;</strong>) عقدًا إلكترونيًا ملزمًا قانونًا بينك (سواء بصفتك عميلًا فردًا أو كيانًا اعتباريًا، ويُشار إليك فيما بعد بـ <strong>&quot;العميل&quot;</strong> أو <strong>&quot;أنت&quot;</strong>) وبين <strong>شركة سويفت للحلول الإدارية المتقدمة ش.م.م</strong> (<span dir="ltr">SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC</span>)، وهي شركة ذات مسؤولية محدودة مسجلة وفقًا لقوانين سلطنة عُمان (ويُشار إليها فيما بعد بـ <strong>&quot;SAMS&quot;</strong> أو <strong>&quot;نحن&quot;</strong>).
        </p>
        <p>
          بدخولك إلى هذه البوابة الإلكترونية للتجارة أو تصفحها أو التفاعل معها أو شراء حلول السلامة منها، فإنك تُقر بأنك قرأت هذه الاتفاقية وفهمتها وتوافق دون قيد أو شرط على الالتزام بها. وإذا كنت لا توافق على هذه الشروط، فيجب عليك التوقف فورًا عن أي تعامل مع هذه البوابة.
        </p>
      </section>

      <section id="legal-sec-2" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">2.</span> التعاقد والمعاملات الإلكترونية
        </h2>
        <p>
          وفقًا لـ <strong>قانون المعاملات الإلكترونية العُماني</strong> الصادر بـ <strong>المرسوم السلطاني رقم 69/2008</strong>:
        </p>
        <ul className="list-disc ps-6 space-y-2">
          <li>
            تمثّل موافقتك الإلكترونية وطلبات الشراء التي ترسلها وإجراءات التأكيد التي تقوم بها على هذه البوابة إعلانات قانونية عن إرادتك في التعاقد.
          </li>
          <li>
            تتمتع مستندات الفواتير وعروض الأسعار الصادرة عبر بوابتنا الإلكترونية أو المرسلة عبر البريد الإلكتروني الرسمي (المنتهي بـ <span dir="ltr">@samsoman.com</span>) بحجية تجارية كاملة أمام المحاكم المدنية والتجارية العُمانية.
          </li>
          <li>
            يتم التحقق من معاملات الدفع الإلكتروني بالبطاقات بشكل آمن عبر <strong>Paymob</strong>، وهي الجهة الخارجية المعتمدة لدى SAMS لمعالجة المعاملات، والتي تعمل وفق معايير الامتثال الصادرة عن البنك المركزي المحلي.
          </li>
        </ul>
      </section>

      <section id="legal-sec-3" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">3.</span> الامتثال لقانون حماية المستهلك
        </h2>
        <p>
          تلتزم SAMS التزامًا كاملًا بـ <strong>قانون حماية المستهلك العُماني</strong> الصادر بـ <strong>المرسوم السلطاني رقم 66/2014</strong> ولائحته التنفيذية. ويحق للعملاء الحصول على أسعار دقيقة وشفافة، وشهادات للجودة، وضوابط عادلة للاستبدال أو الاسترداد:
        </p>
        <ul className="list-disc ps-6 space-y-2">
          <li>
            <strong>وصف المنتج:</strong> تضمن SAMS أن جميع كرات الإطفاء والمزهريات الديكورية المبيعة على هذا الموقع هي حلول سلامة أصلية ومستوردة ومطابقة لمواصفات الدفاع المدني الوطنية.
          </li>
          <li>
            <strong>شفافية الأسعار:</strong> تُعرض أسعار بيع المنتجات بوضوح بالريال العُماني (ر.ع.). وتكون عروض الأسعار المطلوبة عبر بوابة الاستفسارات سارية لمدة أربعة عشر (14) يومًا تقويميًا من تاريخ إصدارها.
          </li>
          <li>
            <strong>سياسة الإرجاع والاستبدال:</strong> وفقًا للمادة (22) من المرسوم السلطاني رقم 66/2014، يحق للمستهلك استبدال المنتج أو إرجاعه خلال خمسة عشر (15) يومًا من تاريخ الشراء إذا كان المنتج يحتوي على عيب مصنعي أو غير مطابق للمواصفة المعتمدة، شريطة أن يبقى في عبوته الأصلية وألا يكون قد استُخدم أو فُعِّل أو تعرّض للتلف.
          </li>
        </ul>
      </section>

      <section id="legal-sec-4" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">4.</span> المواصفات الفنية والعمر الافتراضي للسلامة
        </h2>
        <p>
          تعتمد منتجاتنا التلقائية للسلامة من الحرائق (وتحديدًا كرات الإطفاء التلقائية والمزهريات الديكورية من GFO وAFO) على مواد إطفاء كيميائية جافة. ويجب على العملاء مراعاة ما يلي:
        </p>
        <ul className="list-disc ps-6 space-y-2">
          <li>
            <strong>التفعيل الذاتي:</strong> تتفعل هذه الأجهزة تلقائيًا عند التلامس المباشر مع اللهب المكشوف (استجابة خلال 3 إلى 5 ثوانٍ)، ولا تتفعل بفعل الحرارة وحدها.
          </li>
          <li>
            <strong>مدة الخدمة:</strong> تُضمن المنتجات لعمر تشغيلي مدته <strong>خمس (5) سنوات</strong> من تاريخ التصنيع، ولا تتطلب إعادة تعبئة أو اختبارًا هيدروستاتيكيًا أو صيانة دورية خلال هذه السنوات الخمس.
          </li>
          <li>
            <strong>تعليمات التركيب:</strong> تعتمد تغطية السلامة المثلى على التثبيت الصحيح والارتفاع المناسب والقرب من مصادر خطر الحريق (مثل لوحات التوزيع الكهربائية وحجرات المحركات وطاولات الاستقبال). ويقدّم ممثلو SAMS التوصيات، إلا أن العميل يتحمل المسؤولية النهائية عن مكان التركيب.
          </li>
        </ul>
      </section>

      <section id="legal-sec-5" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">5.</span> إخلاء المسؤولية وتنبيه السلامة
        </h2>
        <p>
          <strong>تنبيه قانوني مهم:</strong> على الرغم من أن أجهزة السلامة التلقائية من الحرائق من GFO وAFO فعالة جدًا في إخماد الحرائق في مراحلها الأولى ومنع انتشارها السريع، فإنها مصممة لتكون <em>وسائل سلامة مساندة</em>.
        </p>
        <p>
          ولا يُقصد بها أن تحل محل أنظمة الحماية من الحرائق الإلزامية للمنشآت التجارية، أو شبكات الإنذار، أو إجراءات الدفاع المدني المعتمدة التي تفرضها الجهات العُمانية المختصة. ولا تتحمل SAMS أي مسؤولية عن الأضرار التي تلحق بالممتلكات أو الإصابات الجسدية أو الخسائر المباشرة أو غير المباشرة الناتجة عن عدم تفعيل الحريق للكرة (على سبيل المثال بسبب التركيب غير الصحيح، أو وجود حاجز يمنع وصول اللهب إليها، أو الظروف البيئية القاسية).
        </p>
      </section>

      <section id="legal-sec-6" className="space-y-4">
        <h2 className={sectionHeading}>
          <span className="text-fire">6.</span> القانون الحاكم وتسوية النزاعات
        </h2>
        <p>
          تخضع هذه الاتفاقية وتفسيرها وجميع المعاملات التجارية التي تتم عبر هذه البوابة حصريًا للقوانين والمراسيم والقرارات الوزارية النافذة في <strong>سلطنة عُمان</strong>.
        </p>
        <p>
          تُحال أي نزاعات أو خلافات أو مطالبات تنشأ عن استخدامك لهذا الموقع أو شرائك للمنتجات أو استفساراتك، أو تتعلق بها، حصريًا إلى المحاكم المختصة في <strong>مسقط، سلطنة عُمان</strong>.
        </p>
      </section>

      <div className="bg-light-grey p-8 rounded-2xl border border-gray-150 space-y-4 mt-8">
        <h3 className="font-display text-lg uppercase font-bold text-navy flex items-center gap-2">
          <FileText className="w-5 h-5 text-fire shrink-0" />
          الاستفسارات القانونية
        </h3>
        <p className="text-xs sm:text-sm text-gray-550 leading-relaxed font-light">
          لأي استفسارات تتعلق بالامتثال التجاري أو المراسيم السلطانية أو نسخ شهادات المنتجات أو الشروط العامة للشركة، يرجى التواصل مع مسؤول الامتثال القانوني لدينا:
        </p>
        <div className="pt-2 text-xs sm:text-sm space-y-1 font-semibold text-navy">
          <p>البريد الإلكتروني: <a href="mailto:info@samsoman.com" className="text-fire hover:underline">info@samsoman.com</a></p>
          <p>هاتف الشركة: <span dir="ltr">+968 77554070</span></p>
          <p>عنوان المكتب: وحدة رقم 2، مبنى الشمور، طريق رقم 2706، الحي التجاري المركزي، روي، مسقط، سلطنة عُمان</p>
        </div>
      </div>
    </>
  );
}

export default async function TermsPage({ params }: { params: LangParams }) {
  const locale = await resolveLocale(params);
  const t = legalMessages[locale].terms;

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
        {/* Document Metadata Card */}
        <div className="bg-light-grey p-6 rounded-2xl border border-gray-150 mb-12 flex flex-wrap gap-6 items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-fire" />
            <span>{t.effectiveDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-fire" />
            <span>{t.registered}</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-fire" />
            <span>{t.governingLaw}</span>
          </div>
        </div>

        {/* Legal Content */}
        <div className="space-y-12 text-gray-700 leading-relaxed font-light text-sm sm:text-base">
          {locale === 'ar' ? <TermsAr /> : <TermsEn />}
        </div>
      </div>
    </div>
  );
}
