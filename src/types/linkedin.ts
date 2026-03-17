export interface LinkedInContact {
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  position?: string;
  connectedOn?: string;
  profileUrl?: string;
  sector?: string;
  country?: string;
}

export interface ParsedLinkedInData {
  contacts: LinkedInContact[];
  uniqueCompanies: string[];
  totalContacts: number;
}

export interface LinkedInFileEntry {
  fileName: string;
  data: ParsedLinkedInData & { detectedHeaders: string[] };
}

export interface LinkedInImportOptions {
  createBrands: boolean;
  connectToProject: boolean;
  projectId?: number;
  defaultCategory: string;
}

export interface LinkedInEnrichedData {
  contacts: LinkedInContact[];
  companySectors: Record<string, string>;
  companyCountries: Record<string, string>;
  weakConnections: Array<{
    person1: string;
    person2: string;
    reason: string;
  }>;
}

export interface LinkedInFilterState {
  countries: Set<string>;
  sectors: Set<string>;
  companies: Set<string>;
}
