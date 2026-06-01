
# 🎯 BITCOIN PUZZLE SOLVER - v2.0
**Sistema Exclusivo Node.js (ESM) • Toolbox Fedora • Podman Rootless**

---

## 🚀 QUICK START

### 1️⃣ Primeira Vez - Configurar Toolbox

```bash
# Criar container Fedora
toolbox create puzzle-solver

# Entrar no toolbox
toolbox enter puzzle-solver

# Executar setup
cd ~/OneDrive/72 && bash setup_toolbox.sh
```

### 2️⃣ Executar Solver

```bash
# Entrar no toolbox (se não estiver dentro)
toolbox enter puzzle-solver

# Rodar com puzzle específico
cd ~/OneDrive/72
PUZZLE_ID=72 node puzzle_solver.js
```

### 3️⃣ Monitorar Progresso (Terminal Extra)

```bash
# Em outro terminal
toolbox enter puzzle-solver
cd ~/OneDrive/72
tail -f puzzle72.log
```

---

## 🧹 Manutenção

Se precisar resetar os containers:

```bash
# Deletar todos os toolboxes (forçado)
toolbox rm --force --all
```

---

## 📋 Estrutura

- **puzzle_solver.js** — engine principal (Node.js ESM)
- **package.json** — dependências (elliptic, bs58, axios)
- **setup_toolbox.sh** — setup automático dentro do toolbox
- **cache/** — estado persistente (JSON)
- **PUZZLE_7X/** — histórico de batches por puzzle

---

## ✅ Stack

- **Runtime:** Node.js 18+ (ESM)
- **Container:** Toolbox Fedora
- **Deps:** elliptic (ECDSA), bs58 (Bitcoin encode), axios (API)

---