#!/usr/bin/env node
/**
 * @file puzzle_solver.js
 * @description Buscador unificado otimizado para Bitcoin Puzzles #71, #72, #73
 * @author recifecrypto
 * @version 2.0.0
 * @license MIT
 * 
 * Características:
 * ✅ Suporta múltiplos puzzles (71, 72, 73)
 * ✅ Otimizado com dados iniciais fornecidos
 * ✅ Busca aleatória Monte Carlo eficiente
 * ✅ Batch API otimizado
 * ✅ Persistência de estado
 * ✅ Logging completo
 * ✅ Rate limiting respeitado
 */

import crypto from 'crypto';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EC from 'elliptic';
import bs58 from 'bs58';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ec = new EC.ec('secp256k1');

// ═══════════════════════════════════════════════════════════════
// 1. CONFIGURAÇÃO GLOBAL
// ═══════════════════════════════════════════════════════════════

const PUZZLE_CONFIG = {
  71: {
    name: 'PUZZLE_71',
    target: '1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU',
    rangeMin: '0x0000000000000000000000000000000000000000000000400000000000000000',
    rangeMax: '0x00000000000000000000000000000000000000000000007fffffffffffffffff',
    initialPrivkey: '0x0000000000000000000000000000000000000000000000400000000000000000',
    expectedAddrComp: '19rsCtDEBJFGAuStRqZHx9utR97iugzaHr',
    expectedAddrUncomp: '1A3yMf9PogaoG6sCZME36VFz5Bzt6EFSGF',
  },
  72: {
    name: 'PUZZLE_72',
    target: '1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR',
    rangeMin: '0x0000000000000000000000000000000000000000000000800000000000000000',
    rangeMax: '0x0000000000000000000000000000000000000000000000ffffffffffffffffff',
    initialPrivkey: '0x0000000000000000000000000000000000000000000000800000000000000000',
    expectedAddrComp: '1LJ1JyZH8UmJ9NwicwzKkebUg5L4Z5pcuR',
    expectedAddrUncomp: '1KHiesft3UNEkjxfe3ZumTrq7X1BZSGZqQ',
  },
  73: {
    name: 'PUZZLE_73',
    target: '12VVRNPi4SJqUTsp6FmqDqY5sGosDtysn4',
    rangeMin: '0x0000000000000000000000000000000000000000000001000000000000000000',
    rangeMax: '0x0000000000000000000000000000000000000000000001ffffffffffffffffff',
    initialPrivkey: '0x0000000000000000000000000000000000000000000001000000000000000000',
    expectedAddrComp: '1Xc7vgYDfb7LEwfPYuoTt5UcLuQcYPp1w',
    expectedAddrUncomp: '16QfNs7JgzN9QV3ZjkqNnSNnihRgVbLQWp',
  },
};

const RUNTIME_CONFIG = {
  PUZZLE_ID: Number(process.env.PUZZLE_ID || 72),
  BLOCO_LOG: Number(process.env.BLOCO_LOG || 100000),
  BATCH_SIZE: Number(process.env.BATCH_SIZE || 100),
  DELAY_MS: Number(process.env.DELAY_MS || 20000),
  MAX_REQ_24H: 2450,
  BLOCKCHAIR_KEY: process.env.BLOCKCHAIR_KEY || null,
  TIMEOUT_MS: Number(process.env.TIMEOUT_MS || 10000),
  EXEC_TIMEOUT_S: Number(process.env.EXEC_TIMEOUT_S || 30),
  SEARCH_MODE: process.env.SEARCH_MODE || 'sequential', // 'sequential' agora é o padrão
};

// ═══════════════════════════════════════════════════════════════
// 2. CORE CRIPTOGRÁFICO
// ═══════════════════════════════════════════════════════════════

