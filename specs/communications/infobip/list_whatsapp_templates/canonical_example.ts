/**
 * @provider Infobip
 * @capability list_whatsapp_templates
 * @atss 1.0
 * @capability_type synchronous
 */

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL; // your account's base URL, e.g. https://xxxxx.api.infobip.com
if (!INFOBIP_API_KEY) throw new Error("Missing env: INFOBIP_API_KEY");
// Only ever send the API key to an Infobip host.
if (!INFOBIP_BASE_URL || !/^https:\/\/[\w-]+\.api\.infobip\.com$/.test(INFOBIP_BASE_URL)) {
  throw new Error("INFOBIP_BASE_URL must be your Infobip base URL, https://xxxxx.api.infobip.com");
}

export type ListWhatsappTemplatesInput = {
  sender?: string[];
  status?: Array<"APPROVED" | "IN_APPEAL" | "PENDING" | "REJECTED" | "PENDING_DELETION" | "DELETED" | "REINSTATED" | "FLAGGED" | "FIRST_PAUSED" | "SECOND_PAUSED" | "DISABLED" | "ARCHIVED" | "UNKNOWN">;
  name?: string;
  language?: Array<"af" | "sq" | "ar" | "ar_EG" | "ar_AE" | "ar_LB" | "ar_MA" | "ar_QA" | "az" | "bn" | "bn_IN" | "bg" | "ca" | "zh_CN" | "zh_HK" | "zh_TW" | "hr" | "cs" | "da" | "nl" | "nl_BE" | "en" | "en_GB" | "en_US" | "en_AE" | "en_AU" | "en_CA" | "en_GH" | "en_IE" | "en_IN" | "en_JM" | "en_MY" | "en_NZ" | "en_QA" | "en_SG" | "en_UG" | "en_ZA" | "et" | "fil" | "fi" | "fr" | "fr_BE" | "fr_CA" | "fr_CH" | "fr_CI" | "fr_MA" | "ka" | "de" | "de_AT" | "de_CH" | "el" | "gu" | "ha" | "he" | "hi" | "hu" | "id" | "ga" | "it" | "ja" | "kn" | "kk" | "rw_RW" | "ko" | "ky_KG" | "lo" | "lv" | "lt" | "mk" | "ms" | "ml" | "mr" | "nb" | "fa" | "pl" | "pt_BR" | "pt_PT" | "pa" | "ro" | "ru" | "sr" | "si_LK" | "sk" | "sl" | "es" | "es_AR" | "es_CL" | "es_CO" | "es_CR" | "es_DO" | "es_EC" | "es_HN" | "es_MX" | "es_PA" | "es_PE" | "es_ES" | "es_UY" | "sw" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "ur" | "uz" | "vi" | "zu" | "unknown">;
  category?: Array<"MARKETING" | "AUTHENTICATION" | "UTILITY">;
  applicationId?: string;
  entityId?: string;
  page?: number;
  size?: number;
  orderBy?: string;
};

