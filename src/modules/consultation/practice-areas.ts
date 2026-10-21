// Shared constant for the consultation module.
// Kept in a plain (non-'use server') file because 'use server' modules
// may only export async functions — exporting const data from them breaks
// client imports at runtime.
export const PRACTICE_AREAS = [
  { value: 'CIVIL_COMMERCIAL', label: 'Civil & Commercial Law (दीवानी तथा वाणिज्य कानून)' },
  { value: 'CRIMINAL_EVIDENCE', label: 'Criminal Law & Evidence (फौजदारी कानून तथा प्रमाण)' },
  { value: 'CONSTITUTIONAL_PUBLIC', label: 'Constitutional & Public Law (संवैधानिक तथा सार्वजनिक कानून)' },
  { value: 'CORPORATE_ADVISORY', label: 'Corporate & Business Advisory (कर्पोरेट तथा व्यावसायिक परामर्श)' },
  { value: 'IP_ENTERTAINMENT', label: 'Intellectual Property & Media (बौद्धिक सम्पत्ति कानून)' },
  { value: 'FAMILY_PROPERTY', label: 'Family & Property Law (पारिवारिक तथा अंशबण्डा कानून)' },
  { value: 'LEGAL_DRAFTING', label: 'Legal Drafting & Court Filing (कानूनी मस्यौदा तथा निवेदन)' },
  { value: 'GENERAL_INQUIRY', label: 'General Legal Consultation (अन्य कानूनी परामर्श)' },
] as const;