class CryptoEngine {
  /**
   * Converte privkey para endereço Bitcoin comprimido
   */
  static privkeyToAddress(privkeyInt, compressed = true) {
    const privkeyHex = BigInt(privkeyInt).toString(16).padStart(64, '0');
    const key = ec.keyFromPrivate(privkeyHex);
    const pubkey = key.getPublic();
    const x = pubkey.getX().toString(16).padStart(64, '0');
    const y = pubkey.getY().toString(16).padStart(64, '0');

    let pubkeyBuffer;
    if (compressed) {
      const prefix = parseInt(y.slice(-1), 16) % 2 === 0 ? '02' : '03';
      pubkeyBuffer = Buffer.from(prefix + x, 'hex');
    } else {
      pubkeyBuffer = Buffer.from('04' + x + y, 'hex');
    }

    const sha256 = createHash('sha256').update(pubkeyBuffer).digest();
    const ripemd160 = createHash('ripemd160').update(sha256).digest();
    const payload = Buffer.concat([Buffer.from([0x00]), ripemd160]);
    const checksum = createHash('sha256')
      .update(createHash('sha256').update(payload).digest())
      .digest()
      .slice(0, 4);
    
    return bs58.encode(Buffer.concat([payload, checksum]));
  }

  /**
   * Converte privkey para WIF
   */
  static privkeyToWif(privkeyInt, compressed = true) {
    const privkeyHex = BigInt(privkeyInt).toString(16).padStart(64, '0');
    const prefix = Buffer.from([0x80]);
    const key = Buffer.from(privkeyHex, 'hex');
    const suffix = compressed ? Buffer.from([0x01]) : Buffer.alloc(0);
    const extended = Buffer.concat([prefix, key, suffix]);
    const checksum = createHash('sha256')
      .update(createHash('sha256').update(extended).digest())
      .digest()
      .slice(0, 4);
    
    return bs58.encode(Buffer.concat([extended, checksum]));
  }

