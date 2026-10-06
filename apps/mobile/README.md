# AgendAKI Mobile

Aplicação iOS/Android em React Native, TypeScript e Expo Router. O app partilha a API e as regras de conta do AgendAKI, mas tem navegação e componentes nativos.

## Desenvolvimento

Na raiz do monorepo:

```sh
pnpm install
pnpm --filter @agendai/mobile dev
```

O app liga por padrão à API publicada em `https://apibackend.agendaki.net/api/v1`. Defina `EXPO_PUBLIC_API_URL` apenas se precisar de usar outro endereço. Para desenvolvimento local use o endereço da máquina acessível pelo telemóvel/emulador; `localhost` dentro do dispositivo não aponta para o computador. Credenciais de banco de dados, MinIO, Resend e JWT pertencem somente ao servidor e nunca devem ser incluídas no app.

## Dados e modo offline

O snapshot da escola fica numa base SQLite local cifrada com SQLCipher. A chave aleatória da base fica no armazenamento seguro do sistema. Planos, presenças e avaliações podem ser guardados offline e são enviados pela fila local ao recuperar a ligação. O estado da fila fica visível no cabeçalho e nas definições.

O SQLCipher requer uma development build nativa (Expo Go não inclui esta configuração). Gere o projeto nativo com `pnpm --filter @agendai/mobile android` ou `ios` antes de testar a persistência cifrada. A criação de alunos usa o endpoint existente da escola e, por isso, requer ligação; consulta e ações de aula continuam disponíveis offline com dados previamente sincronizados.

## Build

```sh
pnpm --filter @agendai/mobile typecheck
pnpm --filter @agendai/mobile build
```
