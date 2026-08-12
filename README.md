# Game Manager Mobile

Aplicativo Expo/React Native para catalogar jogos, consoles, acessórios e lista de desejos, com integração opcional ao IGDB e lembretes locais de manutenção.

## Requisitos

- Node.js LTS e npm
- Ambiente Expo SDK 54
- Android Emulator/Android Studio ou dispositivo físico para os testes manuais

## Instalação e execução

```bash
npm ci
npm start
```

Atalhos:

```bash
npm run android
npm run ios
npm run web
```

> Notificações remotas do `expo-notifications` não funcionam no Expo Go a partir do SDK 53. Para validar notificações no Android, use um development build ou uma build instalada no dispositivo.

## Verificação de qualidade

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo-doctor
npx expo export --platform android --output-dir dist-android
```

O lint é informativo durante a limpeza do legado: não há erros bloqueantes, mas avisos devem ser corrigidos gradualmente e revisados antes de novas alterações funcionais.

## Segurança e dados

- Credenciais e tokens do IGDB ficam somente no dispositivo, usando `expo-secure-store`.
- Credenciais não entram nos backups nem devem ser registradas em logs.
- URLs externas provenientes de metadados remotos aceitam exclusivamente `https:`.
- O backup Android automático está desativado (`allowBackup: false`) para reduzir a exposição de dados locais. O app mantém seu fluxo explícito de exportação/importação.
- Backups importados passam por validação de schema antes de qualquer gravação.

## Backup e restauração

Use o fluxo de backup dentro do aplicativo para exportar e importar a coleção. Antes de importar uma versão para uso real, valide:

1. backup com imagens locais e URLs remotas;
2. rejeição de JSON malformado;
3. rejeição de URLs externas inseguras;
4. rejeição de arquivos, coleções ou payloads de imagem além dos limites aceitos;
5. restauração sem sobrescrever dados quando a validação falhar.

## IGDB

A integração exige credenciais válidas configuradas no aplicativo. Elas são locais ao dispositivo. A busca escapa termos externos, limita consultas e distingue ausência de resultado de falhas de rede/autenticação.

## Checklist de aceitação Android

Antes de publicar uma build de teste:

- configure credenciais IGDB válidas e confirme que não aparecem em AsyncStorage;
- pesquise jogos com texto normal e com aspas;
- tente importar JSON inválido e URL não-HTTPS;
- crie, desative, edite e exclua lembretes de manutenção;
- abra a Home repetidamente com manutenção atrasada e confirme um único alerta diário;
- faça duas gravações rápidas e confirme que ambas persistem.

## Limitações conhecidas

`npm audit --omit=dev` ainda reporta vulnerabilidades transitivas da cadeia Expo SDK 54/Metro/Jest. O Axios direto já está atualizado. A correção integral indicada pelo npm requer migração major para Expo SDK 57; não execute `npm audit fix --force` sem uma migração dedicada, testes em dispositivo e revisão das mudanças nativas.
