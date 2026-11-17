# Tech Challenge — Aplicativo mobile

Aplicativo em React Native para acessar a plataforma do Tech Challenge. Ele consome a mesma API e o mesmo banco MongoDB utilizados pelo site. O frontend web permanece na pasta `FrontTCFiap-main`; o aplicativo mobile fica nesta pasta.

## Requisitos

- Node.js 22.13.x, 24.3+ ou 26+.
- npm.
- API do projeto e MongoDB em execução.
- Para executar em dispositivo, emulador Android/iOS ou Expo Go. O Expo Go é uma opção de desenvolvimento, não um requisito do projeto.

## Configuração

Instale as dependências do aplicativo:

```bash
cd FrontTCFiap-main/mobile
npm install
```

Inicie também o backend em outro terminal. Configure `MONGO_URI`, `JWT_SECRET` e `TEACHER_REGISTRATION_CODE` em `BackFiap-main/.env` antes de iniciá-lo:

```bash
cd BackFiap-main
npm install
npm start
```

Por padrão, a API usa a porta `3003`. O aplicativo tenta detectar o host do navegador ou do servidor Expo automaticamente. Se a API estiver em outro host, copie `.env.example` para `.env` dentro da pasta `mobile` e informe a URL:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3003
```

Use o endereço IP do computador que executa a API, não `localhost`, ao conectar um celular físico: computador e celular precisam estar na mesma rede, e a porta da API deve aceitar conexões pela rede local. Se necessário, use:

- Android Emulator: `http://10.0.2.2:3003`
- iOS Simulator: `http://localhost:3003`
- Celular físico: `http://<IP-do-computador>:3003`

Não coloque segredos do backend nesse arquivo. `EXPO_PUBLIC_API_URL` é uma configuração pública incluída no aplicativo.

## Executar

Na pasta `FrontTCFiap-main/mobile`, escolha um comando:

```bash
npm start
npm run android
npm run ios
npm run web
```

`npm start` abre o servidor de desenvolvimento Expo; escolha a plataforma desejada na interface ou leia o QR code com o Expo Go. Os comandos `android`, `ios` e `web` iniciam diretamente a plataforma indicada.

## Funcionalidades e uso

### Acesso público

- **Postagens:** lista posts, permite busca por palavra-chave e abre o conteúdo completo.
- **Calendário:** consulta eventos e feriados; permite selecionar dias para ver eventos.
- **Avisos:** consulta os avisos publicados.

Essas páginas podem ser acessadas sem login. Os alunos não possuem contas no sistema escolar e não fazem login.

### Acesso de professor

Use **Login** no canto superior direito e entre com uma conta de professor. Professores podem:

- Criar, editar e excluir postagens pela área **Administração**.
- Selecionar uma imagem de capa e anexar até três imagens da galeria ao criar ou editar uma postagem.
- Comentar em postagens.
- Publicar e excluir avisos e criar e excluir eventos.
- Criar, editar, listar e excluir cadastros de professores e alunos em **Usuários**.
- Registrar notas por disciplina e bimestre ao editar um cadastro de aluno. A lista permite consultar notas e médias, além de adicionar ou excluir observações individuais do aluno.

O nome da conta aparece no menu como **Olá, [nome]**. **Sair** encerra a sessão. A sessão de professor é armazenada no dispositivo e enviada à API como token Bearer.

## Arquitetura

- `App.js`: configuração de navegação, menu de páginas, cabeçalhos e rotas de navegação.
- `src/screens/`: telas de postagens, calendário, avisos, autenticação e gestão.
- `src/context/AuthContext.js`: restauração, estado e encerramento da sessão de professor.
- `src/services/api.js`: cliente Axios, URL base da API e envio do token armazenado.
- `src/utils/dialogs.js`: diálogos de confirmação e mensagens compatíveis com as plataformas.

O mobile usa Context API para estado de autenticação e AsyncStorage para persistir a sessão. A comunicação com o backend é feita por endpoints REST: posts em `/posts`, autenticação em `/login` e `/register`, contas de professores em `/users`, perfis escolares em `/students`, eventos em `/events` e avisos em `/notices`. Imagens de capa e anexos selecionados são redimensionados e compactados antes de serem enviados como Data URI Base64, no formato já aceito pela API. As operações administrativas são protegidas no backend e exigem autenticação de professor.

## Verificações

Na pasta `mobile`, os bundles podem ser verificados sem iniciar um servidor persistente:

```bash
npx expo export --platform android
npx expo export --platform web
```

Os testes automatizados da API ficam em `BackFiap-main` e podem ser executados com:

```bash
npm test -- --runInBand
```
