export interface LinkedInContact {
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  position?: string;
  connectedOn?: string;
  profileUrl?: string;
}

export interface ParsedLinkedInData {
  contacts: LinkedInContact[];
  uniqueCompanies: string[];
  totalContacts: number;
}

export interface LinkedInImportOptions {
  createBrands: boolean;
  connectToProject: boolean;
  projectId?: number;
  defaultCategory: string;
}
