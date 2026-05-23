import { LegalLayout, LegalSection } from "./LegalLayout";

// Dados de contato da empresa responsável pelo Deby Saúde.
const CONTACT_EMAIL = "assessoriadbe@gmail.com";
const COMPANY_CNPJ = "57.105.377/0001-22";
const GOVERNING_CITY = "Palmeira dos Índios/AL";
const LAST_UPDATED = "23 de maio de 2026";

export function TermsOfUsePage() {
  return (
    <LegalLayout
      title="Termos de Uso"
      subtitle="Condições que regem o uso da plataforma Deby Saúde pelas clínicas usuárias e seus profissionais."
      lastUpdated={LAST_UPDATED}
    >
      <p>
        Estes Termos de Uso ("Termos") regulam o acesso e a utilização da plataforma{" "}
        <strong>Deby Saúde</strong> ("plataforma", "serviço"). Ao criar uma conta ou utilizar o serviço,
        a clínica e seus usuários declaram ter lido, compreendido e aceito integralmente estes Termos.
      </p>

      <LegalSection title="1. Definições">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Plataforma:</strong> o sistema Deby Saúde de gestão clínica.</li>
          <li><strong>Clínica usuária:</strong> pessoa física ou jurídica que contrata o serviço.</li>
          <li><strong>Usuário:</strong> qualquer pessoa autorizada pela clínica a acessar a plataforma (admin, secretária, profissional).</li>
          <li><strong>Paciente:</strong> pessoa atendida pela clínica cujos dados são tratados na plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Descrição do serviço">
        <p>
          O Deby Saúde oferece, entre outros, recursos de agenda, prontuário eletrônico, atendimento via
          WhatsApp, teleconsulta por vídeo, financeiro, orçamentos, relatórios e assistente de
          inteligência artificial (Deby AI). Os recursos disponíveis podem variar conforme o plano
          contratado e podem ser atualizados ao longo do tempo.
        </p>
      </LegalSection>

      <LegalSection title="3. Cadastro e conta">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>As informações fornecidas no cadastro devem ser verdadeiras, completas e atualizadas;</li>
          <li>As credenciais de acesso são pessoais e intransferíveis; o usuário é responsável por mantê-las em sigilo;</li>
          <li>A clínica é responsável por todas as atividades realizadas com suas contas e pela gestão dos acessos da equipe;</li>
          <li>Notifique-nos imediatamente em caso de uso não autorizado da conta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Planos, pagamento e renovação">
        <p>
          O uso do serviço pode estar sujeito ao pagamento de assinatura conforme o plano contratado.
          Valores, periodicidade e condições de renovação ou cancelamento serão informados no momento da
          contratação. O não pagamento pode resultar em suspensão do acesso.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidades da clínica usuária">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Inserir e tratar os dados de pacientes em conformidade com a legislação aplicável, atuando como controladora dos dados;</li>
          <li>Obter os consentimentos necessários de seus pacientes, quando exigidos;</li>
          <li>Utilizar a plataforma apenas para fins lícitos e relacionados à atividade clínica;</li>
          <li>Garantir que seus profissionais cumpram as normas de seus respectivos conselhos de classe;</li>
          <li>Revisar todo conteúdo gerado por IA antes de utilizá-lo em decisões clínicas ou comunicações.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Uso aceitável">
        <p>É vedado ao usuário:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Acessar dados ou contas de outras clínicas sem autorização;</li>
          <li>Tentar burlar mecanismos de segurança, isolamento de dados ou controle de acesso;</li>
          <li>Utilizar a plataforma para envio de spam, mensagens ilícitas ou conteúdo que viole direitos de terceiros;</li>
          <li>Realizar engenharia reversa, copiar ou redistribuir o software sem autorização;</li>
          <li>Sobrecarregar a infraestrutura de forma maliciosa ou automatizada não autorizada.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Teleconsulta e atendimento clínico">
        <p>
          A plataforma fornece a infraestrutura tecnológica para teleconsulta e apoio ao atendimento,
          mas <strong>não presta serviços de saúde</strong>. A responsabilidade clínica é exclusivamente
          do profissional de saúde, que deve observar as normas de telemedicina e de seu conselho
          profissional. A qualidade da teleconsulta depende também da conexão de internet das partes.
        </p>
      </LegalSection>

      <LegalSection title="8. Inteligência Artificial (Deby AI)">
        <p>
          Os recursos de IA são ferramentas de apoio e podem conter imprecisões. Não constituem
          aconselhamento médico, jurídico, contábil ou financeiro. O profissional responsável deve sempre
          revisar e validar qualquer conteúdo antes de utilizá-lo.
        </p>
      </LegalSection>

      <LegalSection title="9. Propriedade intelectual">
        <p>
          O software, a marca, o design e os demais elementos da plataforma são de titularidade do Deby
          Saúde ou de seus licenciadores. O uso do serviço não transfere qualquer direito de propriedade
          intelectual. Os dados inseridos pela clínica permanecem de titularidade da clínica e de seus
          pacientes.
        </p>
      </LegalSection>

      <LegalSection title="10. Disponibilidade do serviço">
        <p>
          Empenhamo-nos para manter a plataforma disponível e segura, mas o serviço é fornecido "no estado
          em que se encontra". Poderá haver interrupções para manutenção, atualizações ou por fatores
          externos (como falhas de provedores de terceiros), sem que isso configure descumprimento destes
          Termos.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, o Deby Saúde não se responsabiliza por danos indiretos,
          lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso da
          plataforma, nem por decisões clínicas, comerciais ou administrativas tomadas pela clínica ou por
          seus profissionais.
        </p>
      </LegalSection>

      <LegalSection title="12. Privacidade e proteção de dados">
        <p>
          O tratamento de dados pessoais é regido pela nossa{" "}
          <a href="/privacidade" className="font-medium text-primary hover:underline">
            Política de Privacidade
          </a>
          , parte integrante destes Termos.
        </p>
      </LegalSection>

      <LegalSection title="13. Suspensão e rescisão">
        <p>
          Podemos suspender ou encerrar o acesso em caso de violação destes Termos, uso indevido ou
          inadimplência. A clínica pode encerrar sua conta a qualquer momento. Após o encerramento, os
          dados poderão ser excluídos ou anonimizados, respeitados os prazos legais de guarda
          (especialmente de prontuário). A clínica pode solicitar a exportação de seus dados antes do
          encerramento.
        </p>
      </LegalSection>

      <LegalSection title="14. Alterações dos Termos">
        <p>
          Estes Termos podem ser atualizados periodicamente. A data da última atualização é indicada no
          topo desta página. O uso continuado após alterações implica concordância com a nova versão.
        </p>
      </LegalSection>

      <LegalSection title="15. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
          comarca de {GOVERNING_CITY} para dirimir quaisquer controvérsias, salvo disposição legal em
          contrário.
        </p>
      </LegalSection>

      <LegalSection title="16. Contato">
        <p>
          Dúvidas sobre estes Termos podem ser enviadas para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>.
        </p>
        <p className="text-xs text-ink-muted">
          Deby Saúde · CNPJ {COMPANY_CNPJ} · {GOVERNING_CITY}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