export type ListWhatsappTemplatesResponse = {
  results: Array<({
    id?: string;
    businessAccountId?: number;
    name?: string;
    language?: "af" | "sq" | "ar" | "ar_EG" | "ar_AE" | "ar_LB" | "ar_MA" | "ar_QA" | "az" | "bn" | "bn_IN" | "bg" | "ca" | "zh_CN" | "zh_HK" | "zh_TW" | "hr" | "cs" | "da" | "nl" | "nl_BE" | "en" | "en_GB" | "en_US" | "en_AE" | "en_AU" | "en_CA" | "en_GH" | "en_IE" | "en_IN" | "en_JM" | "en_MY" | "en_NZ" | "en_QA" | "en_SG" | "en_UG" | "en_ZA" | "et" | "fil" | "fi" | "fr" | "fr_BE" | "fr_CA" | "fr_CH" | "fr_CI" | "fr_MA" | "ka" | "de" | "de_AT" | "de_CH" | "el" | "gu" | "ha" | "he" | "hi" | "hu" | "id" | "ga" | "it" | "ja" | "kn" | "kk" | "rw_RW" | "ko" | "ky_KG" | "lo" | "lv" | "lt" | "mk" | "ms" | "ml" | "mr" | "nb" | "fa" | "pl" | "pt_BR" | "pt_PT" | "pa" | "ro" | "ru" | "sr" | "si_LK" | "sk" | "sl" | "es" | "es_AR" | "es_CL" | "es_CO" | "es_CR" | "es_DO" | "es_EC" | "es_HN" | "es_MX" | "es_PA" | "es_PE" | "es_ES" | "es_UY" | "sw" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "ur" | "uz" | "vi" | "zu" | "unknown";
    status?: "APPROVED" | "IN_APPEAL" | "PENDING" | "REJECTED" | "PENDING_DELETION" | "DELETED" | "REINSTATED" | "FLAGGED" | "FIRST_PAUSED" | "SECOND_PAUSED" | "DISABLED" | "ARCHIVED" | "UNKNOWN";
    category?: "MARKETING" | "AUTHENTICATION" | "UTILITY";
    structure: {
      header?: ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        text?: string;
      } & {
        format: "TEXT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "IMAGE";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "VIDEO";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "GIF";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "DOCUMENT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        format: "LOCATION";
      });
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      buttons?: Array<({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        phoneNumber?: string;
      } & {
        type: "PHONE_NUMBER";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        url?: string;
        destinationUrl?: string;
      } & {
        type: "URL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "QUICK_REPLY";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "COPY_CODE";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        flowId?: number;
        flowAction?: "NAVIGATE" | "DATA_EXCHANGE";
        navigateScreen?: string;
      } & {
        type: "FLOW";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "CATALOG";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "MULTI_PRODUCT";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        variant?: "BRAZIL" | "INDIA";
      } & {
        type: "ORDER_DETAILS";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        callValidityPeriod?: number;
      } & {
        type: "VOICE_CALL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "REQUEST_CONTACT_INFO";
      })>;
      carousel?: {
        cards: Array<Record<string, unknown>>;
      };
      limitedTimeOffer?: {
        hasExpiration?: boolean;
        text: string;
      };
      callPermissionRequest?: Record<string, unknown>;
      shorteningOptions?: {
        customDomain: string;
      };
      type?: "TEXT" | "MEDIA" | "UNSUPPORTED";
    };
    quality?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    validityPeriod?: {
      amount: number;
      timeUnit?: "SECONDS" | "MINUTES" | "HOURS";
    };
    platform?: {
      entityId?: string;
      applicationId?: string;
    };
    createdAt?: string;
    lastUpdatedAt?: string;
    libraryTemplateName?: string;
  } & {
    category: "MARKETING";
  }) | ({
    id?: string;
    businessAccountId?: number;
    name?: string;
    language?: "af" | "sq" | "ar" | "ar_EG" | "ar_AE" | "ar_LB" | "ar_MA" | "ar_QA" | "az" | "bn" | "bn_IN" | "bg" | "ca" | "zh_CN" | "zh_HK" | "zh_TW" | "hr" | "cs" | "da" | "nl" | "nl_BE" | "en" | "en_GB" | "en_US" | "en_AE" | "en_AU" | "en_CA" | "en_GH" | "en_IE" | "en_IN" | "en_JM" | "en_MY" | "en_NZ" | "en_QA" | "en_SG" | "en_UG" | "en_ZA" | "et" | "fil" | "fi" | "fr" | "fr_BE" | "fr_CA" | "fr_CH" | "fr_CI" | "fr_MA" | "ka" | "de" | "de_AT" | "de_CH" | "el" | "gu" | "ha" | "he" | "hi" | "hu" | "id" | "ga" | "it" | "ja" | "kn" | "kk" | "rw_RW" | "ko" | "ky_KG" | "lo" | "lv" | "lt" | "mk" | "ms" | "ml" | "mr" | "nb" | "fa" | "pl" | "pt_BR" | "pt_PT" | "pa" | "ro" | "ru" | "sr" | "si_LK" | "sk" | "sl" | "es" | "es_AR" | "es_CL" | "es_CO" | "es_CR" | "es_DO" | "es_EC" | "es_HN" | "es_MX" | "es_PA" | "es_PE" | "es_ES" | "es_UY" | "sw" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "ur" | "uz" | "vi" | "zu" | "unknown";
    status?: "APPROVED" | "IN_APPEAL" | "PENDING" | "REJECTED" | "PENDING_DELETION" | "DELETED" | "REINSTATED" | "FLAGGED" | "FIRST_PAUSED" | "SECOND_PAUSED" | "DISABLED" | "ARCHIVED" | "UNKNOWN";
    category?: "MARKETING" | "AUTHENTICATION" | "UTILITY";
    structure: {
      header?: ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        text?: string;
      } & {
        format: "TEXT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "IMAGE";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "VIDEO";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "GIF";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "DOCUMENT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        format: "LOCATION";
      });
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      buttons?: Array<({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        phoneNumber?: string;
      } & {
        type: "PHONE_NUMBER";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        url?: string;
        destinationUrl?: string;
      } & {
        type: "URL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "QUICK_REPLY";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "COPY_CODE";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        flowId?: number;
        flowAction?: "NAVIGATE" | "DATA_EXCHANGE";
        navigateScreen?: string;
      } & {
        type: "FLOW";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "CATALOG";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "MULTI_PRODUCT";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        variant?: "BRAZIL" | "INDIA";
      } & {
        type: "ORDER_DETAILS";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        callValidityPeriod?: number;
      } & {
        type: "VOICE_CALL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "REQUEST_CONTACT_INFO";
      })>;
      carousel?: {
        cards: Array<Record<string, unknown>>;
      };
      limitedTimeOffer?: {
        hasExpiration?: boolean;
        text: string;
      };
      callPermissionRequest?: Record<string, unknown>;
      shorteningOptions?: {
        customDomain: string;
      };
      type?: "TEXT" | "MEDIA" | "UNSUPPORTED";
    };
    quality?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    validityPeriod?: {
      amount: number;
      timeUnit?: "SECONDS" | "MINUTES" | "HOURS";
    };
    platform?: {
      entityId?: string;
      applicationId?: string;
    };
    createdAt?: string;
    lastUpdatedAt?: string;
    libraryTemplateName?: string;
  } & {
    subCategory?: "ORDER_STATUS";
  } & {
    category: "UTILITY";
  }) | ({
    id?: string;
    businessAccountId?: number;
    name?: string;
    language?: "af" | "sq" | "ar" | "ar_EG" | "ar_AE" | "ar_LB" | "ar_MA" | "ar_QA" | "az" | "bn" | "bn_IN" | "bg" | "ca" | "zh_CN" | "zh_HK" | "zh_TW" | "hr" | "cs" | "da" | "nl" | "nl_BE" | "en" | "en_GB" | "en_US" | "en_AE" | "en_AU" | "en_CA" | "en_GH" | "en_IE" | "en_IN" | "en_JM" | "en_MY" | "en_NZ" | "en_QA" | "en_SG" | "en_UG" | "en_ZA" | "et" | "fil" | "fi" | "fr" | "fr_BE" | "fr_CA" | "fr_CH" | "fr_CI" | "fr_MA" | "ka" | "de" | "de_AT" | "de_CH" | "el" | "gu" | "ha" | "he" | "hi" | "hu" | "id" | "ga" | "it" | "ja" | "kn" | "kk" | "rw_RW" | "ko" | "ky_KG" | "lo" | "lv" | "lt" | "mk" | "ms" | "ml" | "mr" | "nb" | "fa" | "pl" | "pt_BR" | "pt_PT" | "pa" | "ro" | "ru" | "sr" | "si_LK" | "sk" | "sl" | "es" | "es_AR" | "es_CL" | "es_CO" | "es_CR" | "es_DO" | "es_EC" | "es_HN" | "es_MX" | "es_PA" | "es_PE" | "es_ES" | "es_UY" | "sw" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "ur" | "uz" | "vi" | "zu" | "unknown";
    status?: "APPROVED" | "IN_APPEAL" | "PENDING" | "REJECTED" | "PENDING_DELETION" | "DELETED" | "REINSTATED" | "FLAGGED" | "FIRST_PAUSED" | "SECOND_PAUSED" | "DISABLED" | "ARCHIVED" | "UNKNOWN";
    category?: "MARKETING" | "AUTHENTICATION" | "UTILITY";
    structure: {
      header?: ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        text?: string;
      } & {
        format: "TEXT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "IMAGE";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "VIDEO";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "GIF";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & Record<string, unknown> & {
        format: "DOCUMENT";
      }) | ({
        format?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "DOCUMENT" | "LOCATION";
      } & {
        format: "LOCATION";
      });
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      buttons?: Array<({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        phoneNumber?: string;
      } & {
        type: "PHONE_NUMBER";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        url?: string;
        destinationUrl?: string;
      } & {
        type: "URL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "QUICK_REPLY";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "COPY_CODE";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        flowId?: number;
        flowAction?: "NAVIGATE" | "DATA_EXCHANGE";
        navigateScreen?: string;
      } & {
        type: "FLOW";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "CATALOG";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "MULTI_PRODUCT";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        variant?: "BRAZIL" | "INDIA";
      } & {
        type: "ORDER_DETAILS";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
        callValidityPeriod?: number;
      } & {
        type: "VOICE_CALL";
      }) | ({
        type?: "PHONE_NUMBER" | "URL" | "QUICK_REPLY" | "COPY_CODE" | "FLOW" | "CATALOG" | "MULTI_PRODUCT" | "ORDER_DETAILS" | "VOICE_CALL" | "REQUEST_CONTACT_INFO";
      } & {
        text?: string;
      } & {
        type: "REQUEST_CONTACT_INFO";
      })>;
      carousel?: {
        cards: Array<Record<string, unknown>>;
      };
      limitedTimeOffer?: {
        hasExpiration?: boolean;
        text: string;
      };
      callPermissionRequest?: Record<string, unknown>;
      shorteningOptions?: {
        customDomain: string;
      };
      type?: "TEXT" | "MEDIA" | "UNSUPPORTED";
    };
    quality?: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    validityPeriod?: {
      amount: number;
      timeUnit?: "SECONDS" | "MINUTES" | "HOURS";
    };
    platform?: {
      entityId?: string;
      applicationId?: string;
    };
    createdAt?: string;
    lastUpdatedAt?: string;
    libraryTemplateName?: string;
  } & {
    category: "AUTHENTICATION";
  })>;
  paging: {
    page: number;
    size: number;
    totalPages: number;
    totalResults: number;
  };
};

