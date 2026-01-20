/**
 * Community-Reported Spam/Ghost Job Companies
 *
 * This list contains companies that users have reported for:
 * - Posting spam jobs
 * - Posting ghost jobs (jobs that don't actually exist)
 * - Questionable hiring practices
 *
 * Last updated: January 2026
 *
 * NOTE: This list is hardcoded for guaranteed offline availability.
 * Updates are shipped with extension updates.
 */

import { normalizeCompanyName } from '../../lib/utils';

export interface ReportedCompany {
  name: string;              // Original display name
  normalized: string;        // Normalized for matching (auto-generated)
  aliases?: string[];        // Alternative names/spellings (normalized)
  category: 'spam' | 'ghost' | 'scam';
  lastUpdated: string;       // ISO date string
}

// Helper to create entry with auto-normalized name
function createEntry(
  name: string,
  category: 'spam' | 'ghost' | 'scam' = 'ghost',
  aliases?: string[]
): ReportedCompany {
  return {
    name,
    normalized: normalizeCompanyName(name),
    aliases: aliases?.map(a => normalizeCompanyName(a)),
    category,
    lastUpdated: '2026-01-13'
  };
}

/**
 * January 2026 Community-Reported Companies List
 * 100+ companies reported for spam/ghost jobs
 */
export const REPORTED_COMPANIES: ReportedCompany[] = [
  // A
  createEntry('AbbVie'),
  createEntry('Accenture'),
  createEntry('Accruent'),
  createEntry('AECOM'),
  createEntry('Affinipay'),
  createEntry('Age of Learning'),
  createEntry('Aha!', 'ghost', ['aha']),
  createEntry('Apotex'),
  createEntry('Arrowstreet Capital'),
  createEntry('Ascendion'),
  createEntry('Assigncorp'),
  createEntry('Atlas Health'),
  createEntry('Atlassian'),
  createEntry('Aya Healthcare'),

  // B
  createEntry('Balfour Beatty', 'ghost', ['balfour beaty']),
  createEntry('Bank of America', 'ghost', ['bofa', 'bankofamerica']),
  createEntry('Beyond Trust', 'ghost', ['beyondtrust']),
  createEntry('Biorender'),
  createEntry('Bobsled'),
  createEntry('Booksource'),
  createEntry('Boston Scientific'),
  createEntry('Burt Intelligence'),
  createEntry('Business Wire'),

  // C
  createEntry('CACI'),
  createEntry("Caesar's", 'ghost', ['caesars', 'caesars entertainment']),
  createEntry('Cardinal Health'),
  createEntry('Cedars Sinai', 'ghost', ['cedars-sinai', 'cedarssinai']),
  createEntry('ChenMed'),
  createEntry('Clari'),
  createEntry('ClearWater', 'ghost', ['clearwater analytics']),
  createEntry('Clover'),
  createEntry('Code and Theory'),
  createEntry('Comcast'),
  createEntry('Contra'),
  createEntry('Cotiviti'),
  createEntry('Credit Acceptance'),
  createEntry('Crocs'),
  createEntry('Crossover'),
  createEntry('CVS', 'ghost', ['cvs health', 'cvs pharmacy']),

  // D
  createEntry('DCBL'),
  createEntry('Dice', 'spam', ['dice.com']),
  createEntry('DoorDash'),

  // E
  createEntry('Earnin'),
  createEntry('Embraer'),
  createEntry('Evidation'),
  createEntry('Excellence Services LLC'),
  createEntry('EY', 'ghost', ['ernst young', 'ernst & young']),

  // F
  createEntry('Fanatics'),
  createEntry('Files.com', 'ghost', ['filescom']),
  createEntry('FiServe', 'ghost', ['fiserv']),
  createEntry('FloQast'),
  createEntry('Fluency'),
  createEntry('FluentStream'),

  // G
  createEntry('GE Healthcare', 'ghost', ['ge health', 'general electric healthcare']),
  createEntry('Genworth'),
  createEntry('Golden Hippo'),
  createEntry('GoodRX', 'ghost', ['goodrx']),
  createEntry('Greendot', 'ghost', ['green dot']),

  // H
  createEntry('Harbor Freight Tools', 'ghost', ['harbor freight']),
  createEntry('Health Edge', 'ghost', ['healthedge']),
  createEntry('HireMeFast LLC', 'scam'),
  createEntry('HubSpot'),

  // J-K
  createEntry('JP Morgan Chase', 'ghost', ['jpmorgan', 'jp morgan', 'chase', 'jpmorganchase']),
  createEntry('Kforce'),
  createEntry("King's Hawaiian", 'ghost', ['kings hawaiian']),
  createEntry('Klaviyo'),
  createEntry('Kraft & Kennedy', 'ghost', ['kraft kennedy']),

  // L
  createEntry('Leidos'),
  createEntry('Lumenalta'),

  // M
  createEntry('Magistrate'),
  createEntry('Mandai'),
  createEntry('Matterport'),
  createEntry('Medix'),
  createEntry('Molina Health', 'ghost', ['molina healthcare']),
  createEntry('Motion Recruitment'),
  createEntry('Mozilla'),

  // N
  createEntry('NBC News'),
  createEntry('NBC Universal', 'ghost', ['nbcuniversal']),
  createEntry('NV5'),

  // O
  createEntry('Oneforma'),
  createEntry('OneTrust'),
  createEntry('Origin'),
  createEntry('Oscar Health'),

  // P
  createEntry('Paradox.ai', 'ghost', ['paradox ai', 'paradoxai']),
  createEntry('Polly'),
  createEntry('Posit'),
  createEntry('Prize Picks', 'ghost', ['prizepicks']),
  createEntry('Publicis Health'),

  // R
  createEntry('Raptive'),
  createEntry('Resmed', 'ghost', ['res med']),
  createEntry('Robert Half'),

  // S
  createEntry('Seetec'),
  createEntry('Signify Health'),
  createEntry('SmithRX'),
  createEntry('SoCal Edison', 'ghost', ['southern california edison', 'sce']),
  createEntry('SoCal Gas', 'ghost', ['southern california gas', 'socalgas']),
  createEntry('Softrams'),
  createEntry('Sonder'),
  createEntry('Stickermule', 'ghost', ['sticker mule']),
  createEntry('Sundays for Dogs'),
  createEntry('Sunnova'),
  createEntry('Swooped', 'scam'),

  // T
  createEntry('Tabby'),
  createEntry('Talentify.io', 'spam', ['talentify']),
  createEntry('Techie Talent', 'scam'),
  createEntry('TekSystems', 'ghost', ['tek systems']),
  createEntry('Terrabis'),
  createEntry('Thermo Fisher', 'ghost', ['thermo fisher scientific', 'thermofisher']),
  createEntry('Tickets.Com', 'ghost', ['ticketscom', 'tickets com']),
  createEntry('Tixr'),
  createEntry('Toast'),

  // U
  createEntry('UCLA Health'),
  createEntry('ULine', 'ghost', ['u-line']),
  createEntry('Underdog'),
  createEntry('Underdog Sports'),
  createEntry('Unisys'),

  // V
  createEntry('Vertafore'),
  createEntry('VXI'),

  // W-Y
  createEntry('Webstaurant', 'ghost', ['webstaurant store', 'webstaruant']),
  createEntry('Wrike'),
  createEntry('Yahoo News', 'ghost', ['yahoo']),

  // Special cases with numbers/symbols
  createEntry('1-800-Pack-Rat', 'ghost', ['1 800 pack rat', '1800packrat', '1 800 pack a rat', '1800 pack rat'])
];

/**
 * Build a Map for O(1) lookup by normalized company name
 */
export function buildReportedCompanyMap(): Map<string, ReportedCompany> {
  const map = new Map<string, ReportedCompany>();

  for (const company of REPORTED_COMPANIES) {
    // Add primary normalized name
    map.set(company.normalized, company);

    // Add aliases
    if (company.aliases) {
      for (const alias of company.aliases) {
        map.set(alias, company);
      }
    }
  }

  return map;
}

/**
 * Pre-built map for fast lookups
 */
export const REPORTED_COMPANY_MAP = buildReportedCompanyMap();

/**
 * Total count for display purposes
 */
export const REPORTED_COMPANY_COUNT = REPORTED_COMPANIES.length;
