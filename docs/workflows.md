# Documentação de Fluxos de Negócio e Webhooks - VOXA

Este documento explora processos críticos de negócios, como aprovação de pagamentos e expirações forçadas por tempo de limite.

## 1. Fluxo de Pagamentos e Webhook Handshake (Mercado Pago)

O _Frontend_ nunca tem autonomia para aprovar ou liberar o status definitivo de um pagamento.
O processo segue uma abordagem Server-to-Server autoritativa via Webhook:

1. **Criação de Intenção:**
   A rota `/api/payment/create-preference` providencia a reserva e proteção slot de uma nova atividade no table `payment_intents`, efetuando o repasse a plataforma do form Mercado Pago e gerando link para redireção Checkout PRO.
2. **Confirmação HMAC e Transação:**
   Assim que aprovado ou rejeitado no celular, o Mercado Pago faz PING em nossa Edge API Webhook. Nossa API calcula a validade do `X-Signature` HMAC SHA256 com _timestamp_ fornecido. Se devidamente validado (legítimo), nossa rotina insere imediatamente o extrato do sucesso em `transactions` e realiza o repasse (move) do ticket da área provisória pra fila ativa em `questions`.
3. **Prevenção de Overselling:**
   O Webhook também confere em duplicata (lock) os parâmetros de caixa/slots no momento preciso de validar a aprovação. Se já estiver "lotado" em limites diários, o webhook proativo cancela ou emite reembolso (Refund API) pelo provedor bloqueando prejuízo logístico do criador.

## 2. Prazos, Timeout de Resposta e Estornos Automáticos

Todo criador tem até 36 horas ininterruptas para responder perguntas originadas pela audiência na plataforma. Esta não é uma recomendação comercial forte, é um trigger do sistema.

**Rotina Recorrente (Cron Job):**
O arquivo _handler_ em `app/api/cron/expire-questions` desperta esporadicamente acionado via Job serverless agendado (Render Cron):
- O código varre tabelas à procura de items filtrados onde `status = 'pending'` cuja `created_at` seja mais velha que 36h do tempo transcorrido atual.
- Ao achar corrupções ao prazo prometido via Acordo de Termos de Uso com o fã, o status avança para `expired`.
- Executa imediatas chamadas Rest `POST` à API MP "Refund" pra ressarcir e estornar o usuário original daquele capital de forma passiva.

Se for operar sobre essas APIs, certifique-se de realizar mocks precisos utilizando o Sandbox do MP para não ativar reembolsos falsos.
