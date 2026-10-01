import { defineMessages } from '../messages';

/*
 * Page chrome and metadata for the legal pages. The legal body text itself
 * lives in per-locale components inside each page, so each language reads as
 * one continuous document that can be reviewed clause by clause.
 */
export const legalMessages = defineMessages({
  en: {
    terms: {
      metaTitle: 'Terms & Conditions | SAMS LLC Oman',
      metaDescription:
        'Official terms of service and commercial policies of SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS) in Oman.',
      eyebrow: 'Legal Framework',
      title: 'Terms & Conditions',
      subtitle: 'Commercial and Electronic Agreements of Swift Advanced Management Solutions LLC (SAMS)',
      effectiveDate: 'Effective Date: July 4, 2026',
      registered: 'Registered LLC, Muscat, Oman',
      governingLaw: 'Governing Law: Sultanate of Oman',
    },
    privacy: {
      metaTitle: 'Privacy Policy | SAMS LLC Oman',
      metaDescription:
        'Official privacy policy of SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS) in compliance with Oman PDPL Royal Decree No. 6/2021.',
      eyebrow: 'Data Protection',
      title: 'Privacy Policy',
      subtitle: 'Data Privacy Standards under Sultanate of Oman Royal Decree No. 6/2021 (PDPL)',
    },
  },
  ar: {
    terms: {
      metaTitle: 'الشروط والأحكام | SAMS LLC عُمان',
      metaDescription:
        'شروط الخدمة والسياسات التجارية الرسمية لشركة سويفت للحلول الإدارية المتقدمة ش.م.م (SAMS) في سلطنة عُمان.',
      eyebrow: 'الإطار القانوني',
      title: 'الشروط والأحكام',
      subtitle: 'الاتفاقيات التجارية والإلكترونية لشركة سويفت للحلول الإدارية المتقدمة ش.م.م (SAMS)',
      effectiveDate: 'تاريخ السريان: 4 يوليو 2026',
      registered: 'شركة ذات مسؤولية محدودة مسجلة، مسقط، عُمان',
      governingLaw: 'القانون الحاكم: قوانين سلطنة عُمان',
    },
    privacy: {
      metaTitle: 'سياسة الخصوصية | SAMS LLC عُمان',
      metaDescription:
        'سياسة الخصوصية الرسمية لشركة سويفت للحلول الإدارية المتقدمة ش.م.م (SAMS) وفقًا لقانون حماية البيانات الشخصية العُماني الصادر بالمرسوم السلطاني رقم 6/2021.',
      eyebrow: 'حماية البيانات',
      title: 'سياسة الخصوصية',
      subtitle: 'معايير خصوصية البيانات وفقًا للمرسوم السلطاني رقم 6/2021 في سلطنة عُمان (قانون حماية البيانات الشخصية)',
    },
  },
});
