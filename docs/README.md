# ScriptToSheet — Documentação Geral

**ScriptToSheet** é uma ferramenta de produção audiovisual que transforma roteiros do Google Docs em shotlists gerenciáveis numa interface web moderna.

---

## O que é

Um produtor ou roteirista usa o Google Docs pra escrever o roteiro. Conforme vão trabalhando, eles adicionam **comentários** ao texto — indicando sugestões de edição, ideias de layout, animações, etc.

O ScriptToSheet extrai esses comentários automaticamente, cria uma planilha no Google Sheets com cada trecho comentado como uma "cena", e oferece uma interface web pra gerenciar o status de produção de cada cena.

---

## Fluxo completo

```
Google Docs (com comentários)
        │
        ▼ appscript_backend.gs
        │  Drive API v3 → extrai comentários → ordena pela posição no texto
        │
        ▼ Google Sheets (planilha mãe de índice + abas por projeto)
        │
        ▼ gerenciador.gs (Web App — API REST)
        │  doPost() → roteador de ações (listarProjetos, listarCenas, atualizarCena...)
        │
        ▼ Frontend React (app/)
           Sidebar → seleciona projeto
           CenaTable → visualiza e edita shotlist
           CenaDetalhePanel → painel de detalhes de uma cena
```

---

## Repositórios e Deploy

| Recurso | URL |
|---------|-----|
| GitHub | https://github.com/leonmachado91/scripttosheet |
| Frontend (Netlify) | https://scripttosheet.netlify.app |
| Backend (Google Apps Script) | Deploy no seu Google Workspace — ver `docs/BACKEND.md` |

---

## Arquivos do repositório

```
ScriptToSheet/
├── app/                        → Frontend React/TypeScript
│   ├── src/
│   │   ├── components/         → Componentes UI
│   │   ├── services/api.ts     → Cliente HTTP pra API do Apps Script
│   │   ├── stores/             → Estado global (Zustand)
│   │   └── types/index.ts      → Tipos TypeScript compartilhados
│   ├── index.html
│   └── vite.config.ts
│
├── gerenciador.gs              → Backend principal (API REST via Apps Script)
├── appscript_backend.gs        → Extrator de cenas dos comentários do Docs
├── extrator_diagnostico.gs     → Script de diagnóstico de extração
├── extrator_teste_standalone.gs → Teste isolado do extrator
├── investigar_html.gs          → Script de investigação do HTML do Docs
│
└── docs/                       → Esta documentação
    ├── README.md               → Visão geral (este arquivo)
    ├── BACKEND.md              → gerenciador.gs + configuração
    ├── EXTRATOR.md             → appscript_backend.gs (extração de cenas)
    ├── FRONTEND.md             → Arquitetura React
    └── API.md                  → Referência de todos os endpoints
```

---

## Documentação detalhada

| Arquivo | O que cobre |
|---------|-------------|
| [BACKEND.md](./BACKEND.md) | Como configurar e fazer deploy do gerenciador.gs |
| [EXTRATOR.md](./EXTRATOR.md) | Como funciona a extração de comentários do Google Docs |
| [FRONTEND.md](./FRONTEND.md) | Arquitetura React, componentes, stores |
| [API.md](./API.md) | Todos os endpoints da API REST |

---

## Pré-requisitos

- Conta Google com acesso ao Google Drive, Docs e Sheets
- Node.js 18+ e pnpm (para o frontend)
- Google Apps Script configurado (ver BACKEND.md)
