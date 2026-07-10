# Sistema de Controle de Horas Extra (Operação de Motoristas)

Este sistema é uma aplicação web voltada para a gestão, lançamento e monitoramento de horas extras de motoristas terceirizados ou próprios. O principal objetivo do app é controlar o teto mensal de horas permitidas, alertando a operação de forma visual e centralizada quando um condutor atinge limites críticos (75%, 90% e 100% ou mais).

## 🚀 Stacks Utilizadas (Tecnologias)

O ecossistema do projeto foi montado em cima de tecnologias modernas focadas em performance, tipografia limpa e escalabilidade:

*   **Frontend Principal:** [React.js](https://react.dev/) (com hooks avançados, Context API para gerenciamento de estado global e `useMemo` para cálculos pesados em tempo real).
*   **Build Tool (Ambiente):** [Vite](https://vitejs.dev/) - Garante um Hot Module Replacement (HMR) instantâneo durante o desenvolvimento e builds de produção otimizados.
*   **Estilização:** [Tailwind CSS](https://tailwindcss.com/) - Utilizado para criar uma interface limpa, focada em design system utilitário e responsividade móvel (importante para operadores em trânsito).
*   **Roteamento:** [React Router DOM](https://reactrouter.com/) - Gerenciamento de rotas dinâmicas baseado na URL (como o detalhamento através do ID do Firebase).
*   **Backend como Serviço (BaaS):** [Firebase](https://firebase.google.com/)
    *   **Cloud Firestore:** Banco de dados NoSQL baseado em documentos e coleções para persistência de dados em tempo real.
    *   **Firebase Authentication:** Controle de acesso seguro para os operadores do painel.

---

## 📁 Estrutura de Pastas do Projeto

O código-fonte segue o padrão arquitetural clássico do ecossistema React. Abaixo está o mapa das pastas principais dentro do diretório `src/`:

```text
src/
├── assets/             # Arquivos estáticos (ícones, logos, imagens)
├── components/         # Componentes visuais isolados e reutilizáveis
│   ├── ConfirmDialog.jsx      # Modal de confirmação para ações destrutivas (excluir)
│   ├── DriverFormModal.jsx    # Modal de cadastro/edição de condutores
│   ├── EmpresaBadge.jsx       # Badge visual que diferencia as empresas de transporte
│   ├── RouteProgress.jsx      # Barra de progresso customizada protegida contra quebras
│   └── WhatsAppAlertModal.jsx # Centralizador de envio de relatórios condensados
├── context/            # Provedores globais de estado
│   └── AuthContext.jsx        # Contexto de autenticação de usuários do painel
├── hooks/              # Custom Hooks para comunicação assíncrona com o Firebase
│   ├── useDrivers.js          # CRUD e leitura em tempo real da coleção 'drivers'
│   └── useHourEntries.js      # Gerenciamento de sub-coleções ou registros de horas por ID
├── pages/              # Telas principais (mapeadas pelo React Router)
│   ├── Dashboard.jsx          # Visão geral de motoristas e ranking de horas mensais
│   ├── DriverDetail.jsx       # Histórico analítico e específico do motorista (ID da URL)
│   └── LancarHoras.jsx        # Formulário de entrada de dados de horas decimais
├── utils/              # Funções utilitárias e regras de negócio isoladas
│   ├── hours.js               # Cálculo de frações de horas, limites diários e chaves de status
│   └── whatsapp.js            # Formatadores de strings e geradores de API Link do WhatsApp
├── App.jsx             # Componente raiz contendo a malha de rotas e o AppShell
└── main.jsx            # Ponto de entrada do ecossistema React na árvore DOM