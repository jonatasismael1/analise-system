import fs from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const marker = "DEMO_SEED_DEBY_2026";

const env = Object.fromEntries(
  fs
    .readFileSync("../.env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1)];
    }),
);

const dbUrl = new URL(env.SUPABASE_DB_URL);
const client = new pg.Client({
  host: "2600:1f1e:dbb:f602:559:cc7b:f22f:57c6",
  port: Number(dbUrl.port || 5432),
  database: dbUrl.pathname.slice(1),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  ssl: { rejectUnauthorized: false, servername: dbUrl.hostname },
  connectionTimeoutMillis: 8000,
  query_timeout: 20000,
});

const professionals = [
  ["Dra. Helena Martins", "Clínica Geral", "CRM-SP 182345"],
  ["Dr. Rafael Nogueira", "Gastroenterologia", "CRM-SP 156782"],
  ["Dra. Camila Barreto", "Dermatologia", "CRM-SP 204118"],
  ["Dr. André Valença", "Cardiologia", "CRM-SP 139904"],
  ["Dra. Priscila Azevedo", "Endocrinologia", "CRM-SP 177620"],
  ["Dra. Mariana Paiva", "Ginecologia", "CRM-SP 165441"],
  ["Dr. Lucas Moreira", "Ortopedia", "CRM-SP 198772"],
  ["Dra. Bianca Torres", "Pediatria", "CRM-SP 191033"],
  ["Dr. Henrique Costa", "Psiquiatria", "CRM-SP 188549"],
  ["Dra. Sofia Ribeiro", "Nutrologia", "CRM-SP 213086"],
];

const serviceSeeds = [
  ["Consulta clínica inicial", 40, 180, 0],
  ["Retorno clínico programado", 30, 120, 0],
  ["Consulta gastroenterológica", 45, 260, 1],
  ["Avaliação de refluxo e gastrite", 40, 230, 1],
  ["Consulta dermatológica", 40, 240, 2],
  ["Dermatoscopia digital", 30, 190, 2],
  ["Consulta cardiológica", 45, 280, 3],
  ["Eletrocardiograma com laudo", 25, 110, 3],
  ["Consulta endocrinológica", 45, 270, 4],
  ["Bioimpedância corporal", 20, 90, 4],
  ["Consulta ginecológica", 45, 250, 5],
  ["Preventivo ginecológico", 30, 140, 5],
  ["Consulta ortopédica", 40, 240, 6],
  ["Infiltração articular", 35, 360, 6],
  ["Consulta pediátrica", 40, 220, 7],
  ["Avaliação de desenvolvimento infantil", 45, 240, 7],
  ["Consulta psiquiátrica", 50, 320, 8],
  ["Sessão de acompanhamento psiquiátrico", 40, 260, 8],
  ["Consulta nutrológica", 45, 290, 9],
  ["Plano alimentar com revisão", 50, 340, 9],
];

const programSeeds = [
  ["AS Saúde Essencial", "Clínico geral, retorno e orientação preventiva para acompanhamento mensal.", [0, 1], 255],
  ["AS Gastro", "Programa para investigação e controle de sintomas gastrointestinais recorrentes.", [2, 3], 415],
  ["AS Dermato", "Rotina de pele com consulta, dermatoscopia e plano de cuidado.", [4, 5], 365],
  ["AS Cardio", "Avaliação cardiológica com exame complementar e orientação de risco.", [6, 7], 335],
  ["AS Endócrino", "Acompanhamento metabólico com consulta e bioimpedância.", [8, 9], 310],
  ["AS Mulher", "Linha de cuidado ginecológico com consulta e preventivo.", [10, 11], 330],
  ["AS Kids", "Cuidado pediátrico com avaliação de crescimento e retorno orientado.", [14, 15], 390],
  ["AS Orto Movimento", "Avaliação ortopédica e procedimento terapêutico quando indicado.", [12, 13], 510],
  ["AS Mente", "Consulta e sessão de acompanhamento em saúde mental.", [16, 17], 500],
  ["AS Check-up Premium", "Check-up integrado com clínica, cardio, exames e nutrologia.", [0, 6, 7, 18], 760],
];

