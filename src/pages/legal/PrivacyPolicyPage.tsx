import { LegalLayout, LegalSection } from "./LegalLayout";

// Dados de contato da empresa responsável pelo Deby Saúde.
const CONTACT_EMAIL = "assessoriadbe@gmail.com";
const COMPANY_CNPJ = "57.105.377/0001-22";
const COMPANY_CITY = "Palmeira dos Índios/AL";
const LAST_UPDATED = "23 de maio de 2026";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      subtitle="Como o Deby Saúde coleta, usa, armazena e protege os dados pessoais, em conformidade com a LGPD (Lei nº 13.709/2018)."
      lastUpdated={LAST_UPDATED}
    >
      <p>
        Esta Política de Privacidade descreve como a plataforma <strong>Deby Saúde</strong> ("plataforma",
        "nós") trata dados pessoais de clínicas usuárias, de seus profissionais e dos pacientes atendidos
        por meio do sistema. Ao utilizar o Deby Saúde, você concorda com as práticas aqui descritas.
      </p>

      <LegalSection title="1. Papéis: Controlador e Operador">
        <p>
          Nos termos da LGPD, os papéis de tratamento de dados se dividem da seguinte forma:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Clínica usuária (Controladora):</strong> cada clínica é a controladora dos dados de
            seus pacientes e decide quais informações inserir, para qual finalidade e por quanto tempo
            mantê-las.
          </li>
          <li>
            <strong>Deby Saúde (Operadora):</strong> tratamos os dados em nome da clínica, exclusivamente
            para fornecer e operar a plataforma, seguindo as instruções da clínica controladora.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>Coletamos diferentes categorias de dados conforme o uso da plataforma:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Dados de cadastro da clínica e usuários:</strong> nome da clínica, CNPJ, e-mail,
            nome dos profissionais e da equipe, credenciais de acesso e logo.
          </li>
          <li>
            <strong>Dados de pacientes (inseridos pela clínica):</strong> nome, CPF, data de nascimento,
            contato (WhatsApp, e-mail), endereço, convênio, histórico de agendamentos, prontuário
            eletrônico, evoluções clínicas e documentos anexados.
          </li>
          <li>
            <strong>Dados de comunicação:</strong> mensagens trocadas via WhatsApp integrado, observações
            internas e registros de atendimento.
          </li>
          <li>
            <strong>Dados de teleconsulta:</strong> registros de criação de sala, consentimento e horários
            de entrada e saída (o vídeo em si não é gravado pela plataforma).
          </li>
          <li>
            <strong>Dados de uso e técnicos:</strong> logs de acesso, data e hora de operações sensíveis
            (como acesso a prontuário) e dados necessários para segurança e auditoria.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades do tratamento">
        <p>Utilizamos os dados para:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Prestar os serviços de gestão clínica (agenda, prontuário, financeiro, atendimento);</li>
          <li>Permitir comunicação com pacientes via WhatsApp e envio de lembretes de consulta;</li>
          <li>Viabilizar teleconsultas por vídeo;</li>
          <li>Gerar relatórios, orçamentos e insights operacionais para a clínica;</li>
          <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais e regulatórias;</li>
          <li>Prestar suporte técnico e melhorar a plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Bases legais (LGPD)">
        <p>O tratamento de dados se apoia, conforme o caso, nas seguintes bases legais:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Execução de contrato</strong> com a clínica usuária (Art. 7º, V);</li>
          <li><strong>Cumprimento de obrigação legal/regulatória</strong>, incluindo guarda de prontuário (Art. 7º, II);</li>
          <li><strong>Consentimento</strong> do titular, quando aplicável — por exemplo, na gravação de transcrição da consulta pela IA e na entrada em teleconsulta (Art. 7º, I);</li>
          <li><strong>Tutela da saúde</strong>, em procedimento realizado por profissionais de saúde (Art. 11, II, "f", para dados sensíveis de saúde);</li>
          <li><strong>Legítimo interesse</strong>, para segurança e melhoria do serviço, sem prejuízo dos direitos do titular (Art. 7º, IX).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Inteligência Artificial (Deby AI)">
        <p>
          A plataforma oferece recursos de IA ("Deby AI") que auxiliam na transcrição de consultas,
          organização de prontuário, resumos e sugestões de resposta. Importante:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>A transcrição de voz da consulta ocorre mediante <strong>consentimento explícito</strong> registrado antes da gravação;</li>
          <li>Os textos enviados para processamento de IA são tratados apenas para gerar o resultado solicitado;</li>
          <li>A Deby AI é uma ferramenta de apoio e <strong>não substitui a decisão médica, comercial ou administrativa</strong> do profissional responsável, que deve sempre revisar o conteúdo gerado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Compartilhamento com terceiros">
        <p>
          Não vendemos dados pessoais. Compartilhamos dados apenas com prestadores de serviço
          (suboperadores) estritamente necessários para o funcionamento da plataforma:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Supabase</strong> — banco de dados, autenticação e armazenamento de arquivos;</li>
          <li><strong>Evolution API</strong> — gateway de mensagens do WhatsApp;</li>
          <li><strong>OpenRouter</strong> — processamento dos recursos de IA (Deby AI);</li>
          <li><strong>Whereby</strong> — infraestrutura de vídeo para teleconsulta;</li>
          <li><strong>Netlify</strong> — hospedagem da aplicação.</li>
        </ul>
        <p>
          Também poderemos compartilhar dados para cumprir ordem judicial ou exigência legal de
          autoridade competente.
        </p>
      </LegalSection>

      <LegalSection title="7. Transferência internacional">
        <p>
          Alguns provedores podem armazenar ou processar dados em servidores localizados fora do Brasil.
          Nesses casos, adotamos salvaguardas para assegurar nível de proteção compatível com a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Armazenamento e segurança">
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Isolamento de dados por clínica (multi-tenant) com regras de acesso a nível de banco (RLS);</li>
          <li>Criptografia em trânsito e em repouso;</li>
          <li>Documentos de prontuário em armazenamento privado, acessíveis apenas por links assinados temporários;</li>
          <li>Controle de acesso por perfil (admin, secretária, profissional) e registro de auditoria.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Retenção e exclusão">
        <p>
          Os dados são mantidos enquanto a clínica utilizar a plataforma e pelo prazo exigido por lei
          (por exemplo, a guarda obrigatória de prontuário médico). A clínica pode solicitar a
          anonimização de pacientes diretamente no sistema, sobrescrevendo dados identificáveis e
          preservando a integridade dos registros para fins legais.
        </p>
      </LegalSection>

      <LegalSection title="10. Direitos do titular">
        <p>
          Nos termos do Art. 18 da LGPD, o titular pode solicitar: confirmação da existência de
          tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização,
          bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre
          compartilhamento; e revogação do consentimento.
        </p>
        <p>
          Como o Deby Saúde atua como operador, solicitações de pacientes devem ser direcionadas
          primeiramente à <strong>clínica responsável (controladora)</strong>. Podemos auxiliar a clínica
          a atender essas solicitações.
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies e tecnologias semelhantes">
        <p>
          Utilizamos armazenamento local do navegador (como sessionStorage) apenas para manter a sessão
          de login e preferências de navegação. Não utilizamos cookies de publicidade ou rastreamento de
          terceiros.
        </p>
      </LegalSection>

      <LegalSection title="12. Dados de menores">
        <p>
          Quando a clínica atende pacientes menores de idade, o tratamento dos dados ocorre no melhor
          interesse do menor e sob responsabilidade da clínica e dos responsáveis legais, conforme a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="13. Alterações desta política">
        <p>
          Podemos atualizar esta Política periodicamente. A data da última atualização é indicada no topo
          desta página. Alterações relevantes poderão ser comunicadas pelos canais da plataforma.
        </p>
      </LegalSection>

      <LegalSection title="14. Contato e Encarregado (DPO)">
        <p>
          Para dúvidas sobre privacidade ou para exercer seus direitos, entre em contato pelo e-mail{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>.
        </p>
        <p className="text-xs text-ink-muted">
          Deby Saúde · CNPJ {COMPANY_CNPJ} · {COMPANY_CITY}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
