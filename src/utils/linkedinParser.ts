import { LinkedInContact, ParsedLinkedInData } from '@/types/linkedin';

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h ? normalizeColumnName(String(h)) : "");
  const normalizedNames = possibleNames.map(normalizeColumnName);

  for (const name of normalizedNames) {
    const idx = normalizedHeaders.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex(h => h.startsWith(name));
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex(h => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim().replace(/"/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/"/g, ''));
  return values;
}

const KNOWN_HEADERS = ['first name', 'last name', 'company', 'email', 'position', 'connected on', 'url', 'nome', 'sobrenome', 'empresa', 'cargo', 'e-mail', 'conectado em'];

function findHeaderRow(lines: string[]): number {
  const limit = Math.min(lines.length, 20);
  for (let i = 0; i < limit; i++) {
    const cols = parseCSVLine(lines[i]);
    const normalized = cols.map(c => normalizeColumnName(c));
    const matches = normalized.filter(n => KNOWN_HEADERS.includes(n));
    if (matches.length >= 2) return i;
  }
  return -1;
}

export const parseLinkedInCSV = (csvContent: string): ParsedLinkedInData & { detectedHeaders: string[] } => {
  // Remove BOM
  const content = csvContent.replace(/^\uFEFF/, '');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('Arquivo CSV vazio ou inválido');
  }

  const headerRowIndex = findHeaderRow(lines);
  if (headerRowIndex === -1) {
    const firstHeaders = lines.length > 0 ? parseCSVLine(lines[0]).join(', ') : '(vazio)';
    throw new Error(`Não foi possível encontrar os headers do LinkedIn no CSV. Primeira linha encontrada: ${firstHeaders}`);
  }

  const header = parseCSVLine(lines[headerRowIndex]);
  console.log('[LinkedIn Parser] Headers detectados:', header);

  const indexes = {
    firstName: findColumnIndex(header, ['first name', 'nome']),
    lastName: findColumnIndex(header, ['last name', 'sobrenome']),
    email: findColumnIndex(header, ['email', 'e-mail']),
    company: findColumnIndex(header, ['company', 'empresa']),
    position: findColumnIndex(header, ['position', 'cargo']),
    connectedOn: findColumnIndex(header, ['connected on', 'conectado em']),
    url: findColumnIndex(header, ['url', 'profile url']),
  };

  const contacts: LinkedInContact[] = [];
  const companiesSet = new Set<string>();

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const firstName = indexes.firstName >= 0 ? (values[indexes.firstName] || '') : '';
    const lastName = indexes.lastName >= 0 ? (values[indexes.lastName] || '') : '';

    if (!firstName && !lastName) continue;

    const contact: LinkedInContact = {
      firstName,
      lastName,
      email: indexes.email >= 0 ? values[indexes.email] : undefined,
      company: indexes.company >= 0 ? values[indexes.company] : undefined,
      position: indexes.position >= 0 ? values[indexes.position] : undefined,
      connectedOn: indexes.connectedOn >= 0 ? values[indexes.connectedOn] : undefined,
      profileUrl: indexes.url >= 0 ? values[indexes.url] : undefined,
    };

    contacts.push(contact);
    if (contact.company?.trim()) {
      companiesSet.add(contact.company.trim());
    }
  }

  console.log(`[LinkedIn Parser] ${contacts.length} contatos parsed de ${lines.length - headerRowIndex - 1} linhas de dados`);

  return {
    contacts,
    uniqueCompanies: Array.from(companiesSet),
    totalContacts: contacts.length,
    detectedHeaders: header,
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
