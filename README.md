# Controle de Horas Extra — Frota

Sistema completo em **React + Firebase** para controlar as horas extras de motoristas: cadastro (com importação em massa), limite de horas mensal configurável por pessoa, tela dedicada para lançar horas, painel geral com filtros por empresa, avisos automáticos ao atingir 75/90/100% do limite, e exportação de relatório mensal em Excel/PDF.

## Funcionalidades

- Login com e-mail/senha (Firebase Authentication)
- **Cadastro de motoristas**: nome, matrícula, empresa (**Praia Sol** ou **Vereda**), função/veículo, telefone e limite de horas extra mensal
- **Importar lista de motoristas** de uma planilha `.csv` ou `.xlsx` (com pré-visualização antes de confirmar, e modelo para baixar)
- Editar e excluir motorista (exclui também o histórico de horas dele)
- **Tela dedicada "Lançar horas"**: escolha o motorista (com busca e filtro por empresa) e registre as horas do dia, com histórico recente ao lado
- **Painel geral** (dashboard puro): cards ou lista, com filtro "Todas / Praia Sol / Vereda" e ordenado por quem está mais perto do limite
- Aviso no topo do painel listando quem está em 75% ou mais — **atualiza em tempo real** conforme as horas são lançadas
- Barra de progresso visual (verde → âmbar → vermelho) por motorista
- **Exportar relatório mensal em Excel ou PDF**, respeitando o filtro de empresa selecionado
- **Alerta automático por e-mail** (via Cloud Function) quando um motorista cruza 75%, 90% ou 100% do limite — pronto para configurar, com bloco opcional de WhatsApp via Twilio

## Estrutura de dados no Firestore

```
drivers/{driverId}
  name: string
  matricula: string
  empresa: string          // "Praia Sol" ou "Vereda"
  role: string
  phone: string
  maxHours: number         // limite mensal de horas extras
  createdAt: timestamp
  lastAlertBucket_AAAA-MM: number   // controle interno da Cloud Function (0/75/90/100)

drivers/{driverId}/entries/{entryId}
  date: string             // "AAAA-MM-DD"
  hours: number
  note: string
  createdAt: timestamp
```

O total de horas do mês é somado filtrando os lançamentos cujo `date` começa com o mês/ano corrente — o contador **reinicia automaticamente todo mês**, e o histórico de meses anteriores continua salvo.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto novo.
2. Ative **Firestore Database** (modo produção).
3. Ative **Authentication** → método **E-mail/senha**, e crie os usuários que vão acessar o painel.
4. Em "Configurações do projeto" → "Seus apps", crie um app **Web** e copie o `firebaseConfig`.

### 2. Configurar o projeto local

```bash
npm install
```

Cole os dados do seu projeto em `src/firebase.js`:

```js
const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'SEU_PROJETO.firebaseapp.com',
  projectId: 'SEU_PROJETO',
  storageBucket: 'SEU_PROJETO.appspot.com',
  messagingSenderId: 'SEU_SENDER_ID',
  appId: 'SEU_APP_ID'
}
```

### 3. Regras de segurança do Firestore

No console do Firebase, em Firestore → Regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drivers/{driverId} {
      allow read, write: if request.auth != null;

      match /entries/{entryId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### 4. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:5173 e entre com o e-mail/senha criado no passo 1.

### 5. Publicar (opcional)

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

## Importar lista de motoristas

Na tela "Motoristas", clique em **Importar lista** e envie um `.csv` ou `.xlsx` com estas colunas (a ordem não importa, os nomes são reconhecidos mesmo com acentos/maiúsculas diferentes):

| Nome | Matricula | Empresa | Funcao | Telefone | Limite |
|---|---|---|---|---|---|
| João da Silva | 00123 | Praia Sol | Carreta 04 | (11) 90000-0000 | 20 |

Use o botão **Baixar planilha modelo** dentro do modal para já sair com o formato certo. A "Empresa" deve ser `Praia Sol` ou `Vereda` — outros valores são importados, mas ficam marcados para você conferir depois.

## Exportar relatório mensal

No painel geral, os botões **Exportar Excel** e **Exportar PDF** geram o relatório do mês corrente com os motoristas visíveis no filtro de empresa selecionado (nome, matrícula, empresa, horas lançadas, limite, % e status).

## Alerta automático por e-mail ao atingir 75/90/100%

Isso é feito por uma **Cloud Function** (pasta `functions/`), porque enviar e-mail/WhatsApp de verdade exige um backend com credenciais — não dá para fazer só no navegador.

1. Entre na pasta `functions` e instale as dependências:
   ```bash
   cd functions
   npm install
   ```
2. Copie o arquivo de exemplo e preencha com seus dados:
   ```bash
   cp .env.example .env
   ```
   Abra `.env` e configure:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: dados do seu e-mail de envio (com Gmail, gere uma "senha de app" em myaccount.google.com/apppasswords)
   - `ALERT_EMAIL_TO`: para quem os avisos devem ir (pode ser uma lista separada por vírgula)
3. Faça o deploy:
   ```bash
   firebase deploy --only functions
   ```

A partir daí, toda vez que um motorista cruzar 75%, 90% ou 100% do limite mensal, um e-mail é enviado automaticamente para os endereços configurados. O aviso só dispara uma vez por degrau (não fica repetindo a cada lançamento), e reinicia sozinho no mês seguinte.

**WhatsApp (opcional):** o arquivo `functions/index.js` já tem um bloco comentado usando a API do Twilio para WhatsApp. Para ativar: crie uma conta no Twilio, habilite o WhatsApp Sandbox (ou número aprovado), preencha `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` e `ALERT_WHATSAPP_TO` no `.env`, rode `npm install twilio` dentro de `functions`, descomente o bloco indicado no código e faça o deploy novamente.

## Personalizações fáceis

- **Mudar os limites de aviso (75/90/100%)**: `src/utils/hours.js`, função `getStatus` (e o mesmo bucket em `functions/index.js` para o e-mail).
- **Cores de status**: `src/utils/hours.js`, objeto `STATUS_META`.
- **Empresas**: `src/utils/constants.js`, lista `EMPRESAS` — adicione ou renomeie livremente.
- **Campos do motorista**: adicione no formulário `src/components/DriverFormModal.jsx`, no hook `src/hooks/useDrivers.js` e no mapeamento de colunas em `src/utils/csv.js` (para a importação reconhecer a nova coluna).

## Próximos passos sugeridos

- Histórico por mês anterior (seletor de mês na tela do motorista)
- Perfis de acesso (gestor vs. visualização)
- Notificação também dentro do próprio app (sino de notificações)
