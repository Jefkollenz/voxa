/** Taxa da plataforma sobre cada transação (10%) */
export const PLATFORM_FEE_RATE = 0.1

/** Percentual líquido que o criador recebe (90%) */
export const CREATOR_NET_RATE = 1 - PLATFORM_FEE_RATE

/** Prazo em horas para o criador responder antes do reembolso automático */
export const RESPONSE_DEADLINE_HOURS = 36

/**
 * Estimativa média da taxa de processamento do Mercado Pago para projeções.
 * PIX: ~0,99% | Cartão de crédito: ~2,99% + R$ 0,40 fixo.
 * Usada apenas em simuladores — valor real é armazenado em transactions.processing_fee.
 */
export const MP_PROCESSING_FEE_ESTIMATE = 0.012
