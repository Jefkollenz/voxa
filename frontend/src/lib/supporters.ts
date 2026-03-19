// Word lists — Brazilian Portuguese style pseudonyms
const COLORS = [
  'Verde', 'Azul', 'Preto', 'Roxo', 'Dourado', 'Prata', 'Vermelho',
  'Laranja', 'Branco', 'Índigo', 'Carmim', 'Ciano', 'Âmbar', 'Esmeralda', 'Violeta', 'Coral',
]

const ANIMALS = [
  'Falcão', 'Lobo', 'Tigre', 'Águia', 'Leão', 'Urso', 'Raposa', 'Pantera',
  'Corvo', 'Dragão', 'Cobra', 'Tubarão', 'Gavião', 'Puma', 'Onça', 'Lince',
  'Touro', 'Golfinho', 'Condor', 'Javali', 'Morcego', 'Fênix',
]

/**
 * Generate a deterministic Reddit-style pseudonym from an MD5 email hash
 * Format: {Color}{Animal}{Number} e.g. "VerdeFalcão420"
 */
export function generatePseudonym(emailHash: string): string {
  const s0 = parseInt(emailHash.slice(0, 8), 16)
  const s1 = parseInt(emailHash.slice(8, 16), 16)
  const s2 = parseInt(emailHash.slice(16, 24), 16)

  const color = COLORS[s0 % COLORS.length]
  const animal = ANIMALS[s1 % ANIMALS.length]
  const number = (s2 % 900) + 100 // 100–999

  return `${color}${animal}${number}`
}

/**
 * Format a number as Brazilian Real currency
 * e.g. 85 → "R$ 85,00"
 */
export function formatBRL(amount: number): string {
  return `R$ ${Number(amount).toFixed(2).replace('.', ',')}`
}

// Type for supporter row returned by the RPC function
export type SupporterRow = {
  display_name: string
  is_anonymous: boolean
  total_paid: number
  email_hash: string
}
