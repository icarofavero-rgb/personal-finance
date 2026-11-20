import { useState } from 'react'
import {
  ArrowLeftRight,
  Bug,
  CalendarDays,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Heart,
  LifeBuoy,
  MessageCircle,
  Palette,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Lock,
  Smartphone,
  Search,
  X,
} from 'lucide-react'

import { getPlatform } from '../hooks/useDeviceClass'
import { requestOpenTutorial } from '../services/onboardingStorage'
import { normalizeSearch } from '../services/transactionSearch'
import '../styles/savings.css'
import '../styles/help-center.css'

/** Repositório público do projeto (onde as mensagens podem ser abertas). */
const ISSUES_URL = 'https://github.com/icarofavero-rgb/personal-finance/issues/new'
const DEVELOPER = 'Ícaro'
const INSTAGRAM_USER = 'zi_crinho'
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USER}/`

/** Ícone simples de câmera (estilo do Instagram) — o lucide não tem marcas. */
function InstagramGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

type Topic = {
  icon: typeof LifeBuoy
  title: string
  items: { question: string; answer: string }[]
}

const TOPICS: Topic[] = [
  {
    icon: Sparkles,
    title: 'Primeiros passos',
    items: [
      {
        question: 'Por onde eu começo?',
        answer:
          'Cadastre suas entradas (salário, freelas) e saídas no botão “+ Nova transação”. Se usa cartão de crédito, cadastre seus cartões em Cartões. O Dashboard passa a mostrar o resumo do mês automaticamente.',
      },
      {
        question: 'Como vejo o tutorial de novo?',
        answer: 'Use o botão “Ver tutorial novamente” aqui na Central de ajuda (quadro “Atalhos”).',
      },
      {
        question: 'O que são os “Destaques do mês” no Dashboard?',
        answer:
          'São comparações automáticas com o mês anterior: se você gastou mais ou menos, a categoria que mais subiu, a que mais caiu e quanto sobrou das suas entradas. No mês atual, a comparação vai até o mesmo dia do mês passado (dia 18 com dia 18), para ser justa.',
      },
      {
        question: "Para que serve o “Período” no Dashboard?",
        answer:
          "Ele escolhe o mês e o ano que o Dashboard inteiro mostra: entradas, saídas, resultado, gráficos e cartões. As saídas juntam todas as formas de pagamento (Pix, débito, dinheiro, boleto e cartão de crédito). Quando o mês vira, o app passa sozinho para o mês novo.",
      },
      {
        question: "O que é o “Saldo projetado para o mês seguinte”?",
        answer:
          "É uma prévia do próximo mês: as faturas dos cartões, os boletos e as outras contas já agendadas para ele, descontados das entradas previstas. Toque no ícone do bloco para ver a lista do que entra na conta.",
      },
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Transações',
    items: [
      {
        question: 'Como edito ou excluo uma transação?',
        answer:
          "Na lista de transações, toque no lápis para editar ou na lixeira para excluir. Todas podem ser editadas: compras no cartão abrem com o cartão e as parcelas (as faturas se recalculam); pagamentos de fatura e de dívidas (Eu devo) mudam também o pagamento ligado a eles quando você troca o valor ou a data. Compras ligadas a uma dívida de Devedores têm o valor e as parcelas mudados pela própria dívida. Pagamentos de fatura não podem ser excluídos por aqui, para não bagunçar o histórico do cartão.",
      },
      {
        question: 'Como procuro uma transação?',
        answer:
          'Em Transações, use a busca no topo da lista. Ela procura no nome, na categoria e no valor, sem se importar com acentos: “farmacia”, “uber” ou “45,90” funcionam. O app mostra quantos resultados encontrou e o total deles. Dá para combinar a busca com os filtros de mês, categoria e tipo.',
      },
      {
        question: "Por que minhas compras no cartão aparecem no histórico?",
        answer:
          "Para você ver todas as saídas num lugar só. Cada parcela aparece no mês dela, com a etiqueta 💳 e o nome do cartão; os boletos ganham a etiqueta “Boleto”. Parcelas de meses futuros aparecem quando você filtra o mês delas. O pagamento da fatura não é somado de novo, para nada contar em dobro.",
      },
      {
        question: "Como lanço um boleto?",
        answer:
          "Em “Nova transação”, escolha Saída e a forma de pagamento “Boleto”. A categoria vira “Boletos” e o campo de data vira “Data de pagamento”. O boleto aparece no Calendário nesse dia e o sininho avisa quando ele estiver chegando.",
      },
      {
        question: "Como marco um boleto como pago?",
        answer:
          "Em Transações, cada boleto mostra a situação: “a pagar”, “vencido” ou “pago em …”. Toque no botão de ✓ ao lado dele para registrar o pagamento (com a data de hoje). Boleto pago some dos avisos e aparece como concluído no Calendário. Tocou sem querer? Toque de novo para desfazer.",
      },
      {
        question: "Como filtro uma categoria inteira?",
        answer:
          "No filtro “Categoria” de Transações, escolha a opção “(todas)” da categoria, por exemplo “Alimentação (todas)”: aparecem Supermercado, Restaurante, Delivery… juntos. Abaixo dela dá para escolher uma subcategoria só. O filtro inclui as compras no cartão.",
      },
      {
        question: "Para que serve a “Observação” na transação?",
        answer:
          "É um campo opcional para lembrar detalhes: “dividido com a Ana”, “presente da mãe”, “parcela 2 do curso”. Ela aparece embaixo do nome da transação ou da compra no cartão.",
      },
      {
        question: "Por que apareceu o símbolo do Uber, Spotify, Netflix…?",
        answer:
          "Quando a descrição tem o nome de um serviço conhecido (Uber, iFood, YouTube, Spotify, Netflix, Disney+, PlayStation, bancos e outros), o app mostra o símbolo dele ao lado, já enquanto você digita, e sugere a categoria (Spotify → Lazer / Assinaturas, Uber → Transporte / Aplicativos de transporte, iFood → Alimentação / Delivery). Maiúsculas, minúsculas e pequenos erros de digitação não atrapalham: “spotfy”, “SPOTFY” ou “Netflx” também funcionam. Se você escolher a categoria antes, o app respeita a sua escolha. Funciona em Transações, nas compras e nas faturas do cartão.",
      },
      {
        question: 'Como faço o salário ou o aluguel entrarem sozinhos todo mês?',
        answer:
          'Ao cadastrar a transação, ligue o interruptor “Repetir todo mês”. A partir daí o app lança a mesma transação, no mesmo dia, todo mês (em meses mais curtos, no último dia). Se você ficar dias sem abrir o app, os meses que passaram são lançados assim que ele abrir.',
      },
      {
        question: 'Como pauso, mudo o valor ou paro uma transação recorrente?',
        answer:
          'Em Transações, toque em “Recorrentes”. Ali dá para pausar (e retomar depois), mudar o nome, o valor ou o dia, ou parar de repetir. Os lançamentos que já foram feitos continuam nas suas transações.',
      },
      {
        question: 'Como importo o extrato do meu banco?',
        answer:
          'No app ou no site do seu banco, exporte o extrato em OFX (melhor opção) ou CSV. Depois, em Transações → “Importar extrato”, escolha o arquivo. O app mostra cada lançamento com uma categoria sugerida (Uber vira Transporte, iFood vira Delivery…), que você pode trocar antes de importar.',
      },
      {
        question: 'O extrato veio com entradas e saídas trocadas. E agora?',
        answer:
          'Isso é comum em faturas de cartão. Na tela de importação, toque em “Inverter entradas/saídas” antes de confirmar.',
      },
      {
        question: 'Importar o mesmo extrato duas vezes duplica tudo?',
        answer:
          'Não. O que já foi importado aparece como “já importado” e fica de fora. Lançamentos com a mesma data, valor e tipo de algo que você cadastrou à mão aparecem como “parece já cadastrado” e vêm desmarcados. Você decide se importa ou não.',
      },
      {
        question: 'Como guardo a foto do comprovante?',
        answer:
          'Toque no clipe 📎 da transação e escolha “Tirar foto” ou “Galeria”. A foto é reduzida para ocupar pouco espaço sem perder a leitura. Transações com comprovante ficam com o clipe destacado.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Cartões e faturas',
    items: [
      {
        question: 'Como registro uma compra parcelada?',
        answer:
          'Em “Nova transação”, escolha Saída e a forma de pagamento “Cartão de crédito”. Informe o cartão e o número de parcelas: o app distribui as parcelas nas faturas certas.',
      },
      {
        question: 'Como pago uma fatura?',
        answer:
          "Em Cartões → Minhas faturas, escolha o mês, toque em “Registrar pagamento” na fatura e informe o valor e a data. Também dá para pagar pelo Dashboard: toque no cartão e em “Ver faturas”. O limite do cartão é liberado conforme você paga.",
      },
      {
        question: "Qual fatura aparece no cartão do Dashboard?",
        answer:
          "A fatura “da vez”: a próxima que vai vencer, com a data de vencimento. Exemplo: um cartão que fecha dia 10 e vence dia 15 mostra a fatura de dezembro até 15/12; a partir do dia 16, passa a mostrar a de janeiro. Se você escolher outro mês em “Período”, aparece a fatura daquele mês. O gráfico “Despesas dos cartões” segue a mesma regra.",
      },
      {
        question: "Em que fatura cai a minha compra e quando ela vence?",
        answer:
          "Compras feitas antes do dia do fechamento entram na fatura do mês; no dia do fechamento ou depois, vão para a do mês seguinte. Se o vencimento é depois do fechamento (fecha dia 10, vence dia 15), a fatura vence no próprio mês; se é antes (fecha dia 28, vence dia 5), vence no mês seguinte. Em Cartões, cada compra mostra em que fatura cai cada parcela.",
      },
      {
        question: "Como vejo as compras e as faturas de um mês?",
        answer:
          "Em Cartões, use o seletor de mês em “Compras no cartão” ou em “Minhas faturas”: aparece só aquele mês, já aberto. Nas compras parceladas, a parcela do mês escolhido fica destacada.",
      },
      {
        question: "Por que aparece fatura de cartão sem compras?",
        answer:
          "Em Minhas faturas aparecem todos os seus cartões, mesmo os que não tiveram compras no mês (com a etiqueta “Sem compras”). Use o filtro de cartão ao lado do mês para ver um só: o gráfico “Despesas dos cartões” acompanha a mesma escolha.",
      },
      {
        question: "O que mostra o gráfico “Despesas dos cartões”?",
        answer:
          "Em “Todos os cartões”, cada fatia é a fatura de um cartão. Escolhendo um cartão, o anel mostra quanto do limite a fatura usou, o centro mostra o valor da fatura e a lista mostra as categorias. Ele aparece no Dashboard, em Cartões e em Relatórios.",
      },
      {
        question: "Emprestei meu cartão para alguém. Como registro?",
        answer:
          "Em Devedores, ao adicionar a dívida, escolha o seu cartão em “Usou o seu cartão de crédito?”. A compra entra na fatura do cartão (e no Dashboard) e a dívida mostra “💳 Usou seu cartão · Nx”. Enquanto existir essa dívida, o cartão não pode ser excluído.",
      },
      {
        question: "Como registro quando EU devo para alguém?",
        answer:
          "Em Devedores, abra a aba “Eu devo” e toque em “Nova pessoa” (ou, ao cadastrar, escolha “Eu devo para essa pessoa”). Adicione a dívida e, a cada pagamento que você fizer, use “Registrar pagamento”: o valor entra como saída em Transações (categoria Finanças / Dívidas com pessoas), no Dashboard e nos relatórios. Se a dívida tiver vencimento, ela aparece no Calendário como “A pagar”.",
      },
      {
        question: "Como excluo uma dívida?",
        answer:
          "Em Devedores, toque em “Ver detalhes” na pessoa e em “Excluir” na dívida. Os pagamentos dela são apagados junto (e, no caso de “Eu devo”, as saídas que eles geraram em Transações também). Se a dívida usou o seu cartão, a compra sai da fatura, a não ser que essa fatura já tenha pagamento.",
      },
    ],
  },
  {
    icon: UsersRound,
    title: 'Perfis financeiros',
    items: [
      {
        question: 'Para que servem os perfis?',
        answer:
          'Para separar finanças diferentes: o seu pessoal, o do trabalho, o da casa, o de um negócio… Cada perfil tem as próprias entradas, saídas, cartões, metas, orçamentos, lembretes e recorrentes. Aparência, layout, seu nome e foto são os mesmos para todos.',
      },
      {
        question: 'Como crio e troco de perfil?',
        answer:
          'Em Configurações → Perfis financeiros, toque em “Novo perfil”, escolha o nome, a cor e o ícone. Com mais de um perfil, aparece um botão no topo da tela com o perfil aberto: toque nele para trocar.',
      },
      {
        question: 'Os perfis vão juntos na sincronização e no backup?',
        answer:
          'Sim. Ao sincronizar, todos os perfis vão automaticamente, cada um com os seus dados, sem misturar. O backup em JSON também guarda e restaura todos eles.',
      },
      {
        question: 'O que acontece se eu excluir um perfil?',
        answer:
          'Tudo o que é daquele perfil é apagado neste aparelho e, na próxima sincronização, nos outros aparelhos também. O perfil Principal não pode ser excluído. Faça um backup antes, por segurança.',
      },
    ],
  },
  {
    icon: PiggyBank,
    title: 'Guardado e Metas',
    items: [
      {
        question: 'Qual a diferença entre Guardado e Metas?',
        answer:
          'Guardado é a sua reserva geral: guarde a sobra do mês ou qualquer valor. Metas são objetivos específicos (uma viagem, um carro), com valor alvo e acompanhamento do progresso.',
      },
      {
        question: 'O que é “guardar a sobra do mês”?',
        answer:
          'É o que restou de entradas menos saídas no mês. O app calcula quanto está disponível e você escolhe quanto guardar.',
      },
      {
        question: "Os depósitos das Metas aparecem no Guardado?",
        answer:
          "Sim. Tudo o que você deposita ou retira de uma meta entra sozinho no saldo do Guardado, no histórico (com a etiqueta “Meta”) e no gráfico de evolução. Para mudar esses valores, use a própria meta.",
      },
    ],
  },
  {
    icon: CalendarDays,
    title: 'Calendário e notificações',
    items: [
      {
        question: 'Como crio um lembrete de boleto?',
        answer:
          'Em Calendário, toque em “Novo lembrete”, informe o título, o valor (opcional) e a data. Marque “Repetir todo mês” para contas fixas.',
      },
      {
        question: "O que aparece no Calendário?",
        answer:
          "Os boletos lançados como transação (no dia do pagamento), os lembretes, as previsões, as dívidas dos devedores e o vencimento da fatura de todos os seus cartões, mês a mês.",
      },
      {
        question: "Como marco um aviso como lido?",
        answer:
          "No sininho, toque em “Marcar como lido” no aviso ou em “Marcar todas como lidas”. Os avisos lidos somem da lista; toque em “Mostrar lidas” para vê-los de novo.",
      },
      {
        question: "Como excluo avisos do sino?",
        answer:
          "No sino, toque em “Excluir” no aviso, ou em “Excluir lidas” para tirar todos os já lidos de uma vez. Em Configurações → Notificações → “Apagar avisos antigos”, escolha depois de quantos dias os avisos já vencidos somem sozinhos (3, 7 ou 30 dias, ou nunca).",
      },
      {
        question: 'Quando recebo os avisos?',
        answer:
          'Os avisos aparecem no sininho com a antecedência escolhida em Configurações → Notificações. No app Android, também chegam como notificação do celular às 9h, mesmo com o app fechado, de todos os seus perfis.',
      },
      {
        question: 'As notificações não chegam no celular. O que faço?',
        answer:
          'Abra Configurações → Notificações. Se aparecer “Ative as notificações do celular”, toque em “Permitir notificações”. Se aparecer “bloqueadas”, vá em Configurações do celular → Apps → Personal Finance → Notificações e ative. Depois use “Enviar notificação de teste” para conferir.',
      },
    ],
  },
  {
    icon: RefreshCw,
    title: 'Sincronização e backup',
    items: [
      {
        question: 'Como deixo o celular e o computador com os mesmos dados?',
        answer:
          'Use a Conexão contínua: no computador, abra Sincronização e toque em “Mostrar QR code”. No celular, abra Sincronização, toque em “Ler QR code do outro aparelho” e aponte a câmera. Pronto: os dois sincronizam e ficam conectados. Todos os perfis vão juntos.',
      },
      {
        question: 'Preciso ler o QR code toda vez?',
        answer:
          'Não. Depois da primeira vez, os aparelhos ficam pareados e se reconectam sozinhos sempre que os dois estiverem com o app aberto e com internet. No topo da tela aparece o aparelho conectado em verde.',
      },
      {
        question: "Posso conectar mais de um aparelho?",
        answer:
          "Pode. Em Sincronização, toque em “Conectar outro aparelho” e mostre um QR code novo para cada aparelho (por exemplo, o celular, o tablet e dois computadores). No topo da tela aparece um ícone para cada aparelho: computador, celular ou tablet, em verde quando estão conectados. O botão “Sincronizar” envia as alterações para todos.",
      },
      {
        question: "O que significa a animação de ✓ ou ✗?",
        answer:
          "É o resultado da sincronização, igual ao do backup: o símbolo gira enquanto sincroniza, vira ✓ verde quando deu certo (com o resumo do que mudou) e ✗ vermelho quando a conexão falhou (com o motivo). Se falhar, confira se o outro aparelho está com o app aberto e com internet.",
      },
      {
        question: "Apareceu “limite gratuito do dia”. O que é?",
        answer:
          "Para os aparelhos se encontrarem, o app usa um serviço gratuito que aceita até 250 mensagens por dia em cada internet. O app economiza ao máximo (só uns poucos “oi” por conexão), mas se o limite acabar, ele mostra a hora em que volta e tenta de novo sozinho. Enquanto isso, use “Sem internet: com dois QR codes” na página Sincronização, que não depende desse serviço.",
      },
      {
        question: 'Para que serve o botão “Sincronizar” no topo da tela?',
        answer:
          'Ele aparece quando algo mudou em um dos aparelhos conectados. Ao tocar, os dois trocam e juntam as alterações, e as telas se atualizam na hora. Se o ícone do aparelho estiver cinza, a conexão caiu: abra o app no outro aparelho para ele se reconectar.',
      },
      {
        question: 'Como desconecto um aparelho?',
        answer:
          "Em Sincronização, no quadro “Conexão contínua”, toque em “Desconectar” ao lado do aparelho. Só ele é desconectado; os outros continuam. Os dados continuam em todos os aparelhos; para conectar de novo, basta ler um QR code novo.",
      },
      {
        question: 'E se eu estiver sem internet?',
        answer:
          'Use “Sem internet: com dois QR codes” na mesma página (os dois aparelhos no mesmo Wi-Fi, cada um lê o QR do outro) ou a sincronização por arquivo.',
      },
      {
        question: 'Por que fazer backup?',
        answer:
          'Seus dados ficam só no aparelho. Se o app for desinstalado ou o navegador for limpo, eles se perdem. Por isso o Dashboard avisa quando faz 7 dias sem backup (dá para tocar em “Lembrar depois”).',
      },
      {
        question: 'Qual formato de backup eu escolho?',
        answer:
          '“Backup (JSON)” é o único que pode ser restaurado no app: use este para guardar seus dados. “Planilha” gera um arquivo para abrir no Excel ou no Google Planilhas, com uma aba para cada tipo de dado. “SQLite” gera um banco de dados para programas de análise. Os três levam todos os perfis.',
      },
      {
        question: 'As fotos dos comprovantes vão no backup e na sincronização?',
        answer:
          'Vão no backup em JSON e voltam ao restaurar. Na sincronização elas não passam, porque deixariam a transferência pesada demais. Ficam no aparelho em que foram tiradas.',
      },
    ],
  },
  {
    icon: Lock,
    title: 'Bloqueio e segurança',
    items: [
      {
        question: 'Como coloco uma senha (PIN) no app?',
        answer:
          'É opcional. Em Configurações → Privacidade e segurança, toque em “Ligar bloqueio com PIN”, crie um PIN de 4 a 6 números e repita. No celular, você também pode desbloquear com a digital ou o rosto.',
      },
      {
        question: 'Para que serve o código de recuperação?',
        answer:
          'Ao criar o PIN, o app mostra um código (ex.: 5A7NX-9DTMP) uma única vez. Se você esquecer o PIN, toque em “Esqueci meu PIN” na tela de bloqueio e digite esse código: o bloqueio é desligado e você cria outro PIN. Anote o código em um lugar seguro.',
      },
      {
        question: 'Esqueci o PIN e perdi o código. Perdi tudo?',
        answer:
          'Pelo app não há como entrar: é isso que protege seus dados. No Android, em Configurações do celular → Apps → Personal Finance → Armazenamento → Limpar dados, o app volta a abrir, mas tudo nele é apagado. Depois restaure seu último backup. Por isso vale manter os backups em dia.',
      },
      {
        question: 'Quando o app pede o PIN?',
        answer:
          'Sempre ao abrir e, se você escolher, depois de 1 ou 5 minutos fora do app. O PIN vale só para o aparelho em que foi ligado: cada aparelho tem o seu (ou nenhum).',
      },
      {
        question: 'Errei o PIN várias vezes. O que acontece?',
        answer: 'Depois de 5 erros seguidos, o app espera 30 segundos antes de deixar tentar de novo.',
      },
    ],
  },
  {
    icon: Smartphone,
    title: 'No celular Android',
    items: [
      {
        question: 'Como coloco o saldo na tela inicial (widget)?',
        answer:
          'Segure o dedo numa área vazia da tela inicial → Widgets → Personal Finance → arraste “Saldo do mês” para a tela. Ele mostra o saldo, as entradas e as saídas do mês do perfil aberto. Com o bloqueio por PIN ligado, os valores aparecem escondidos (•••••).',
      },
      {
        question: 'Como saio do app?',
        answer:
          'Toque em “Mais” → “Sair”, ou aperte o botão voltar duas vezes seguidas no Dashboard. Em outras telas, o botão voltar leva ao Dashboard.',
      },
      {
        question: 'Como instalo uma versão nova sem perder os dados?',
        answer:
          'Basta instalar o APK novo por cima do antigo: os dados continuam. Só desinstalar o app ou usar “Limpar dados” apaga tudo.',
      },
    ],
  },
  {
    icon: Palette,
    title: 'Aparência e layout',
    items: [
      {
        question: 'Como mudo as cores e o estilo?',
        answer:
          "Em Configurações → Aparência: escolha o estilo (Clássico, Liquid Glass, Neon ou Natal), o tema claro/escuro, a cor de destaque, o fundo da tela, o tamanho da letra, a intensidade do neon e as animações.",
      },
      {
        question: "Como troco o fundo da tela?",
        answer:
          "Em Configurações → Aparência → Fundo da tela, escolha entre “Do estilo”, Aurora, Malha, Ondas, Geométrico, Linhas, Pontos, Anéis ou Liso. Todos ficam parados (não pesam no celular) e usam a sua cor de destaque.",
      },
      {
        question: "Como aumento ou diminuo o tamanho da letra?",
        answer:
          "Em Configurações → Aparência → Tamanho da letra, escolha entre Pequena, Normal, Grande e Muito grande. A mudança vale para o app inteiro e aparece na hora, antes mesmo de salvar.",
      },
      {
        question: 'Como mudo a ordem do menu ou os botões da barra do celular?',
        answer:
          "Em Configurações → Layout. Segure e arraste a alça (⋮⋮) de cada seção para mudar a ordem do menu principal. Na “Barra inferior do celular”, toque em um dos espaços e escolha a página que deve aparecer nele. O “+” e o “Mais” ficam sempre no lugar.",
      },
      {
        question: 'Como coloco uma foto no meu perfil?',
        answer:
          'Em Configurações → Perfil e preferências, toque no ícone de foto no fim da lista de avatares, escolha a imagem e ajuste o enquadramento (arraste e use o zoom). Depois toque em “Salvar alterações”.',
      },
      {
        question: 'O app está pesado no meu celular. O que faço?',
        answer:
          "O app já desliga o vidro desfocado e as animações contínuas no celular. Se ainda estiver pesado, em Configurações → Aparência deixe as animações em “Reduzido” e use o estilo Clássico com o fundo Liso.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Privacidade e dados',
    items: [
      {
        question: 'Meus dados vão para a internet?',
        answer:
          'Não. Seus dados ficam guardados só no aparelho em que você usa o app, nunca em um servidor. Na conexão contínua, a internet é usada só para os aparelhos se encontrarem (por um serviço gratuito, sempre cifrado com a chave do QR code); os dados vão direto de um aparelho para o outro.',
      },
      {
        question: 'Onde exatamente ficam os dados?',
        answer:
          'No app Android, dentro do próprio app (desinstalar ou “limpar dados” apaga tudo). No navegador, dentro daquele navegador (limpar os dados de navegação apaga tudo; cada navegador tem dados separados).',
      },
      {
        question: "Como apago tudo e começo do zero?",
        answer:
          "Em Configurações → Dados e armazenamento, no fim da página, toque em “Apagar todos os dados” e digite APAGAR para confirmar. Isso não tem volta: faça um backup antes se quiser guardar alguma coisa.",
      },
    ],
  },
]

type FeedbackKind = 'opiniao' | 'bug' | 'elogio'

const FEEDBACK: Record<FeedbackKind, { label: string; icon: typeof Bug; title: string; placeholder: string }> = {
  opiniao: {
    label: 'Opinião ou sugestão',
    icon: MessageCircle,
    title: '[Opinião]',
    placeholder: 'Conte o que você achou ou o que gostaria de ver no app…',
  },
  bug: {
    label: 'Reportar um bug',
    icon: Bug,
    title: '[Bug]',
    placeholder: 'O que aconteceu? Em qual tela? O que você esperava que acontecesse?',
  },
  elogio: {
    label: 'Fazer um elogio',
    icon: Heart,
    title: '[Elogio]',
    placeholder: 'Conte o que você mais gostou! 💜',
  },
}

function deviceSummary(): string {
  const platform = getPlatform() === 'app' ? 'App Android' : 'Navegador'
  const width = `${window.innerWidth}x${window.innerHeight}`
  const style = document.documentElement.getAttribute('data-pf-style') ?? 'classic'
  const theme = document.documentElement.getAttribute('data-pf-theme') ?? 'dark'
  return `${platform} · tela ${width} · estilo ${style} · tema ${theme}`
}

export default function HelpCenter() {
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Busca: mostra só as perguntas que têm as palavras digitadas (já abertas)
  const searching = normalizeSearch(query) !== ''
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  const visibleTopics = TOPICS.map(topic => ({
    ...topic,
    items: searching
      ? topic.items.filter(item => {
          const text = normalizeSearch(`${topic.title} ${item.question} ${item.answer}`)
          return words.every(word => text.includes(word))
        })
      : topic.items,
  })).filter(topic => topic.items.length > 0)
  // Duas colunas independentes: cada bloco ocupa só o tamanho do seu
  // conteúdo (sem buracos). Cada tópico vai para a coluna mais baixa.
  const helpColumns: { topic: Topic; topicIndex: number }[][] = [[], []]
  const columnHeights = [0, 0]
  visibleTopics.forEach((topic, topicIndex) => {
    const target = columnHeights[0] <= columnHeights[1] ? 0 : 1
    helpColumns[target].push({ topic, topicIndex })
    columnHeights[target] += 2 + topic.items.length
  })

  const [kind, setKind] = useState<FeedbackKind>('opiniao')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const fullMessage = () =>
    `${message.trim()}\n\n—\n${FEEDBACK[kind].label}\n${deviceSummary()}`

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(`${FEEDBACK[kind].title} ${fullMessage()}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  function openOnGitHub() {
    const firstLine = message.trim().split('\n')[0].slice(0, 70) || FEEDBACK[kind].label
    const url =
      `${ISSUES_URL}?title=${encodeURIComponent(`${FEEDBACK[kind].title} ${firstLine}`)}` +
      `&body=${encodeURIComponent(fullMessage())}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="pf-help">
      <div className="pf-section-heading">
        <span className="eyebrow">SUPORTE</span>
        <h1>
          Central de ajuda<span className="neon-dot">.</span>
        </h1>
        <p>Tire suas dúvidas sobre o Personal Finance ou fale com o desenvolvedor.</p>
      </div>

      <div className="pf-help-layout">
        <div className="pf-help-topics">
          <div className="pf-help-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Procure sua dúvida (ex.: PIN, extrato, widget, perfil)"
              aria-label="Buscar na Central de ajuda"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                <X size={16} />
              </button>
            )}
          </div>

          {searching && visibleTopics.length === 0 && (
            <div className="panel pf-help-empty">
              <strong>Nenhuma resposta encontrada</strong>
              <p>Tente outras palavras ou mande sua dúvida para o {DEVELOPER} no quadro ao lado.</p>
            </div>
          )}

          <div className="pf-help-columns">
          {helpColumns.map((column, columnIndex) => (
          <div className="pf-help-column" key={columnIndex}>
          {column.map(({ topic, topicIndex }) => {
            const Icon = topic.icon

            return (
              <div
                key={topic.title}
                className="panel pf-help-topic"
                style={{ '--i': topicIndex, order: topicIndex } as React.CSSProperties}
              >
                <h3>
                  <span className="pf-help-topic-icon">
                    <Icon size={18} />
                  </span>
                  {topic.title}
                </h3>

                {topic.items.map(item => {
                  const key = `${topic.title}:${item.question}`
                  const open = searching || openItem === key

                  return (
                    <div key={key} className={`pf-help-item ${open ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="pf-help-question"
                        aria-expanded={open}
                        onClick={() => setOpenItem(open ? null : key)}
                      >
                        <span>{item.question}</span>
                        <ChevronDown size={17} />
                      </button>
                      <div className="pf-help-answer" role="region">
                        <div>
                          <p>{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          </div>
          ))}
          </div>
        </div>

        <aside className="pf-help-side">
          <div className="panel pf-help-contact">
            <div className="pf-help-contact-heading">
              <span className="pf-help-avatar">{DEVELOPER.charAt(0)}</span>
              <div>
                <h3>Fale com o {DEVELOPER}</h3>
                <p>Quer deixar uma opinião, reportar um bug ou fazer um elogio? Sua mensagem é muito bem-vinda!</p>
              </div>
            </div>

            <div className="pf-help-kinds" role="radiogroup" aria-label="Tipo de mensagem">
              {(Object.keys(FEEDBACK) as FeedbackKind[]).map(item => {
                const Icon = FEEDBACK[item].icon
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={kind === item}
                    className={`pf-help-kind ${kind === item ? 'is-selected' : ''} kind-${item}`}
                    onClick={() => setKind(item)}
                  >
                    <Icon size={18} />
                    <span>{FEEDBACK[item].label}</span>
                  </button>
                )
              })}
            </div>

            <label className="pf-help-label" htmlFor="help-message">
              Sua mensagem
            </label>
            <textarea
              id="help-message"
              rows={5}
              maxLength={2000}
              placeholder={FEEDBACK[kind].placeholder}
              value={message}
              onChange={event => setMessage(event.target.value)}
            />

            <div className="pf-help-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!message.trim()}
                onClick={openOnGitHub}
              >
                <ExternalLink size={16} />
                Enviar pelo GitHub
              </button>
              <button type="button" className="pf-ghost-button" disabled={!message.trim()} onClick={copyMessage}>
                <Copy size={16} />
                {copied ? 'Copiado!' : 'Copiar mensagem'}
              </button>
            </div>

            <a
              className="pf-help-instagram"
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="pf-help-instagram-icon">
                <InstagramGlyph size={20} />
              </span>
              <span className="pf-help-instagram-text">
                <strong>@{INSTAGRAM_USER}</strong>
                <small>Mande uma mensagem direta no Instagram</small>
              </span>
              <ExternalLink size={16} />
            </a>

            <p className="pf-help-note">
              “Enviar pelo GitHub” abre a página do projeto com a mensagem pronta (é preciso ter uma conta
              gratuita no GitHub). Se preferir, copie a mensagem e mande no Instagram @{INSTAGRAM_USER}. Junto vão só
              informações do aparelho (tipo e tamanho de tela) para ajudar a entender o problema — nenhum dado
              financeiro.
            </p>
          </div>

          <div className="panel pf-help-quick">
            <h3>
              <LifeBuoy size={18} /> Atalhos
            </h3>
            <button type="button" className="pf-ghost-button pf-full" onClick={requestOpenTutorial}>
              <GraduationCap size={16} />
              Ver tutorial novamente
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
