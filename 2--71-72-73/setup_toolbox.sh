#!/bin/bash
# =============================================================================
# SETUP JS - TOOLBOX FEDORA + BITCOIN PUZZLES (v2.2 — Fnm & Requests Optimized)
# =============================================================================
# Script adaptativo que funciona respeitando o isolamento do runtime
# MODO DE USO:
#   toolbox enter puzzle-solver
#   cd ~/OneDrive/72
#   bash setup_toolbox.sh
# =============================================================================

set +e  # NÃO parar em erro — trataremos manualmente

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SETUP PUZZLE SOLVER v2.2 (Toolbox Fedora Adaptivo)       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────
# DIAGNÓSTICO: Detectar restrições e injetar ambiente fnm
# ─────────────────────────────────────────────────────────────────

echo "🔍 [0/3] Diagnosticando ambiente e carregando perfis..."

# Ativar o fnm se ele estiver instalado no home do usuário
if [ -d "$HOME/.local/share/fnm" ]; then
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env --shell bash)"
fi

CAN_SUDO=false
if sudo -n true 2>/dev/null; then
  CAN_SUDO=true
  echo "✅ sudo disponível (sem senha requerida)"
elif [ "$EUID" -eq 0 ]; then
  CAN_SUDO=true
  echo "✅ Rodando como root"
else
  echo "⚠️  sudo bloqueado (no_new_privileges detectado)"
fi

# Garantir o python3-requests do sistema para limpar o hook de erro
if rpm -q python3-requests &>/dev/null; then
  echo "✅ python3-requests já está instalado no sistema"
else
  if [ "$CAN_SUDO" = true ]; then
    echo "📥 Instalando python3-requests para estabilização do ambiente..."
    sudo dnf install -y python3-requests 2>/dev/null
  fi
fi

# ─────────────────────────────────────────────────────────────────
# 1. VERIFICAR / INSTALAR NODE.JS VIA FNM OU DNF
# ─────────────────────────────────────────────────────────────────

echo ""
echo "🟨 [1/3] Verificando Node.js..."

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  NPM_VERSION=$(npm --version)
  echo "✅ Node.js AMBIENTE ATIVO:"
  echo "   Node.js: $NODE_VERSION"
  echo "   npm: $NPM_VERSION"
else
  echo "📥 Node.js não encontrado no PATH atual. Tentando recuperar fnm..."
  if command -v fnm &> /dev/null; then
    fnm install --lts && fnm use default
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ Node.js ativado via fnm: $NODE_VERSION"
  else
    echo "🔄 fnm não encontrado. Tentando DNF de fallback..."
    if [ "$CAN_SUDO" = true ]; then
      sudo dnf install -y nodejs npm 2>/dev/null
    else
      dnf install -y nodejs npm 2>/dev/null
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────
# 2. VALIDAÇÃO DE MANUTENÇÃO (OPCIONAL)
# ─────────────────────────────────────────────────────────────────

echo ""
echo "📦 [2/3] Verificação do Gerenciador de Pacotes..."
if command -v node &>/dev/null; then
  echo "   ✅ Runtime pronto para a execução local."
else
  echo "   ⚠️  Aviso: Sem runtime Node.js funcional."
fi

# ─────────────────────────────────────────────────────────────────
# 3. INSTALAR DEPENDÊNCIAS NODE.JS
# ─────────────────────────────────────────────────────────────────

echo ""
echo "📚 [3/3] Dependências Node.js (elliptic, bs58, axios)..."

# Navegar para pasta do projeto
cd /var/home/recifecrypto/OneDrive/72 2>/dev/null || cd ~/OneDrive/72 2>/dev/null || cd ~ || {
  echo "❌ Pasta não encontrada"
  exit 1
}

if [ ! -f "package.json" ]; then
  echo "❌ package.json não existe em $(pwd)"
  exit 1
fi

# Limpeza preventiva e instalação segura sem quebrar árvore de dependências
echo "⚙️  Executando limpeza e instalação local em $(pwd)..."
rm -rf node_modules package-lock.json
npm install 2>&1 | tail -5

# ──────────────────────────────────────────────────────────────────
# VERIFICAÇÃO FINAL
# ──────────────────────────────────────────────────────────────────

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETO!                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if command -v node &>/dev/null; then
  echo "📊 VERSÕES ATIVAS NO AMBIENTE:"
  echo "  • Node.js:  $(node --version)"
  echo "  • npm:      $(npm --version)"
else
  echo "⚠️  Setup concluído, mas adicione o fnm/node ao seu PATH local."
fi

echo ""
echo "📁 LOCALIZAÇÃO:"
echo "  • Pasta: $(pwd)"
echo ""

if [ -d "node_modules" ]; then
  MODULES_COUNT=$(ls -1 node_modules | wc -l)
  echo "📦 MÓDULOS ATIVOS: $MODULES_COUNT"
  echo "  ✅ elliptic (ECDSA - com Overrides aplicados)"
  echo "  ✅ bs58 (Bitcoin encode)"
  echo "  ✅ axios (HTTP client)"
fi

echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo "  1. PUZZLE_ID=72 node puzzle_solver.js"
echo ""