const patients = [
  ["Ana Clara Souza", "1988-04-17", "Consulta cardiológica preventiva", "retorno"],
  ["Bruno Almeida Lima", "1979-09-03", "Dor epigástrica recorrente há 3 semanas", "agendado"],
  ["Carolina Mendes Rocha", "1995-12-11", "Avaliação de lesões pigmentadas", "agendado"],
  ["Diego Santos Pereira", "1983-06-24", "Controle de pressão arterial", "agendado"],
  ["Eduarda Nunes Ferreira", "1991-02-08", "Oscilação de peso e fadiga", "agendado"],
  ["Felipe Carvalho Dias", "1976-11-19", "Dor no joelho direito após corrida", "agendado"],
  ["Gabriela Teixeira Alves", "2000-05-27", "Consulta ginecológica de rotina", "agendado"],
  ["Henrique Martins Castro", "2018-08-14", "Acompanhamento pediátrico", "agendado"],
  ["Isabela Ramos Vieira", "1986-10-22", "Ansiedade e dificuldade para dormir", "agendado"],
  ["João Pedro Barbosa", "1992-01-30", "Ajuste alimentar e composição corporal", "agendado"],
  ["Larissa Freitas Gomes", "1974-07-06", "Check-up anual", "agendado"],
  ["Marcelo Oliveira Reis", "1969-03-12", "Retorno de gastroenterologia", "agendado"],
  ["Natália Correia Dias", "1998-09-21", "Acne adulta e manchas", "agendado"],
  ["Otávio Cunha Ribeiro", "1981-12-04", "Avaliação cardiometabólica", "agendado"],
  ["Patrícia Lopes Fernandes", "1990-04-09", "Acompanhamento endocrinológico", "agendado"],
  ["Renata Lima Afonso", "1985-06-02", "Planejamento preventivo familiar", "novo"],
  ["Samuel Costa Melo", "1978-02-18", "Dor lombar crônica", "novo"],
  ["Tatiane Borges Neves", "1994-08-25", "Avaliação dermatológica preventiva", "novo"],
  ["Vinícius Araújo Pinto", "1989-11-07", "Rotina de saúde mental", "novo"],
  ["Yasmin Cardoso Farias", "2001-01-16", "Reeducação alimentar", "novo"],
];

const appointmentPlan = [
  ["2026-06-26", "08:00", 0, 6, "presencial"],
  ["2026-06-26", "09:00", 1, 2, "teleconsulta"],
  ["2026-06-26", "10:00", 2, 4, "presencial"],
  ["2026-06-26", "14:00", 3, 7, "teleconsulta"],
  ["2026-06-27", "08:30", 4, 8, "presencial"],
  ["2026-06-27", "09:30", 5, 12, "presencial"],
  ["2026-06-27", "10:30", 6, 10, "teleconsulta"],
  ["2026-06-27", "15:00", 7, 14, "presencial"],
  ["2026-06-28", "08:00", 8, 16, "teleconsulta"],
  ["2026-06-28", "09:00", 9, 18, "presencial"],
  ["2026-06-28", "11:00", 10, 0, "presencial"],
  ["2026-06-28", "16:00", 11, 3, "presencial"],
  ["2026-06-29", "08:30", 12, 5, "presencial"],
  ["2026-06-29", "10:00", 13, 6, "teleconsulta"],
  ["2026-06-29", "14:30", 14, 8, "presencial"],
];

function cpf(index) {
  return `${String(320 + index).padStart(3, "0")}.${String(450 + index).padStart(3, "0")}.${String(780 + index).padStart(3, "0")}-${String(10 + index).padStart(2, "0")}`;
}

function phone(index) {
  return `+55119${String(71000000 + index * 137).padStart(8, "0")}`;
}

async function cleanup(clinicId) {
  const demoPatients = "select id from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local'";
  const demoPrograms = "select id from public.programas_desconto where clinica_id = $1 and descricao ilike '%' || $2 || '%'";
  await client.query(`delete from public.patient_program_memberships where clinica_id = $1 and (patient_id in (${demoPatients}) or program_id in (${demoPrograms}))`, [clinicId, marker]);
  await client.query(`delete from public.teleconsultations where clinica_id = $1 and appointment_id in (select id from public.agendamentos where clinica_id = $1 and paciente_id in (${demoPatients}))`, [clinicId]);
  await client.query(`delete from public.prontuarios where clinica_id = $1 and paciente_id in (${demoPatients})`, [clinicId]);
  await client.query(`delete from public.pagamentos where clinica_id = $1 and (descricao ilike '%' || $2 || '%' or paciente_id in (${demoPatients}))`, [clinicId, marker]);
  await client.query("delete from public.despesas where clinica_id = $1 and descricao ilike '%' || $2 || '%'", [clinicId, marker]);
  await client.query(`delete from public.agendamentos where clinica_id = $1 and paciente_id in (${demoPatients})`, [clinicId]);
  await client.query(`delete from public.programas_desconto_servicos where clinica_id = $1 and programa_id in (${demoPrograms})`, [clinicId, marker]);
  await client.query(`delete from public.programas_desconto where clinica_id = $1 and descricao ilike '%' || $2 || '%'`, [clinicId, marker]);
  await client.query("delete from public.servicos where clinica_id = $1 and nome = any($2::text[])", [clinicId, serviceSeeds.map((service) => service[0])]);
  await client.query("delete from public.profissionais where clinica_id = $1 and email like 'medico.demo+%@deby.local'", [clinicId]);
  await client.query("delete from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local'", [clinicId]);
}

