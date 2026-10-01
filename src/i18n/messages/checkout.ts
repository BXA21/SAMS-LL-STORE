import { defineMessages } from '../messages';

/**
 * Error codes returned by the checkout / quotation / order-status APIs
 * (ApiErrorCode in src/lib/apiHelpers.ts). Arabic replaces the server's English
 * message per code; unknown codes fall back to `generic`.
 */
type ApiErrorMessages = {
  INVALID_REQUEST: string;
  RATE_LIMITED: string;
  SERVICE_UNAVAILABLE: string;
  ONLINE_PAYMENT_UNAVAILABLE: string;
  PRODUCT_NOT_FOUND: string;
  NOT_FOUND: string;
  GONE: string;
  PAYMENT_GATEWAY_ERROR: string;
  OUT_OF_STOCK: string;
  DUPLICATE_CHECKOUT: string;
  CARD_QUANTITY_LIMIT: string;
  UNAUTHORIZED: string;
  INTERNAL_ERROR: string;
  network: string;
  generic: string;
};

export const checkoutMessages = defineMessages({
  en: {
    meta: {
      checkoutTitle: 'Checkout | SAMS LLC',
      resultTitle: 'Payment Result | SAMS LLC',
      ordersTitle: 'Track Your Order | SAMS LLC',
      ordersDescription: 'Get delivery updates for your SAMS order from our team on WhatsApp or by phone.',
    },
    empty: {
      title: 'Your Cart is Empty',
      body: 'Please add automatic fire safety products to your cart before proceeding to checkout.',
      cta: 'Explore Products',
    },
    quoteSuccess: {
      title: 'Quotation Enquiry Received',
      reference: 'Reference Number:',
      customer: 'Customer Name:',
      total: 'Total Quotation Amount:',
      body: 'We have generated your custom pricing quotation and registered it in our sales portal. Our team will email or WhatsApp you shortly to discuss delivery options.',
      continueShopping: 'Continue Shopping',
      home: 'Go to Home',
    },
    backToCatalog: 'Back to Catalog',
    portal: 'Checkout Portal',
    heading: 'Complete Your Order / Enquiry',
    orderType: 'Select Order Type',
    manualTitle: 'Quotation / Invoice Enquiry',
    manualBody: 'Request a custom quote. Our sales specialists will contact you directly to process payment offline.',
    onlineTitle: 'Pay Online by Card',
    onlineBodyBefore: 'Pay securely on ',
    onlineBodyAfter: "'s protected page with Visa, Mastercard or local debit cards. Card details never touch our servers.",
    locked: 'Locked',
    offlineTitle: 'Online Credit Card',
    offlineBodyBefore: 'Pay securely online via ',
    offlineBodyAfter: ' using international or local cards. (Offline)',
    detailsHeading: 'Customer Billing & Delivery Details',
    fields: {
      fullName: 'Full Name *',
      fullNamePlaceholder: 'e.g., Mohsin Abbas',
      email: 'Email Address *',
      emailPlaceholder: 'e.g., mohsin@example.com',
      phone: 'Phone Number *',
      phonePlaceholder: 'e.g., +968 90000000',
      company: 'Company Name (Optional)',
      companyPlaceholder: 'e.g., SAMS Logistics LLC',
      address: 'Complete Delivery Address *',
      addressPlaceholder: 'Provide Governorate, City, Street, Building No, or landmark for SAMS local courier delivery...',
      notes: 'Delivery / Special Instructions (Optional)',
      notesPlaceholder: 'Provide additional details regarding preferred delivery hours or specific contacts...',
    },
    validation: {
      fullName: 'Full name is required',
      email: 'Valid email is required',
      phone: 'Enter a valid phone number, e.g. +968 9000 0000',
      address: 'Complete delivery address is required',
      tooLong: 'This entry is too long',
      deliveryAcknowledged: 'Please confirm you understand delivery is arranged and charged separately',
    },
    ackBefore: 'I understand my card payment covers the ',
    ackStrong: 'products only',
    ackAfter: '. Delivery is arranged separately: SAMS will contact me on WhatsApp to agree the delivery charge and timing before dispatch.',
    submitting: 'Initializing Secure Gateway...',
    submitOnline: 'Confirm Order & Pay Now',
    submitManual: 'Submit Quotation Enquiry',
    summary: 'Order Summary',
    qtyWeight: (qty: number, weight: string) => `Qty: ${qty} | Weight: ${weight}`,
    subtotal: 'Subtotal',
    shipping: 'Local Shipping (Oman Courier)',
    calculatedLater: 'Calculated Later',
    shippingNote:
      '* Note: Shipment fees apply. SAMS does not provide free shipping. The delivery cost will be determined based on your governorate/location and shared with you directly via WhatsApp or email.',
    payableNow: 'Payable now (products)',
    excludesDelivery: '* Grand total excludes local delivery charges',
    noticeHeading: 'Security & Legal Notice:',
    noticeBody:
      'Product placement, local building configurations, and environmental factors can alter fire extinguishing ball activation rates. SAMS LLC accepts card payments and custom quote requests under Omani retail compliance parameters.',
    errors: {
      INVALID_REQUEST: 'Some details are invalid. Please check the form and try again.',
      RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
      SERVICE_UNAVAILABLE: 'This service is temporarily unavailable. Please try again shortly or contact us on WhatsApp.',
      ONLINE_PAYMENT_UNAVAILABLE: 'Online card payment is not available right now. Please send a quotation request instead.',
      PRODUCT_NOT_FOUND: 'One of the products in your cart is no longer available. Please refresh your cart.',
      NOT_FOUND: 'We could not find what you were looking for.',
      GONE: 'This feature is no longer available.',
      PAYMENT_GATEWAY_ERROR: 'The payment gateway did not respond. You have not been charged. Please try again.',
      OUT_OF_STOCK: 'Sorry, one of the products in your cart is not available in that quantity right now.',
      DUPLICATE_CHECKOUT: 'This checkout was already submitted. Please finish paying in the Paymob page that opened, or start a new checkout from your cart.',
      CARD_QUANTITY_LIMIT: 'Online card orders are limited to 50 units. For larger quantities, please send a quotation request.',
      UNAUTHORIZED: 'You are not authorised to do this.',
      INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
      network: 'Network error. Please check your connection and try again.',
      generic: 'An error occurred during checkout. Please try again.',
    } satisfies ApiErrorMessages,
    result: {
      whatsappWithOrder: (orderNumber: string) => `Hello SAMS LLC, I have a question about my order ${orderNumber}.`,
      whatsappGeneric: 'Hello SAMS LLC, I have a question about my online order.',
      loadingTitle: 'Confirming your payment',
      loadingBody: 'Please keep this page open for a moment.',
      pendingTitle: 'Payment being confirmed',
      pendingBefore: 'We are waiting for the bank to confirm order ',
      pendingAfter: '. This usually takes a few seconds. You will not be charged twice; please do not pay again.',
      checkAgain: 'Check again',
      paidTitle: 'Payment Successful',
      paidBody: 'Your payment was confirmed by Paymob and your order is registered with SAMS LLC.',
      orderNumber: 'Order Number:',
      amountPaid: 'Amount Paid:',
      paymentStatus: 'Payment Status:',
      paidVerified: 'Paid / Verified',
      gateway: 'Payment Gateway:',
      gatewayName: 'Paymob Oman',
      keepNumber:
        'Keep your order number to track your delivery. A representative will contact you by phone or WhatsApp to arrange delivery; delivery charges depend on your governorate.',
      trackOrder: 'Track Order',
      contact: 'Contact SAMS',
      failedTitle: 'Payment Not Completed',
      unknownTitle: 'We could not find this payment',
      failedBody: 'The payment was declined or cancelled, and you have not been charged. Your cart is still saved so you can try again.',
      unknownBody: 'If you completed a payment, contact us with the time of payment and we will confirm it for you.',
      stepsHeading: 'Suggested Steps:',
      steps: [
        'Check the card number, expiry date and CVV.',
        'Make sure online payments are enabled on your card and the balance or limit allows it.',
        'Submit a quotation request to pay by bank transfer or on delivery instead.',
      ],
      tryAgain: 'Try Again',
    },
    orders: {
      whatsappText: 'Hello SAMS LLC, I would like a delivery update for my order number: ',
      title: 'Track Your Order',
      subtitle: 'Our team gives delivery updates directly, so your order details stay private.',
      heading: 'Get a delivery update',
      bodyBefore: 'Send us your order number (it looks like ',
      bodyAfter:
        ' and is shown on your payment confirmation). A SAMS representative will confirm it is you and share your delivery status. Deliveries run Sunday to Thursday, 10:00 AM to 5:00 PM (Oman time).',
      whatsapp: 'WhatsApp SAMS',
      call: 'Call',
      privacy: 'For your privacy we never show order details to anyone who only knows an order number, email or phone number.',
      justPaid: 'Just paid online? Your payment confirmation is shown right after checkout.',
      continueShopping: 'Continue shopping',
    },
  },
  ar: {
    meta: {
      checkoutTitle: 'إتمام الطلب | SAMS LLC',
      resultTitle: 'نتيجة الدفع | SAMS LLC',
      ordersTitle: 'تتبع طلبك | SAMS LLC',
      ordersDescription: 'احصل على تحديثات توصيل طلبك من فريق SAMS عبر واتساب أو الهاتف.',
    },
    empty: {
      title: 'سلة التسوق فارغة',
      body: 'يرجى إضافة منتجات السلامة التلقائية من الحرائق إلى السلة قبل إتمام الطلب.',
      cta: 'تصفح المنتجات',
    },
    quoteSuccess: {
      title: 'تم استلام طلب عرض السعر',
      reference: 'الرقم المرجعي:',
      customer: 'اسم العميل:',
      total: 'إجمالي عرض السعر:',
      body: 'تم إعداد عرض السعر الخاص بك وتسجيله في نظام المبيعات لدينا. سيتواصل معك فريقنا قريبًا عبر البريد الإلكتروني أو واتساب لمناقشة خيارات التوصيل.',
      continueShopping: 'متابعة التسوق',
      home: 'العودة إلى الرئيسية',
    },
    backToCatalog: 'العودة إلى المنتجات',
    portal: 'إتمام الطلب',
    heading: 'أكمل طلبك أو استفسارك',
    orderType: 'اختر نوع الطلب',
    manualTitle: 'طلب عرض سعر / فاتورة',
    manualBody: 'اطلب عرض سعر خاصًا، وسيتواصل معك مختصو المبيعات مباشرة لإتمام الدفع خارج الموقع.',
    onlineTitle: 'الدفع بالبطاقة عبر الإنترنت',
    onlineBodyBefore: 'ادفع بأمان عبر الصفحة المحمية لـ ',
    onlineBodyAfter: ' باستخدام فيزا أو ماستركارد أو بطاقات الخصم المحلية. بيانات بطاقتك لا تصل إلى خوادمنا أبدًا.',
    locked: 'غير متاح',
    offlineTitle: 'الدفع بالبطاقة عبر الإنترنت',
    offlineBodyBefore: 'ادفع بأمان عبر الإنترنت من خلال ',
    offlineBodyAfter: ' باستخدام البطاقات الدولية أو المحلية. (غير متاح حاليًا)',
    detailsHeading: 'بيانات العميل والفوترة والتوصيل',
    fields: {
      fullName: 'الاسم الكامل *',
      fullNamePlaceholder: 'مثال: محسن عباس',
      email: 'البريد الإلكتروني *',
      emailPlaceholder: 'مثال: mohsin@example.com',
      phone: 'رقم الهاتف *',
      phonePlaceholder: 'مثال: +968 90000000',
      company: 'اسم الشركة (اختياري)',
      companyPlaceholder: 'مثال: شركة سامز للخدمات اللوجستية',
      address: 'عنوان التوصيل الكامل *',
      addressPlaceholder: 'اذكر المحافظة والولاية والشارع ورقم المبنى أو أقرب معلم لتسهيل التوصيل...',
      notes: 'تعليمات التوصيل أو ملاحظات خاصة (اختياري)',
      notesPlaceholder: 'أضف أي تفاصيل إضافية مثل أوقات التوصيل المفضلة أو أرقام تواصل أخرى...',
    },
    validation: {
      fullName: 'الاسم الكامل مطلوب',
      email: 'يرجى إدخال بريد إلكتروني صحيح',
      phone: 'يرجى إدخال رقم هاتف صحيح، مثال: +968 9000 0000',
      address: 'عنوان التوصيل الكامل مطلوب',
      tooLong: 'هذا الحقل أطول من المسموح',
      deliveryAcknowledged: 'يرجى تأكيد علمك بأن التوصيل يُرتب ويُحتسب بشكل منفصل',
    },
    ackBefore: 'أفهم أن الدفع بالبطاقة يغطي ',
    ackStrong: 'المنتجات فقط',
    ackAfter: '. يتم ترتيب التوصيل بشكل منفصل، وستتواصل معي SAMS عبر واتساب للاتفاق على رسوم التوصيل وموعده قبل الشحن.',
    submitting: 'جارٍ تجهيز بوابة الدفع الآمنة...',
    submitOnline: 'تأكيد الطلب والدفع الآن',
    submitManual: 'إرسال طلب عرض السعر',
    summary: 'ملخص الطلب',
    qtyWeight: (qty: number, weight: string) => `الكمية: ${qty} | الوزن: ${weight}`,
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن المحلي (التوصيل داخل عُمان)',
    calculatedLater: 'يُحدد لاحقًا',
    shippingNote:
      '* ملاحظة: تُطبق رسوم الشحن، ولا توفر SAMS شحنًا مجانيًا. تُحدد تكلفة التوصيل حسب محافظتك أو موقعك، ونبلغك بها مباشرة عبر واتساب أو البريد الإلكتروني.',
    payableNow: 'المبلغ المستحق الآن (المنتجات)',
    excludesDelivery: '* الإجمالي لا يشمل رسوم التوصيل المحلي',
    noticeHeading: 'تنبيه أمني وقانوني:',
    noticeBody:
      'قد يؤثر مكان وضع المنتج وتصميم المبنى والعوامل البيئية على سرعة تفعيل كرات إطفاء الحريق. تقبل SAMS LLC الدفع بالبطاقة وطلبات عروض الأسعار وفق أنظمة التجارة المعمول بها في سلطنة عُمان.',
    errors: {
      INVALID_REQUEST: 'بعض البيانات غير صحيحة. يرجى مراجعة النموذج والمحاولة مرة أخرى.',
      RATE_LIMITED: 'محاولات كثيرة جدًا. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.',
      SERVICE_UNAVAILABLE: 'هذه الخدمة غير متاحة مؤقتًا. يرجى المحاولة بعد قليل أو التواصل معنا عبر واتساب.',
      ONLINE_PAYMENT_UNAVAILABLE: 'الدفع بالبطاقة غير متاح حاليًا. يرجى إرسال طلب عرض سعر بدلًا من ذلك.',
      PRODUCT_NOT_FOUND: 'أحد المنتجات في سلتك لم يعد متاحًا. يرجى تحديث السلة.',
      NOT_FOUND: 'لم نتمكن من العثور على ما تبحث عنه.',
      GONE: 'هذه الخدمة لم تعد متاحة.',
      PAYMENT_GATEWAY_ERROR: 'لم تستجب بوابة الدفع، ولم يتم خصم أي مبلغ منك. يرجى المحاولة مرة أخرى.',
      OUT_OF_STOCK: 'عذرًا، أحد المنتجات في سلتك غير متوفر بهذه الكمية حاليًا. يمكنك تقليل الكمية أو إرسال طلب عرض سعر وسيؤكد فريقنا التوفر.',
      DUPLICATE_CHECKOUT: 'تم إرسال هذا الطلب مسبقًا. يرجى إكمال الدفع في صفحة Paymob التي فُتحت، أو بدء طلب جديد من السلة.',
      CARD_QUANTITY_LIMIT: 'الحد الأقصى للطلب بالبطاقة هو 50 وحدة. للكميات الأكبر يرجى إرسال طلب عرض سعر.',
      UNAUTHORIZED: 'غير مصرح لك بتنفيذ هذا الإجراء.',
      INTERNAL_ERROR: 'حدث خطأ من جهتنا. يرجى المحاولة مرة أخرى.',
      network: 'خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.',
      generic: 'حدث خطأ أثناء إتمام الطلب. يرجى المحاولة مرة أخرى.',
    },
    result: {
      whatsappWithOrder: (orderNumber: string) => `مرحبًا SAMS LLC، لدي استفسار بخصوص طلبي رقم ${orderNumber}.`,
      whatsappGeneric: 'مرحبًا SAMS LLC، لدي استفسار بخصوص طلبي عبر الموقع.',
      loadingTitle: 'جارٍ تأكيد عملية الدفع',
      loadingBody: 'يرجى إبقاء هذه الصفحة مفتوحة لحظات.',
      pendingTitle: 'جارٍ تأكيد الدفع',
      pendingBefore: 'ننتظر تأكيد البنك للطلب رقم ',
      pendingAfter: '. يستغرق ذلك عادة بضع ثوانٍ، ولن يتم الخصم مرتين، لذا يرجى عدم الدفع مرة أخرى.',
      checkAgain: 'تحقق مرة أخرى',
      paidTitle: 'تم الدفع بنجاح',
      paidBody: 'تم تأكيد الدفع عبر Paymob وتسجيل طلبك لدى SAMS LLC.',
      orderNumber: 'رقم الطلب:',
      amountPaid: 'المبلغ المدفوع:',
      paymentStatus: 'حالة الدفع:',
      paidVerified: 'مدفوع / تم التحقق',
      gateway: 'بوابة الدفع:',
      gatewayName: 'Paymob عُمان',
      keepNumber:
        'احتفظ برقم طلبك لمتابعة التوصيل. سيتواصل معك أحد ممثلينا هاتفيًا أو عبر واتساب لترتيب التوصيل، وتعتمد رسوم التوصيل على محافظتك.',
      trackOrder: 'تتبع الطلب',
      contact: 'تواصل مع SAMS',
      failedTitle: 'لم تكتمل عملية الدفع',
      unknownTitle: 'لم نتمكن من العثور على عملية الدفع',
      failedBody: 'تم رفض الدفع أو إلغاؤه، ولم يتم خصم أي مبلغ منك. سلتك ما زالت محفوظة لتتمكن من المحاولة مرة أخرى.',
      unknownBody: 'إذا أتممت عملية دفع، تواصل معنا مع ذكر وقت الدفع وسنؤكدها لك.',
      stepsHeading: 'خطوات مقترحة:',
      steps: [
        'تحقق من رقم البطاقة وتاريخ الانتهاء ورمز CVV.',
        'تأكد من تفعيل الدفع عبر الإنترنت في بطاقتك وأن الرصيد أو الحد يسمح بذلك.',
        'أرسل طلب عرض سعر للدفع بالتحويل البنكي أو عند الاستلام بدلًا من ذلك.',
      ],
      tryAgain: 'حاول مرة أخرى',
    },
    orders: {
      whatsappText: 'مرحبًا SAMS LLC، أرغب في معرفة حالة توصيل طلبي رقم: ',
      title: 'تتبع طلبك',
      subtitle: 'يقدم فريقنا تحديثات التوصيل مباشرة للحفاظ على خصوصية بيانات طلبك.',
      heading: 'احصل على تحديث التوصيل',
      bodyBefore: 'أرسل لنا رقم طلبك (يكون بهذا الشكل ',
      bodyAfter:
        ' ويظهر في تأكيد الدفع). سيتحقق أحد ممثلي SAMS من هويتك ويبلغك بحالة التوصيل. يتم التوصيل من الأحد إلى الخميس، من 10:00 صباحًا حتى 5:00 مساءً (بتوقيت عُمان).',
      whatsapp: 'واتساب SAMS',
      call: 'اتصل على',
      privacy: 'حفاظًا على خصوصيتك، لا نعرض تفاصيل الطلب لأي شخص يعرف فقط رقم الطلب أو البريد الإلكتروني أو رقم الهاتف.',
      justPaid: 'أتممت الدفع للتو؟ يظهر تأكيد الدفع مباشرة بعد إتمام الطلب.',
      continueShopping: 'متابعة التسوق',
    },
  },
});

export type CheckoutErrorMessages = ApiErrorMessages;

/** Localized message for a failed API call; English keeps the server's own wording. */
export function localizedApiError(
  errors: ApiErrorMessages,
  locale: 'ar' | 'en',
  error: unknown
): string {
  const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : undefined;
  const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: unknown }).status : undefined;
  if (locale === 'en') {
    return error instanceof Error && error.message ? error.message : errors.generic;
  }
  if (typeof code === 'string' && code in errors) return errors[code as keyof ApiErrorMessages];
  if (error instanceof Error && status === undefined && code === undefined && error.name === 'ApiRequestError') return errors.network;
  return errors.generic;
}
