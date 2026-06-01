#!/bin/bash

# Script para executar os 3 puzzles com escalonamento
# Cada um inicia em tempos diferentes para não sobrecarregar a API
# Total: 20s dividido entre 3 = ~6.6s de offset

DELAY_MS=20000
OFFSET_S=7  # Aproximadamente 20/3 segundos

echo "🚀 Iniciando os 3 puzzles com escalonamento (20s de intervalo total)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Offset entre inicios: ${OFFSET_S}s"
echo ""

# Puzzle 71 - Inicia imediatamente
echo "[0s] 🔄 Iniciando Puzzle 71..."
DELAY_MS=$DELAY_MS PUZZLE_ID=71 node puzzle_solver.js &
PUZZLE_71_PID=$!

# Puzzle 72 - Inicia após OFFSET_S segundos
sleep $OFFSET_S
echo "[${OFFSET_S}s] 🔄 Iniciando Puzzle 72..."
DELAY_MS=$DELAY_MS PUZZLE_ID=72 node puzzle_solver.js &
PUZZLE_72_PID=$!

# Puzzle 73 - Inicia após 2*OFFSET_S segundos
sleep $OFFSET_S
echo "$((OFFSET_S * 2))s] 🔄 Iniciando Puzzle 73..."
DELAY_MS=$DELAY_MS PUZZLE_ID=73 node puzzle_solver.js &
PUZZLE_73_PID=$!

echo ""
echo "✅ Puzzle 71 (PID: $PUZZLE_71_PID) - Requisição em: ~0s, ~20s, ~40s..."
echo "✅ Puzzle 72 (PID: $PUZZLE_72_PID) - Requisição em: ~${OFFSET_S}s, ~$((OFFSET_S+20))s, ~$((OFFSET_S+40))s..."
echo "✅ Puzzle 73 (PID: $PUZZLE_73_PID) - Requisição em: ~$((OFFSET_S*2))s, ~$((OFFSET_S*2+20))s, ~$((OFFSET_S*2+40))s..."
echo ""
echo "📊 Distribuição: Requisições distribuídas a cada ~7s sem sobrecarga"
echo "📝 Para parar, use: kill $PUZZLE_71_PID $PUZZLE_72_PID $PUZZLE_73_PID"
echo "   Ou simplesmente: Ctrl+C"

# Aguardar qualquer um deles
wait -n

# Se um terminou (encontrou solução), matar os outros
kill $PUZZLE_71_PID $PUZZLE_72_PID $PUZZLE_73_PID 2>/dev/null

echo ""
echo "🏁 Execução finalizada"
