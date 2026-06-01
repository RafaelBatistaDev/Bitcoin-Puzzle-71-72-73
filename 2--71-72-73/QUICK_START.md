# ⚡ QUICK START — Bitcoin Puzzle Solver

**Node.js ESM • Toolbox Fedora • 3 passos**

---

# 1. Criar o container isolado
toolbox create puzzle-solver

# 2. Entrar no container para configurar o ambiente interno
toolbox enter puzzle-solver

# 3. Instalar a dependência Python do sistema para eliminar o erro do [requests]
sudo dnf install -y python3-requests

# 4. Recarregar o shell para puxar o fnm que já está na sua Home
source ~/.bashrc

# 5. Garantir que o Node padrão está ativo no terminal atual
fnm use default

# 6. Entrar na pasta do projeto e rodar a instalação limpa do NPM
cd ~/OneDrive/72
rm -rf node_modules package-lock.json
npm install

---
# 1. Entre no ambiente isolado
toolbox enter puzzle-solver

# 2. Navegue até o diretório do projeto
cd ~/OneDrive/72

# 3. Execute definindo o Puzzle alvo (71, 72 ou 73)
PUZZLE_ID=71 node puzzle_solver.js
PUZZLE_ID=72 node puzzle_solver.js
PUZZLE_ID=73 node puzzle_solver.js
---

# Opção 1: Separado (sequencial)
PUZZLE_ID=71 node puzzle_solver.js
PUZZLE_ID=72 node puzzle_solver.js
PUZZLE_ID=73 node puzzle_solver.js

# Opção 2: Junto (paralelo + escalonado)
./run_all_puzzles.sh

npm start
---
## 3️⃣ Monitorar Progresso (Terminal Adicional)

```bash
# Em outro terminal/aba
toolbox enter puzzle-solver
cd ~/OneDrive/72

# Ver log em tempo real
tail -f puzzle72.log

# Ou ver estado de cache
cat cache/puzzle72/state.json | jq .
```

---

## 📋 Estrutura do Projeto

```
puzzle-solver/
├── puzzle_solver.js       ← engine principal (Node.js ESM)
├── package.json           ← dependências (elliptic, bs58, axios)
├── setup_toolbox.sh       ← configuração automática
├── cache/
│   ├── api_quota.json     ← limites da API
│   └── puzzle7X/
│       └── state.json     ← estado persistente
├── PUZZLE_7X/
│   └── batch_history.jsonl← histórico de execução
└── README.md / CLAUDE.md  ← documentação
```

---

## ✅ Stack (Definitivo)

| Aspecto | Stack |
|--------|-------|
| **Linguagem** | JavaScript (Node.js 18+) |
| **Módulos** | ESM (`"type": "module"`) |
| **Container** | Toolbox Fedora (Podman) |
| **Deps** | elliptic, bs58, axios |
| **Setup** | bash setup_toolbox.sh |

---

## 🚫 Removido (Completamente)

- ❌ Python 3.x
- ❌ pyproject.toml
- ❌ .python-version
- ❌ uv.lock

**Motivo:** Projeto consolidado em **exclusivamente Node.js ESM** para performance e manutenibilidade.

---

## 🔧 Troubleshooting

### "sudo: o sinalizador 'sem novos privilégios' está definido"

**Problema:** Toolbox foi criado com restrições `no_new_privileges`.

**Solução rápida (3 passos):**
```bash
# 1. Remover toolbox com problemas
toolbox rm puzzle-solver

# 2. Recriar corretamente (IMPORTANTE: sem nenhuma flag)
toolbox create puzzle-solver

# 3. Entrar e rodar setup
toolbox enter puzzle-solver
cd ~/OneDrive/72
bash setup_toolbox.sh
```

**Por que funciona:** Sem flags adicionais, o toolbox permite uso de `sudo` normalmente.

### "Command not found: toolbox"
```bash
# Fedora Kinoite/Silverblue — toolbox já vem instalado
# Se não tiver, instale:
sudo rpm-ostree install toolbox
# E reinicie o sistema
```

### "Cannot connect to container"
```bash
# Verifique se Podman está rodando
systemctl --user status podman.socket

# Ou use systemctl para iniciar
systemctl --user start podman.socket
```

### "npm install falha"
```bash
# Dentro do toolbox, tente:
npm cache clean --force
npm install
```

---

## 📖 Referência Completa

Leia [CLAUDE.md](CLAUDE.md) para diretrizes técnicas ou [README.md](README.md) para documentação detalhada.

---

**Versão:** 2.0 | **Atualizado:** 30/05/2026 | **Status:** ✅ Pronto para Produção