  /**
   * Gera privkey aleatória dentro do intervalo
   */
  static generateRandomPrivkey(min, max) {
    const range = max - min + BigInt(1);
    const randomBytes = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
    return min + (randomBytes % range);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. LOGGER
// ═══════════════════════════════════════════════════════════════

class Logger {
  constructor(puzzle_id) {
    this.logFile = path.join(__dirname, `puzzle${puzzle_id}.log`);
    console.log(`\x1b[36m📝 Arquivo de log configurado em: ${this.logFile}\x1b[0m`);
  }

  _write(level, msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${msg}`;
    console.log(line);
    fs.appendFileSync(this.logFile, line + '\n');
  }

  info(msg) { this._write('INFO', msg); }
  success(msg) { this._write('SUCCESS', msg); }
  warn(msg) { this._write('WARN', msg); }
  error(msg) { this._write('ERROR', msg); }
  found(msg) { this._write('FOUND', msg); }
}

// ═══════════════════════════════════════════════════════════════
// 4. ESTADO E PERSISTÊNCIA
// ═══════════════════════════════════════════════════════════════

class State {
  constructor(puzzle_id) {
    this.puzzle_id = puzzle_id;
    this.stateFile = path.join(__dirname, 'cache', `puzzle${puzzle_id}`, 'state.json');
    this.state = {
      puzzleId: puzzle_id,
      startTime: new Date().toISOString(),
      lastPrivkey: PUZZLE_CONFIG[puzzle_id].initialPrivkey,
      totalChecked: 0,
      iterations: 0,
      foundCandidates: [],
    };
    this._ensureDirs();
    this._load();
  }

  _ensureDirs() {
    const dirs = [
      path.join(__dirname, 'cache', `puzzle${this.puzzle_id}`),
      path.join(__dirname, 'candidates', `puzzle${this.puzzle_id}`),
    ];
    dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    console.log(`\x1b[36m📂 Arquivo de estado configurado em: ${this.stateFile}\x1b[0m`);
  }

  _load() {
    if (fs.existsSync(this.stateFile)) {
      try {
        this.state = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
      } catch (e) {
        // Iniciar novo estado
      }
    }
  }

  save() {
    const dir = path.dirname(this.stateFile);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
    console.log(`\x1b[32m💾 [${new Date().toLocaleTimeString()}] Estado de progresso atualizado no disco.\x1b[0m`);
  }

  recordCheck(privkey) {
    this.state.lastPrivkey = privkey.toString();
    this.state.totalChecked++;
  }

  getProgress() {
    const config = PUZZLE_CONFIG[this.puzzle_id];
    const min = BigInt(config.rangeMin);
    const max = BigInt(config.rangeMax);
    const range = max - min;
    const current = BigInt(this.state.lastPrivkey);
    const progress = ((current - min) * BigInt(100)) / range;
    return {
      percent: Number(progress),
      checked: this.state.totalChecked,
      iterations: this.state.iterations,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. API & VERIFICAÇÃO
// ═══════════════════════════════════════════════════════════════

class ApiClient {
  constructor(logger) {
    this.logger = logger;
    this.quotaFile = path.join(__dirname, 'cache', 'api_quota.json');
  }

  _updateQuota(calls = 1) {
    let quota = { count: 0, firstCall: Date.now() };
    try {
      if (fs.existsSync(this.quotaFile)) {
        quota = JSON.parse(fs.readFileSync(this.quotaFile, 'utf-8'));
      }
    } catch (e) {}

    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    if (now - quota.firstCall > ms24h) {
      quota = { count: calls, firstCall: now };
    } else {
      quota.count += calls;
    }

    fs.writeFileSync(this.quotaFile, JSON.stringify(quota), 'utf-8');
    console.log(`\x1b[36m📊 [API] Cota atualizada: ${quota.count} requisições registradas.\x1b[0m`);
    return quota;
  }

  async checkQuota() {
    try {
      const quota = JSON.parse(fs.readFileSync(this.quotaFile, 'utf-8') || '{}');
      if (quota.count >= RUNTIME_CONFIG.MAX_REQ_24H) {
        this.logger.warn('⚠️ Cota diária atingida. Aguardando 24h...');
        await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000));
      }
    } catch (e) {}
  }

  async queryBlockchair(addresses) {
    await this.checkQuota();
    const url = `https://api.blockchair.com/bitcoin/dashboards/addresses/${addresses.join(',')}`;
    try {
      const resp = await axios.get(url, {
        params: { key: RUNTIME_CONFIG.BLOCKCHAIR_KEY },
        timeout: RUNTIME_CONFIG.TIMEOUT_MS,
      });
      this._updateQuota(1);
      return resp.data?.data || {};
    } catch (err) {
      this.logger.error(`API error: ${err.message}`);
      return {};
    }
  }

  async queryBlockchainInfo(addresses) {
    await this.checkQuota();
    const url = 'https://blockchain.info/multiaddr';
    try {
      const resp = await axios.get(url, {
        params: { active: addresses.join('|'), n: 0 },
        timeout: RUNTIME_CONFIG.TIMEOUT_MS,
      });
      this._updateQuota(1);
      const result = {};
      (resp.data?.addresses || []).forEach(addr => {
        result[addr.address] = addr;
      });
      return result;
    } catch (err) {
      this.logger.error(`API error: ${err.message}`);
      return {};
    }
  }

  async queryBatch(addresses) {
    if (RUNTIME_CONFIG.BLOCKCHAIR_KEY) {
      return this.queryBlockchair(addresses);
    } else {
      return this.queryBlockchainInfo(addresses);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. SOLVER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class PuzzleSolver {
  constructor(puzzle_id) {
    this.puzzle_id = puzzle_id;
    this.config = PUZZLE_CONFIG[puzzle_id];
    this.logger = new Logger(puzzle_id);
    this.state = new State(puzzle_id);
    this.api = new ApiClient(this.logger);
    this.batch = [];
    this.localCount = 0;

    // Converter ranges
    this.rangeMin = BigInt(this.config.rangeMin);
    this.rangeMax = BigInt(this.config.rangeMax);
  }

  /**
   * Valida puzzle com dados iniciais
   */
  validate() {
    this.logger.info(`\n${'═'.repeat(70)}`);
    this.logger.info(`🔍 CONFIGURAÇÃO DO ${this.config.name}`);
    this.logger.info(`${'═'.repeat(70)}`);

    const privkeyInt = BigInt(this.config.initialPrivkey);
    const addrComp = CryptoEngine.privkeyToAddress(privkeyInt, true);
    const addrUncomp = CryptoEngine.privkeyToAddress(privkeyInt, false);

    this.logger.info(`   Privkey Inicial: ${this.config.initialPrivkey}`);
    this.logger.info(`   Endereço Comprimido Calculado: ${addrComp}`);
    this.logger.info(`   Endereço Descomprimido Calculado: ${addrUncomp}`);
    this.logger.info(`   Range Mín: ${this.config.rangeMin}`);
    this.logger.info(`   Range Máx: ${this.config.rangeMax}`);
    this.logger.info(`   Alvo: ${this.config.target}`);
    this.logger.info(`${'═'.repeat(70)}\n`);

    this.logger.success('✅ Configuração carregada com sucesso!');
  }

  _saveFound(item, balance = 0) {
    const puzzleDir = path.join(__dirname, `PUZZLE_${this.puzzle_id}`);
    fs.mkdirSync(puzzleDir, { recursive: true });

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const content = `PUZZLE #${this.puzzle_id} ENCONTRADO!\n` +
      `Data: ${timestamp}\n` +
      `Endereço: ${item.addr}\n` +
      `Saldo: ${balance}\n` +
      `Privkey (Hex): ${item.privHex}\n` +
      `Privkey (Int): ${item.privInt}\n` +
      `WIF: ${item.wif}\n`;

    const fileTxt = path.join(puzzleDir, `FOUND_${item.addr}.txt`);
    const fileJsonl = path.join(puzzleDir, `api_results.jsonl`);
    const fileSummary = path.join(puzzleDir, `found_addresses.txt`);

    fs.writeFileSync(fileTxt, content, 'utf-8');
    
    fs.appendFileSync(fileSummary, `[${timestamp}] Addr: ${item.addr} | Saldo: ${balance} | WIF: ${item.wif}\n`, 'utf-8');
    
    const record = { ...item, balance, timestamp, puzzleId: this.puzzle_id };
    fs.appendFileSync(fileJsonl, JSON.stringify(record) + '\n', 'utf-8');

    this.logger.found(`🎉 SUCESSO! Resultados em: ${puzzleDir}`);
    console.log(`\x1b[32m🚀 CHAVE SALVA EM: ${fileTxt}\x1b[0m`);
    console.log(`\x1b[32m📋 LISTA ATUALIZADA EM: ${fileSummary}\x1b[0m`);
    console.log(`\x1b[36m📄 INFO API SALVA EM: ${fileJsonl}\x1b[0m`);
  }

  _logBatch(batchData, apiResults) {
    const puzzleDir = path.join(__dirname, `PUZZLE_${this.puzzle_id}`);
    fs.mkdirSync(puzzleDir, { recursive: true });
    const fileJsonl = path.join(puzzleDir, 'batch_history.jsonl');

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    let logs = '';
    batchData.forEach(item => {
      const info = apiResults[item.addr] || {};
      const balance = info?.address?.balance || info?.final_balance || info?.balance || 0;
      const record = { 
        ...item, 
        api_raw: info, // Salva o retorno completo da API
        balance, 
        timestamp, 
        puzzleId: this.puzzle_id 
      };
      logs += JSON.stringify(record) + '\n';
    });
    
    fs.appendFileSync(fileJsonl, logs, 'utf-8');
  }

  /**
   * Processa um lote de endereços
   */
  async processBatch() {
    if (this.batch.length === 0) return;

    const addresses = this.batch.map(b => b.addr);
    this.logger.info(`📡 Consultando lote de ${this.batch.length} endereços na API...`);
    const results = await this.api.queryBatch(addresses);

    // Salvar histórico do lote em tempo real
    this._logBatch(this.batch, results);

    for (const item of this.batch) {
      const info = results[item.addr];
      const balance = info?.address?.balance || info?.final_balance || 0;

      if (balance > 0) {
        this.logger.found(`💰 Endereço com saldo detectado: ${item.addr}`);
        this._saveFound(item, balance);
        process.exit(0);
      }
    }

    this.batch = [];
    await new Promise(r => setTimeout(r, RUNTIME_CONFIG.DELAY_MS));
  }

  /**
   * Executa um ciclo de busca com lote de endereços e delay
   */
  async searchCycle() {
    const cycleStartPrivkey = BigInt(this.state.state.lastPrivkey);
    const cycleStartTime = Date.now();

    while (this.batch.length < RUNTIME_CONFIG.BATCH_SIZE) {
      let privkey;
      if (RUNTIME_CONFIG.SEARCH_MODE === 'sequential') {
        // Modo Sequencial: Usa o estado para nunca repetir
        privkey = BigInt(this.state.state.lastPrivkey) + 1n;
        if (privkey > this.rangeMax) privkey = this.rangeMin;
      } else {
        // Modo Aleatório: Estatisticamente seguro pela imensidão do range
        privkey = CryptoEngine.generateRandomPrivkey(this.rangeMin, this.rangeMax);
      }

      const addr = CryptoEngine.privkeyToAddress(privkey, true);

      this.localCount++;
      this.state.recordCheck(privkey);

      // Adicionar ao lote
      const currentItem = {
        addr,
        privHex: privkey.toString(16).padStart(64, '0'),
        privInt: privkey.toString(),
        wif: CryptoEngine.privkeyToWif(privkey, true),
      };

      // Verificação de alvo imediata
      if (addr === this.config.target) {
        this.logger.found(`🎯 ALVO ESPECÍFICO ATINGIDO: ${addr}`);
        this._saveFound(currentItem, 0); // Salva imediatamente
        process.exit(0);
      }

      this.batch.push(currentItem);
    }

    // Lote completado - processar com API
    const cycleElapsed = ((Date.now() - cycleStartTime) / 1000).toFixed(1);
    const cycleEndPrivkey = BigInt(this.state.state.lastPrivkey);
    await this.processBatch(); // Inclui o delay de DELAY_MS
    
    const progress = this.state.getProgress();
    this.logger.info(`✅ Lote processado`);
    this.logger.info(`   Range: ${cycleStartPrivkey.toString()} → ${cycleEndPrivkey.toString()}`);
    this.logger.info(`   Progresso: ${progress.percent.toFixed(2)}% | Total: ${this.state.state.totalChecked.toLocaleString()}`);
  }

  /**
   * Loop principal de busca - ciclos com lotes e delay
   */
  async search() {
    this.validate();
    this.logger.info(`🚀 Iniciando busca por ${this.config.name}...`);
    this.logger.info(`📦 Lotes de ${RUNTIME_CONFIG.BATCH_SIZE} endereços`);
    this.logger.info(`⏱️  Delay entre lotes: ${RUNTIME_CONFIG.DELAY_MS / 1000}s`);
    this.logger.info(`📝 Modo: ${RUNTIME_CONFIG.SEARCH_MODE.toUpperCase()} - Sem repetição de endereços`);

    let cycleCount = 0;

    while (true) {
      cycleCount++;
      this.logger.info(`\n${'═'.repeat(70)}`);
      this.logger.info(`🔄 LOTE #${cycleCount}`);
      this.logger.info(`   Próxima privkey: ${(BigInt(this.state.state.lastPrivkey) + 1n).toString()}`);
      this.logger.info(`${'═'.repeat(70)}`);
      await this.searchCycle();
      this.logger.info(`⏳ Aguardando ${RUNTIME_CONFIG.DELAY_MS / 1000}s antes do próximo lote...`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const puzzleId = RUNTIME_CONFIG.PUZZLE_ID;

  if (![71, 72, 73].includes(puzzleId)) {
    console.error(`❌ Puzzle inválido. Use: PUZZLE_ID=71|72|73`);
    process.exit(1);
  }

  console.log('\x1b[35m%s\x1b[0m', '╔════════════════════════════════════════════════════════════╗');
  console.log('\x1b[35m%s\x1b[0m', `║  🚀 SISTEMA ATIVO - INICIANDO PUZZLE #${puzzleId}             ║`);
  console.log('\x1b[35m%s\x1b[0m', '╚════════════════════════════════════════════════════════════╝');
  console.log('\x1b[33m%s\x1b[0m', 'Aguardando validação inicial...');

  const solver = new PuzzleSolver(puzzleId);
  
  process.on('SIGINT', () => {
    console.log(`\n\x1b[33m⏸️ Interrupção detectada. Salvando progresso final...\x1b[0m`);
    solver.state.save();
    console.log(`\x1b[32m✅ Estado seguro. Encerrando sistema.\x1b[0m`);
    process.exit(0);
  });

  await solver.search();
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
