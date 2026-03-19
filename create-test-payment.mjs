import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTestPayment() {
  try {
    // 1. Get Henrique's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'henrique')
      .single();

    if (!profile) {
      console.log('❌ Profile @henrique not found');
      return;
    }

    const creatorId = profile.id;
    console.log('✅ Found @henrique:', creatorId);

    // 2. Create a question (paid, answered)
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert([
        {
          creator_id: creatorId,
          sender_name: 'João Silva',
          sender_email: 'joao@test.com',
          content: 'Como você começou no Voxa? Qual foi sua primeira pergunta?',
          price_paid: 25.00,
          service_type: 'base',
          is_anonymous: false,
          is_shareable: true,
          status: 'answered',
          response_text: 'Ótima pergunta! Tudo começou com uma ideia simples de conectar criadores com fãs.',
          answered_at: new Date().toISOString(),
        },
        {
          creator_id: creatorId,
          sender_name: 'Ana Costa',
          sender_email: 'ana@test.com',
          content: 'Qual é o maior desafio ao gerenciar criadores?',
          price_paid: 35.00,
          service_type: 'base',
          is_anonymous: false,
          is_shareable: true,
          status: 'answered',
          response_text: 'O maior desafio é garantir que todos se sintam valorizados.',
          answered_at: new Date().toISOString(),
        },
        {
          creator_id: creatorId,
          sender_name: 'unknown',
          sender_email: 'anonimo1@test.com',
          content: 'Qual é sua visão para o futuro do Voxa?',
          price_paid: 50.00,
          service_type: 'premium',
          is_anonymous: true,
          is_shareable: true,
          status: 'answered',
          response_text: 'Queremos ser a principal plataforma de monetização para criadores brasileiros.',
          answered_at: new Date().toISOString(),
        },
      ])
      .select('id');

    if (questionError) {
      console.log('❌ Error creating questions:', questionError);
      return;
    }

    console.log('✅ Created 3 test questions');

    // 3. Create transactions for each question
    const transactions = question.map((q, i) => ({
      question_id: q.id,
      amount: [25.00, 35.00, 50.00][i],
      status: 'approved',
      payment_method: 'credit_card',
      mp_payment_id: `TEST_${Date.now()}_${i}`,
      mp_preference_id: `PREF_${Date.now()}_${i}`,
    }));

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (transactionError) {
      console.log('❌ Error creating transactions:', transactionError);
      return;
    }

    console.log('✅ Created 3 test transactions');
    console.log('\n🎉 Test payment data created successfully!');
    console.log('💰 Total: R$ 110,00 for @henrique this month');
    console.log('\n👉 Refresh http://localhost:8080/perfil/henrique to see the ranking!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestPayment();
