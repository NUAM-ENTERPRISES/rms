export type BulkSendCsvColumnId =
  | 'serialNo'
  | 'fullName'
  | 'passportNumber'
  | 'qualifications'
  | 'department'
  | 'totalYearsExperience'
  | 'dataFlow'
  | 'prometric'
  | 'recruiterName'
  | 'nationality'
  | 'gender'
  | 'yearOfGraduation'
  | 'gccExperience'
  | 'indianExperience'
  | 'dob'
  | 'age'
  | 'height'
  | 'weight'
  | 'religion'
  | 'saudiLicense'
  | 'scfhsIssueDate'
  | 'scfhsExpiryDate'
  | 'eligibilityNumber'
  | 'eligibilityIssueDate'
  | 'eligibilityExpiryDate'
  | 'currentLocation'
  | 'contactNumber'
  | 'emailId'
  | 'mumarisId'
  | 'mumarisPassword';

export interface BulkSendCsvColumnDefinition {
  id: BulkSendCsvColumnId;
  label: string;
}

export const MANDATORY_CSV_COLUMNS: BulkSendCsvColumnDefinition[] = [
  { id: 'serialNo', label: 'Serial No' },
  { id: 'fullName', label: 'Candidate Full Name' },
  { id: 'passportNumber', label: 'Passport Number' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'department', label: 'Departments' },
  { id: 'totalYearsExperience', label: 'Total Years of Experience' },
  { id: 'dataFlow', label: 'Data Flow' },
  { id: 'prometric', label: 'Prometric' },
];

export const OPTIONAL_CSV_COLUMNS: BulkSendCsvColumnDefinition[] = [
  { id: 'recruiterName', label: 'Recruiter Name' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'gender', label: 'Gender' },
  { id: 'yearOfGraduation', label: 'Year of Graduation' },
  { id: 'gccExperience', label: 'GCC Experience' },
  { id: 'indianExperience', label: 'Indian Experience' },
  { id: 'dob', label: 'DOB' },
  { id: 'age', label: 'Age' },
  { id: 'height', label: 'Height' },
  { id: 'weight', label: 'Weight' },
  { id: 'religion', label: 'Religion' },
  { id: 'saudiLicense', label: 'Saudi License' },
  { id: 'scfhsIssueDate', label: 'SCFHS Issue Date' },
  { id: 'scfhsExpiryDate', label: 'SCFHS Expiry Date' },
  { id: 'eligibilityNumber', label: 'Eligibility Number' },
  { id: 'eligibilityIssueDate', label: 'Eligibility Issue Date' },
  { id: 'eligibilityExpiryDate', label: 'Eligibility Expiry Date' },
  { id: 'currentLocation', label: 'Current Location' },
  { id: 'contactNumber', label: 'Contact Number' },
  { id: 'emailId', label: 'Email ID' },
  { id: 'mumarisId', label: 'Mumaris ID' },
  { id: 'mumarisPassword', label: 'Mumaris Password' },
];

export const ALL_CSV_COLUMNS: BulkSendCsvColumnDefinition[] = [
  ...MANDATORY_CSV_COLUMNS,
  ...OPTIONAL_CSV_COLUMNS,
];

export const CSV_COLUMN_BY_ID = Object.fromEntries(
  ALL_CSV_COLUMNS.map((column) => [column.id, column]),
) as Record<BulkSendCsvColumnId, BulkSendCsvColumnDefinition>;