type InfobipError = {
  errorCode: string;
  description: string;
  action: string;
  violations: {
    property?: string;
    violation?: string;
  }[];
  resources: {
    name?: string;
    url?: string;
  }[];
};

export async function listWhatsappTemplates(input: ListWhatsappTemplatesInput): Promise<ListWhatsappTemplatesResponse> {
  const { sender, status, name, language, category, applicationId, entityId, page, size, orderBy } = input;
  const query = new URLSearchParams();
  for (const value of sender ?? []) query.append("sender", String(value));
  for (const value of status ?? []) query.append("status", String(value));
  if (name !== undefined) query.set("name", String(name));
  for (const value of language ?? []) query.append("language", String(value));
  for (const value of category ?? []) query.append("category", String(value));
  if (applicationId !== undefined) query.set("applicationId", String(applicationId));
  if (entityId !== undefined) query.set("entityId", String(entityId));
  if (page !== undefined) query.set("page", String(page));
  if (size !== undefined) query.set("size", String(size));
  if (orderBy !== undefined) query.set("orderBy", String(orderBy));
  const qs = query.toString();
  const url = `${INFOBIP_BASE_URL}/whatsapp/1/templates${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<InfobipError>;
    // 400 bodies use errorCode/description; the documented 401 body uses requestError.serviceException.
    const legacy = (error as { requestError?: { serviceException?: { messageId?: string; text?: string } } }).requestError?.serviceException;
    throw new Error(`Infobip ${response.status} ${error.errorCode ?? legacy?.messageId ?? ""}: ${error.description ?? legacy?.text ?? response.statusText}`);
  }

  return (await response.json()) as ListWhatsappTemplatesResponse;
}

/*
Usage example:

const { results, paging } = await listWhatsappTemplates({ sender: ["2250700000001"], status: ["APPROVED"], size: 50 });
console.log(paging.totalResults, results?.map((t) => `${t.name} (${t.language})`));
*/
