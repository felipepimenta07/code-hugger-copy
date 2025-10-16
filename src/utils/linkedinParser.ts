import { LinkedInContact, ParsedLinkedInData } from '@/types/linkedin';

export const parseLinkedInCSV = (csvContent: string): ParsedLinkedInData => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Arquivo CSV vazio ou inválido');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Find column indexes
  const indexes = {
    firstName: header.findIndex(h => h.toLowerCase().includes('first name')),
    lastName: header.findIndex(h => h.toLowerCase().includes('last name')),
    email: header.findIndex(h => h.toLowerCase().includes('email')),
    company: header.findIndex(h => h.toLowerCase().includes('company')),
    position: header.findIndex(h => h.toLowerCase().includes('position')),
    connectedOn: header.findIndex(h => h.toLowerCase().includes('connected on')),
    url: header.findIndex(h => h.toLowerCase().includes('url'))
  };

  const contacts: LinkedInContact[] = [];
  const companiesSet = new Set<string>();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    // Parse CSV considering quoted values
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/"/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/"/g, ''));

    // Create contact object
    const firstName = indexes.firstName >= 0 ? values[indexes.firstName] : '';
    const lastName = indexes.lastName >= 0 ? values[indexes.lastName] : '';
    
    if (!firstName && !lastName) continue;

    const contact: LinkedInContact = {
      firstName,
      lastName,
      email: indexes.email >= 0 ? values[indexes.email] : undefined,
      company: indexes.company >= 0 ? values[indexes.company] : undefined,
      position: indexes.position >= 0 ? values[indexes.position] : undefined,
      connectedOn: indexes.connectedOn >= 0 ? values[indexes.connectedOn] : undefined,
      profileUrl: indexes.url >= 0 ? values[indexes.url] : undefined
    };

    contacts.push(contact);

    // Collect unique companies
    if (contact.company && contact.company.trim()) {
      companiesSet.add(contact.company.trim());
    }
  }

  return {
    contacts,
    uniqueCompanies: Array.from(companiesSet),
    totalContacts: contacts.length
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
