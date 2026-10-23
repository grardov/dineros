// Popular Mexican banks, fintechs and card issuers, roughly by how common they are. The account's
// `institution` stays free text; this only powers suggestions and the logo in the account tile.
// `logo` marks the ones with a public/institutions/<id>.png (128px, only where a sharp one exists).

export type Institution = { id: string; name: string; aliases: string[]; logo?: true };

export const INSTITUTIONS: Institution[] = [
  { id: "bbva", name: "BBVA", aliases: ["bancomer"], logo: true },
  { id: "banorte", name: "Banorte", aliases: [] },
  { id: "santander", name: "Santander", aliases: [], logo: true },
  { id: "banamex", name: "Banamex", aliases: ["citibanamex", "citi"] },
  { id: "nu", name: "Nu", aliases: ["nubank", "nu mexico"], logo: true },
  { id: "hsbc", name: "HSBC", aliases: [], logo: true },
  { id: "mercado-pago", name: "Mercado Pago", aliases: ["mercadopago"], logo: true },
  { id: "banco-azteca", name: "Banco Azteca", aliases: ["azteca"], logo: true },
  { id: "bancoppel", name: "BanCoppel", aliases: ["coppel"], logo: true },
  { id: "scotiabank", name: "Scotiabank", aliases: ["scotia"], logo: true },
  { id: "inbursa", name: "Inbursa", aliases: [] },
  { id: "hey-banco", name: "Hey Banco", aliases: ["hey"] },
  { id: "american-express", name: "American Express", aliases: ["amex"], logo: true },
  { id: "stori", name: "Stori", aliases: [], logo: true },
  { id: "klar", name: "Klar", aliases: [], logo: true },
  { id: "spin-by-oxxo", name: "Spin by OXXO", aliases: ["spin", "oxxo"] },
  { id: "banbajio", name: "BanBajío", aliases: ["bajio"], logo: true },
  { id: "banregio", name: "Banregio", aliases: [], logo: true },
  { id: "afirme", name: "Afirme", aliases: [], logo: true },
  { id: "liverpool", name: "Liverpool", aliases: [], logo: true },
  { id: "invex", name: "Invex", aliases: [] },
  { id: "uala", name: "Ualá", aliases: [], logo: true },
  { id: "openbank", name: "Openbank", aliases: [] },
  { id: "revolut", name: "Revolut", aliases: [], logo: true },
  { id: "cetesdirecto", name: "Cetesdirecto", aliases: ["cetes"] },
  { id: "gbm", name: "GBM", aliases: ["gbm+"], logo: true },
];

const norm = (s: string) =>
  ` ${s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim()} `;

// Whole-word match on the name or an alias, so "BBVA México" → BBVA but "Nuevo" isn't Nu.
// The longest match wins: "Spin by OXXO" over a bare "oxxo".
export function findInstitution(text: string | null) {
  if (!text) return undefined;
  const t = norm(text);
  let best: Institution | undefined;
  let bestLength = 0;
  for (const inst of INSTITUTIONS) {
    for (const key of [inst.name, ...inst.aliases].map(norm)) {
      if (t.includes(key) && key.length > bestLength) [best, bestLength] = [inst, key.length];
    }
  }
  return best;
}
