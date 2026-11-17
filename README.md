# Personal Finance

Aplicativo de controle financeiro pessoal, para navegador e Android.

## Módulos

- **Dashboard**: resumo do mês, saldo projetado, previsões e cartões
- **Transações**: entradas e saídas, com categorias e subcategorias
- **Cartões**: cartões de crédito, compras parceladas, faturas e pagamentos
- **Devedores**: quem te deve, dívidas e recebimentos
- **Orçamentos**: limite de gastos por categoria e mês
- **Metas**: objetivos de economia com depósitos e retiradas
- **Relatórios**: gráficos e comparativos por período
- **Configurações**: perfil, aparência, notificações e backup

Os dados ficam salvos **apenas no aparelho** (localStorage). Use
*Configurações → Backup* para exportar uma cópia de segurança.

## Tecnologias

React 19 + TypeScript + Vite · Recharts (gráficos) · Capacitor (Android) · Vitest (testes)

## Comandos

| Comando              | O que faz                                          |
| -------------------- | -------------------------------------------------- |
| `npm install`        | Instala as dependências (só na primeira vez)        |
| `npm run dev`        | Abre o app no navegador para desenvolvimento        |
| `npm test`           | Roda todos os testes automáticos                    |
| `npm run lint`       | Procura problemas no código                         |
| `npm run build`      | Gera a versão final em `dist/`                      |
| `npx cap sync android` | Copia a versão final para o projeto Android       |

## Estrutura

```
src/
  App.tsx          Tela principal, navegação, Dashboard e Transações
  pages/           Demais telas (Cartões, Devedores, Metas, ...)
  components/      Peças reutilizáveis (seletores, diálogos, gráficos)
  services/        Regras de negócio, cálculos e armazenamento
    *.test.ts      Testes automáticos
    *.check.ts     Verificações antigas, executadas por legacyChecks.test.ts
  styles/          Estilos por módulo
android/           Projeto Android (Capacitor)
```

## Sincronização entre aparelhos

Configurações → Dados e armazenamento → **Abrir Sincronização**.

- **Pelo Wi-Fi com QR code:** um aparelho mostra um QR de convite, o outro lê e
  mostra um QR de resposta, o primeiro lê. Os aparelhos se conectam direto
  (WebRTC, sem servidor e sem internet) e trocam os dados.
- **Por arquivo:** gera um arquivo de sincronização para enviar ao outro aparelho.

Como funciona (`src/services/sync/`):

| Arquivo              | Papel                                                        |
| -------------------- | ------------------------------------------------------------ |
| `changeTracker.ts`   | Diário de alterações: hash, horário e aparelho de cada registro, e exclusões |
| `syncMerge.ts`       | Junção registro a registro — vence a alteração mais recente  |
| `syncApply.ts`       | Valida com a auditoria do backup e grava pelo executor do backup (com recuperação automática) |
| `syncProtocol.ts`    | Conversa entre os aparelhos (envio em pedaços, confirmações) |
| `syncPeer.ts`        | Conexão WebRTC na rede local                                 |
| `signalCodec.ts`     | Compacta os dados de conexão para caber no QR code           |

## Distribuição sem publicar na internet

- `npm run arquivo` → gera `dist-arquivo/index.html`, um único arquivo que abre
  com clique duplo no navegador do computador.
- `npm run rede` → serve o app para aparelhos no mesmo Wi-Fi.
- Android: `npm run build` + `npx cap sync android` e gere o APK no Android Studio.

## Backup

O arquivo de backup (versão 5) contém transações, cartões, compras,
pagamentos e devedores, além de um campo `modules` com Metas, Orçamentos,
Previsões manuais e preferências. Backups antigos, sem `modules`,
continuam podendo ser importados.
