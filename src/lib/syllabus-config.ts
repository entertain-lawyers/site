export interface SyllabusSubject {
  name: string;
  order: number;
  unitStart?: number;
  unitEnd?: number;
  hasPrescribedCases?: boolean;
  isElective?: boolean;
  isSeminar?: boolean;
  syllabusVersion?: 'old' | 'new' | 'both';
}

export interface SyllabusSemester {
  order: number;
  name: string;
  subjects: SyllabusSubject[];
}

export const SYLLABUS_CONFIG: SyllabusSemester[] = [
  {
    order: 1,
    name: '1st Semester',
    subjects: [
      { name: 'Legal Method', order: 1, unitStart: 1, unitEnd: 5 },
      { name: 'Legal Nepali - I', order: 2, unitStart: 1, unitEnd: 2 },
      { name: 'Alternative English (for Foreigners in Lieu of Legal Nepali)', order: 3, unitStart: 1, unitEnd: 5 },
      { name: 'Legal English - I', order: 4, unitStart: 1, unitEnd: 6 },
      { name: 'Political Theory', order: 5, unitStart: 1, unitEnd: 7 },
      { name: 'Nepali History', order: 6, unitStart: 1, unitEnd: 5 },
      { name: 'Sociology', order: 7, unitStart: 1, unitEnd: 7 },
      { name: 'Economics - I', order: 8, unitStart: 1, unitEnd: 5 }
    ]
  },
  {
    order: 2,
    name: '2nd Semester',
    subjects: [
      { name: 'Jurisprudence - I', order: 1, unitStart: 1, unitEnd: 5 },
      { name: 'Legal Nepali - II', order: 2, unitStart: 1, unitEnd: 3 },
      { name: 'Alternative English (for Foreigners in Lieu of Legal Nepali)', order: 3, unitStart: 1, unitEnd: 2 },
      { name: 'Legal English - II', order: 4, unitStart: 1, unitEnd: 6 },
      { name: 'Political Thoughts', order: 5, unitStart: 1, unitEnd: 5 },
      { name: 'Global History', order: 6, unitStart: 1, unitEnd: 5 },
      { name: 'Anthropology', order: 7, unitStart: 1, unitEnd: 9 },
      { name: 'Economics - II', order: 8, unitStart: 1, unitEnd: 6 }
    ]
  },
  {
    order: 3,
    name: '3rd Semester',
    subjects: [
      { name: 'Jurisprudence - II', order: 1, unitStart: 1, unitEnd: 7 },
      { name: 'Constitutional Law - I', order: 2, unitStart: 1, unitEnd: 6 },
      { name: 'International Relations and Diplomacy', order: 3, unitStart: 1, unitEnd: 7 },
      { name: 'Criminal Law - I', order: 4, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Public International Law - I', order: 5, unitStart: 1, unitEnd: 9 },
      { name: 'Property Law', order: 6, unitStart: 1, unitEnd: 13, hasPrescribedCases: true, syllabusVersion: 'both' },
      { name: 'Comparative Law', order: 7, unitStart: 1, unitEnd: 7 }
    ]
  },
  {
    order: 4,
    name: '4th Semester',
    subjects: [
      { name: 'Criminal Law - II', order: 1, unitStart: 1, unitEnd: 6, hasPrescribedCases: true },
      { name: 'Public International Law - II', order: 2, unitStart: 1, unitEnd: 8 },
      { name: 'Constitutional Law - II', order: 3, unitStart: 1, unitEnd: 7 },
      { name: 'Family Law', order: 4, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Law of Contract - I', order: 5, unitStart: 1, unitEnd: 8, hasPrescribedCases: true },
      { name: 'Procedural Law - I', order: 6, unitStart: 1, unitEnd: 5, hasPrescribedCases: true },
      { name: 'Nepali Legal System', order: 7, unitStart: 1, unitEnd: 5 }
    ]
  },
  {
    order: 5,
    name: '5th Semester',
    subjects: [
      { name: 'Law of Contract - II', order: 1, unitStart: 1, unitEnd: 8, hasPrescribedCases: true },
      { name: 'Criminology and Penology', order: 2, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Procedural Law - II', order: 3, unitStart: 1, unitEnd: 5, hasPrescribedCases: true },
      { name: 'Company Law and Governance', order: 4, unitStart: 1, unitEnd: 6, hasPrescribedCases: true },
      { name: 'International Institutions', order: 5, unitStart: 1, unitEnd: 5 },
      { name: 'Legal Research Methodology', order: 6, unitStart: 1, unitEnd: 6 },
      { name: 'Juvenile Delinquency', order: 7, unitStart: 1, unitEnd: 6, hasPrescribedCases: true, isElective: true },
      { name: 'Election Law', order: 8, unitStart: 1, unitEnd: 7, hasPrescribedCases: true, isElective: true },
      { name: 'Securities Law', order: 9, unitStart: 1, unitEnd: 11, hasPrescribedCases: true, isElective: true },
      { name: 'International Air and Space Law', order: 10, unitStart: 1, unitEnd: 8, isElective: true }
    ]
  },
  {
    order: 6,
    name: '6th Semester',
    subjects: [
      { name: 'Corporate Law and Management', order: 1, unitStart: 1, unitEnd: 6, hasPrescribedCases: true },
      { name: 'Intellectual Property Law', order: 2, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Human Rights Law', order: 3, unitStart: 1, unitEnd: 7 },
      { name: 'Interpretation of Law', order: 4, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Law of Torts and Consumer Protection', order: 5, unitStart: 1, unitEnd: 6 },
      { name: 'Seminar - I (Doctrinal)', order: 6, isSeminar: true },
      { name: 'Insurance Law', order: 7, unitStart: 1, unitEnd: 7, hasPrescribedCases: true, isElective: true },
      { name: 'Socio Economic Crime', order: 8, unitStart: 1, unitEnd: 5, hasPrescribedCases: true, isElective: true },
      { name: 'International Humanitarian Law', order: 9, unitStart: 1, unitEnd: 5, isElective: true },
      { name: 'Forensic Science', order: 10, unitStart: 1, unitEnd: 11, hasPrescribedCases: true, isElective: true }
    ]
  },
  {
    order: 7,
    name: '7th Semester',
    subjects: [
      { name: 'Evidence Law', order: 1, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'International Trade Law', order: 2, unitStart: 1, unitEnd: 8 },
      { name: 'Environmental Law', order: 3, unitStart: 1, unitEnd: 5, hasPrescribedCases: true },
      { name: 'Clinical Law - I: Alternative Dispute Resolution', order: 4, unitStart: 1, unitEnd: 5 },
      { name: 'Administrative Law', order: 5, unitStart: 1, unitEnd: 9 },
      { name: 'Labour Law', order: 6, unitStart: 1, unitEnd: 9, hasPrescribedCases: true },
      { name: 'Forensic Medicine', order: 7, unitStart: 1, unitEnd: 8, hasPrescribedCases: true },
      { name: 'Fiscal Law', order: 8, unitStart: 1, unitEnd: 6, hasPrescribedCases: true },
      { name: 'International Refugee Law', order: 9, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Media Law', order: 10, unitStart: 1, unitEnd: 8, hasPrescribedCases: true }
    ]
  },
  {
    order: 8,
    name: '8th Semester',
    subjects: [
      { name: 'Law, Poverty and Development', order: 1, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Gender and Inclusive Justice', order: 2, unitStart: 1, unitEnd: 5, hasPrescribedCases: true },
      { name: 'Moot Court - I (Civil Case)', order: 3 },
      { name: 'Private International Law', order: 4, unitStart: 1, unitEnd: 9, hasPrescribedCases: true },
      { name: 'Cyber Law and Artificial Intelligence', order: 5, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Clinical Law - II (Conveyancing)', order: 6, unitStart: 1, unitEnd: 6 },
      { name: 'International Rivers and Sea Law', order: 7, unitStart: 1, unitEnd: 11, hasPrescribedCases: true, isElective: true },
      { name: 'Natural Resources Law', order: 8, unitStart: 1, unitEnd: 6, hasPrescribedCases: true, isElective: true },
      { name: 'Investment Law', order: 9, unitStart: 1, unitEnd: 6, hasPrescribedCases: true, isElective: true },
      { name: 'Business and Human Rights Law', order: 10, unitStart: 1, unitEnd: 7, isElective: true }
    ]
  },
  {
    order: 9,
    name: '9th Semester',
    subjects: [
      { name: 'Moot Court - II (Criminal Case)', order: 1 },
      { name: 'Law of Banking and Negotiable Instruments', order: 2, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Legislative Drafting', order: 3, unitStart: 1, unitEnd: 7 },
      { name: 'Taxation Law', order: 4, unitStart: 1, unitEnd: 8, hasPrescribedCases: true },
      { name: 'Seminar - II (Non-Doctrinal)', order: 5, isSeminar: true },
      { name: 'Energy Law', order: 6, unitStart: 1, unitEnd: 7, hasPrescribedCases: true, isElective: true },
      { name: 'Victimology', order: 7, unitStart: 1, unitEnd: 5, hasPrescribedCases: true, isElective: true },
      { name: 'Population Law', order: 8, unitStart: 1, unitEnd: 9, hasPrescribedCases: true, isElective: true },
      { name: 'Competition Law', order: 9, unitStart: 1, unitEnd: 8, hasPrescribedCases: true, isElective: true }
    ]
  },
  {
    order: 10,
    name: '10th Semester',
    subjects: [
      { name: 'Clinical Law - III (Placement)', order: 1 },
      { name: 'Social Work and Social Welfare Law', order: 2, unitStart: 1, unitEnd: 7, hasPrescribedCases: true },
      { name: 'Professional Ethics and Lawyering Skills', order: 3, unitStart: 1, unitEnd: 6, hasPrescribedCases: true },
      { name: 'Dissertation', order: 4 }
    ]
  }
];