async function main() {
  await client.connect();
  await client.query("set statement_timeout = '20s'");

  const clinic = await client.query("select id from public.clinicas where slug = 'analise-saude' limit 1");
  if (clinic.rowCount !== 1) throw new Error("Clínica analise-saude não encontrada.");
  const clinicId = clinic.rows[0].id;

  console.log("Limpando carga demo anterior...");
  await cleanup(clinicId);

  console.log("Inserindo médicos e serviços...");
  const profRows = [];
  for (let i = 0; i < professionals.length; i += 1) {
    const [nome, especialidade, registro] = professionals[i];
    const res = await client.query(
      `
        insert into public.profissionais (clinica_id, nome, especialidade, email, telefone, registro, conselho, ativo, horarios)
        values ($1, $2, $3, $4, $5, $6, 'CRM-SP', true, $7::jsonb)
        returning id, nome, especialidade
      `,
      [clinicId, nome, especialidade, `medico.demo+${i + 1}@deby.local`, phone(100 + i), registro, JSON.stringify({ dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00", intervalo_min: 30 })],
    );
    profRows.push(res.rows[0]);
  }

  const serviceRows = [];
  for (const [nome, duracao, preco, profIndex] of serviceSeeds) {
    const res = await client.query(
      `
        insert into public.servicos (clinica_id, profissional_id, nome, duracao_min, preco, ativo)
        values ($1, $2, $3, $4, $5, true)
        returning id, nome, preco, profissional_id
      `,
      [clinicId, profRows[profIndex].id, nome, duracao, preco],
    );
    serviceRows.push(res.rows[0]);
  }

  console.log("Inserindo programas de vantagem...");
  const programRows = [];
  for (const [nome, descricao, serviceIndexes, discounted] of programSeeds) {
    const total = serviceIndexes.reduce((sum, idx) => sum + Number(serviceRows[idx].preco), 0);
    const program = await client.query(
      `
        insert into public.programas_desconto (clinica_id, nome, descricao, valor_total, valor_com_desconto, ativo)
        values ($1, $2, $3, $4, $5, true)
        returning id, nome
      `,
      [clinicId, nome, `${descricao}\n${marker}`, total, discounted],
    );
    for (let order = 0; order < serviceIndexes.length; order += 1) {
      const service = serviceRows[serviceIndexes[order]];
      await client.query(
        `
          insert into public.programas_desconto_servicos (programa_id, clinica_id, servico_id, nome_servico, descricao, preco_individual, ordem)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [program.rows[0].id, clinicId, service.id, service.nome, `Item vinculado ao programa de demonstração. ${marker}`, service.preco, order],
      );
    }
    programRows.push(program.rows[0]);
  }

  console.log("Inserindo pacientes...");
  const patientRows = [];
  for (let i = 0; i < patients.length; i += 1) {
    const [nome, nascimento, queixa, stage] = patients[i];
    const prof = profRows[i % profRows.length];
    const res = await client.query(
      `
        insert into public.pacientes (clinica_id, nome, whatsapp, email, cpf, data_nascimento, endereco, status, profissional_id, ultimo_atendimento, proximo_retorno, kanban_stage, valor_total_gasto, observacoes, convenio)
        values ($1, $2, $3, $4, $5, $6, $7, 'ativo', $8, $9, $10, $11, $12, $13, $14)
        returning id, nome, whatsapp
      `,
      [
        clinicId,
        nome,
        phone(i + 1),
        `paciente.demo+${i + 1}@deby.local`,
        cpf(i + 1),
        nascimento,
        `Rua das Acácias, ${120 + i} - São Paulo/SP`,
        prof.id,
        i < 10 ? "2026-05-20" : null,
        i < 15 ? "2026-06-26" : null,
        stage,
        i < 15 ? 180 + (i % 6) * 70 : 0,
        `${marker}. Paciente fictício para demonstração operacional do Deby Saúde. Queixa base: ${queixa}.`,
        i % 4 === 0 ? "AS Saúde" : i % 4 === 1 ? "Particular" : i % 4 === 2 ? "AS Premium" : "Empresa parceira",
      ],
    );
    patientRows.push({ ...res.rows[0], queixa, profIndex: i % profRows.length });
  }

  for (let i = 0; i < 8; i += 1) {
    await client.query(
      `
        insert into public.patient_program_memberships (clinica_id, patient_id, program_id, role, holder_patient_id, relationship, status, start_date, notes)
        values ($1, $2, $3, 'holder', null, null, 'active', '2026-05-22', $4)
      `,
      [clinicId, patientRows[i].id, programRows[i % programRows.length].id, `${marker}. Associação de demonstração para programa de vantagens.`],
    );
  }

  console.log("Inserindo agenda, teleconsultas e prontuários...");
  const appointmentRows = [];
  for (const [date, time, patientIndex, serviceIndex, type] of appointmentPlan) {
    const patient = patientRows[patientIndex];
    const service = serviceRows[serviceIndex];
    const res = await client.query(
      `
        insert into public.agendamentos (clinica_id, profissional_id, servico_id, paciente_id, paciente_nome, paciente_whatsapp, data, horario, status, tipo_atendimento, convenio)
        values ($1, $2, $3, $4, $5, $6, $7, $8::time, 'confirmado', $9, $10)
        returning id, paciente_id, profissional_id, servico_id, data, horario, tipo_atendimento
      `,
      [clinicId, service.profissional_id, service.id, patient.id, patient.nome, patient.whatsapp, date, time, type, patientIndex % 3 === 0 ? "AS Saúde" : "Particular"],
    );
    appointmentRows.push(res.rows[0]);
  }

  for (const appt of appointmentRows.filter((row) => row.tipo_atendimento === "teleconsulta")) {
    const token = crypto.randomUUID();
    await client.query(
      `
        insert into public.teleconsultations (clinica_id, appointment_id, patient_id, professional_id, whereby_meeting_id, whereby_room_url, whereby_host_room_url, provider, status, patient_access_token, patient_access_url, token_expires_at, consent_status, link_sent_at)
        values ($1, $2, $3, $4, $5, $6, $7, 'whereby', 'link_enviado', $8, $9, ($10::date + interval '1 day')::timestamptz, 'pendente', now())
      `,
      [clinicId, appt.id, appt.paciente_id, appt.profissional_id, `demo-${token.slice(0, 8)}`, `https://dbe-digital.whereby.com/demo-deby-${token.slice(0, 8)}`, `https://dbe-digital.whereby.com/demo-deby-${token.slice(0, 8)}?roomKey=demo`, token, `https://analise-system.netlify.app/teleconsulta/${token}`, appt.data],
    );
  }

  for (let i = 0; i < patientRows.length; i += 1) {
    const patient = patientRows[i];
    const appt = appointmentRows.find((row) => row.paciente_id === patient.id) ?? null;
    await client.query(
      `
        insert into public.prontuarios (clinica_id, paciente_id, agendamento_id, profissional_id, queixa, evolucao, conduta, imagens, criado_em, atualizado_em)
        values ($1, $2, $3, $4, $5, $6, $7, '{}'::text[], $8::timestamptz, $8::timestamptz)
      `,
      [
        clinicId,
        patient.id,
        appt?.id ?? null,
        appt?.profissional_id ?? profRows[patient.profIndex].id,
        patient.queixa,
        `<p><strong>Histórico:</strong> ${marker}. Paciente relata ${patient.queixa.toLowerCase()}.</p><p><strong>Exame/avaliação:</strong> sinais estáveis, sem intercorrências no atendimento de demonstração.</p>`,
        `Plano inicial registrado para demonstração: orientar sinais de alerta, manter acompanhamento e retornar conforme agendamento. ${i < 15 ? "Consulta vinculada à agenda de 26 a 29/06/2026." : "Paciente sem agendamento futuro nesta carga."}`,
        i < 15 ? "2026-06-20 12:00:00-03" : "2026-05-24 12:00:00-03",
      ],
    );
  }

  console.log("Inserindo financeiro...");
  for (let i = 0; i < appointmentRows.length; i += 1) {
    const appt = appointmentRows[i];
    const service = serviceRows.find((row) => row.id === appt.servico_id);
    await client.query(
      `
        insert into public.pagamentos (clinica_id, paciente_id, servico_id, profissional_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, descricao, convenio, observacao)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        clinicId,
        appt.paciente_id,
        appt.servico_id,
        appt.profissional_id,
        service?.preco ?? 180,
        appt.data,
        i < 9 ? appt.data : null,
        i < 9 ? "pago" : i === 14 ? "atrasado" : "pendente",
        i % 4 === 0 ? "pix" : i % 4 === 1 ? "cartao_credito" : i % 4 === 2 ? "cartao_debito" : "dinheiro",
        `${marker} - Receita de consulta: ${service?.nome ?? "Atendimento"}`,
        i % 3 === 0 ? "AS Saúde" : "Particular",
        "Lançamento fictício para demonstração financeira.",
      ],
    );
  }

  for (let i = 0; i < 5; i += 1) {
    await client.query(
      `
        insert into public.pagamentos (clinica_id, paciente_id, valor, data_vencimento, data_pagamento, status, forma_pagamento, descricao, convenio, observacao)
        values ($1, $2, $3, $4, $4, 'pago', 'pix', $5, 'AS Saúde', $6)
      `,
      [clinicId, patientRows[15 + i].id, programSeeds[i][3], `2026-06-${String(10 + i).padStart(2, "0")}`, `${marker} - Adesão ao programa ${programSeeds[i][0]}`, "Venda demonstrativa de programa de vantagens."],
    );
  }

  const expenses = [
    ["Aluguel da unidade - junho", "estrutura", 6800, "2026-06-05", "pago", "transferencia", "Imobiliária Centro Saúde"],
    ["Materiais descartáveis e EPIs", "insumos", 1840, "2026-06-07", "pago", "pix", "MedSupply Distribuidora"],
    ["Campanha de tráfego local", "marketing", 1250, "2026-06-12", "pago", "cartao_credito", "Agência Local Ads"],
    ["Sistema e infraestrutura digital", "tecnologia", 890, "2026-06-15", "pendente", "boleto", "SaaS Operacional"],
    ["Limpeza e conservação", "operação", 760, "2026-06-18", "pago", "pix", "Clean Saúde"],
    ["Manutenção de equipamentos", "manutenção", 1320, "2026-06-20", "pendente", "boleto", "BioTech Service"],
    ["Repasse laboratório parceiro", "parcerias", 2100, "2026-06-22", "pago", "transferencia", "Lab Diagnóstico"],
    ["Treinamento da equipe de recepção", "pessoas", 620, "2026-06-24", "pago", "pix", "Academia Atendimento"],
  ];
  for (const [descricao, categoria, valor, data, status, forma, fornecedor] of expenses) {
    await client.query(
      `
        insert into public.despesas (clinica_id, descricao, categoria, valor, data, status, forma_pagamento, fornecedor, observacao)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [clinicId, `${marker} - ${descricao}`, categoria, valor, data, status, forma, fornecedor, "Despesa fictícia para demonstração do módulo financeiro."],
    );
  }

  const summary = await client.query(
    `
      select 'profissionais_demo' as item, count(*)::int as total from public.profissionais where clinica_id = $1 and email like 'medico.demo+%@deby.local'
      union all select 'servicos_demo', count(*)::int from public.servicos where clinica_id = $1 and nome = any($2::text[])
      union all select 'programas_demo', count(*)::int from public.programas_desconto where clinica_id = $1 and descricao ilike '%' || $3 || '%'
      union all select 'pacientes_demo', count(*)::int from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local'
      union all select 'agendamentos_26_29_jun', count(*)::int from public.agendamentos where clinica_id = $1 and data between '2026-06-26' and '2026-06-29' and paciente_id in (select id from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local')
      union all select 'teleconsultas_demo', count(*)::int from public.teleconsultations where clinica_id = $1 and appointment_id in (select id from public.agendamentos where clinica_id = $1 and paciente_id in (select id from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local'))
      union all select 'prontuarios_demo', count(*)::int from public.prontuarios where clinica_id = $1 and paciente_id in (select id from public.pacientes where clinica_id = $1 and email like 'paciente.demo+%@deby.local')
      union all select 'pagamentos_demo', count(*)::int from public.pagamentos where clinica_id = $1 and descricao ilike '%' || $3 || '%'
      union all select 'despesas_demo', count(*)::int from public.despesas where clinica_id = $1 and descricao ilike '%' || $3 || '%'
    `,
    [clinicId, serviceSeeds.map((service) => service[0]), marker],
  );
  console.table(summary.rows);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await client.end();
  } catch {
    // ignore shutdown errors
  }
}
