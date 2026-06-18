// Roda com: node src/services/match-score.test.mjs
// Sem framework: usa assert nativo do node. Exit 0 = passou. Exit 1 = falhou.
import assert from 'node:assert/strict';
import {
  DIMS, WEIGHTS, WEIGHT_SUM, MAP_CORPO, TIER_THRESHOLDS, DESCOBRIR_WEIGHTS,
  normalizeAxis, normalizeWine, paladarScore, popularidadeScore, descobrirScore, matchTier,
} from './match-score.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); console.log(`ok    ${name}`); passed++; }
  catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); failed++; }
};

test('DIMS tem 5 eixos na ordem fechada', () => {
  assert.deepEqual(DIMS, ['acidez', 'tanino', 'frutado', 'docura', 'corpo']);
});

test('WEIGHT_SUM = 6.0', () => {
  assert.equal(WEIGHT_SUM, 6.0);
});

test('MAP_CORPO bate com decisão fechada', () => {
  assert.equal(MAP_CORPO['Leve'], 25);
  assert.equal(MAP_CORPO['Médio'], 50);
  assert.equal(MAP_CORPO['Médio-encorpado'], 70);
  assert.equal(MAP_CORPO['Encorpado'], 90);
});

test('normalizeAxis converte 1-5 para 0-100', () => {
  assert.equal(normalizeAxis(1), 0);
  assert.equal(normalizeAxis(2), 25);
  assert.equal(normalizeAxis(3), 50);
  assert.equal(normalizeAxis(4), 75);
  assert.equal(normalizeAxis(5), 100);
});

test('normalizeAxis aceita null e nan', () => {
  assert.equal(normalizeAxis(null), null);
  assert.equal(normalizeAxis(undefined), null);
  assert.equal(normalizeAxis('xyz'), null);
});

test('normalizeWine converte ficha técnica 1-5 + corpo categórico', () => {
  const wine = { acidez: 4, tanino: 4, frutado: 2, docura: 1, corpo: 'Encorpado' };
  assert.deepEqual(normalizeWine(wine), { acidez: 75, tanino: 75, frutado: 25, docura: 0, corpo: 90 });
});

test('normalizeWine mantém perfil legacy em 0-100 (heurística > 5)', () => {
  const legacy = { acidez: 70, tanino: 65, frutado: 60, docura: 25, corpo: 75 };
  assert.deepEqual(normalizeWine(legacy), legacy);
});

test('paladarScore identico → 100', () => {
  const user = { acidez: 70, tanino: 70, frutado: 60, docura: 25, corpo: 75 };
  const wine = { acidez: 70, tanino: 70, frutado: 60, docura: 25, corpo: 75 };
  assert.equal(paladarScore(user, wine), 100);
});

test('paladarScore vinho com perfil 1-5 e user em 0-100', () => {
  // wine norm: acidez=75, tanino=75, frutado=25, docura=0, corpo=90
  const wine = { acidez: 4, tanino: 4, frutado: 2, docura: 1, corpo: 'Encorpado' };
  const user = { acidez: 75, tanino: 75, frutado: 25, docura: 0, corpo: 90 };
  assert.equal(paladarScore(user, wine), 100);
});

test('paladarScore pesa Acidez/Tanino 1.5x', () => {
  // Erro só em acidez (peso 1.5) vs erro só em corpo (peso 1.0):
  const user = { acidez: 50, tanino: 50, frutado: 50, docura: 50, corpo: 50 };
  const wineAcidez = { acidez: 100, tanino: 50, frutado: 50, docura: 50, corpo: 50 };
  const wineCorpo  = { acidez: 50, tanino: 50, frutado: 50, docura: 50, corpo: 100 };
  // Diff acidez = 50 * 1.5 = 75; score = 100 - 75/6 = 100 - 12.5 = 87.5 → 88
  // Diff corpo  = 50 * 1.0 = 50; score = 100 - 50/6 = 100 - 8.33 = 91.67 → 92
  assert.equal(paladarScore(user, wineAcidez), 88);
  assert.equal(paladarScore(user, wineCorpo), 92);
});

test('paladarScore retorna null se faltar input', () => {
  assert.equal(paladarScore(null, {}), null);
  assert.equal(paladarScore({}, null), null);
});

test('paladarScore não fica abaixo de 0', () => {
  const user = { acidez: 0, tanino: 0, frutado: 0, docura: 0, corpo: 0 };
  const wine = { acidez: 100, tanino: 100, frutado: 100, docura: 100, corpo: 100 };
  assert.equal(paladarScore(user, wine), 0);
});

test('popularidadeScore cap em 100', () => {
  assert.equal(popularidadeScore({ registros60d: 0, avaliacoes4e5_60d: 0 }), 0);
  assert.equal(popularidadeScore({ registros60d: 10, avaliacoes4e5_60d: 10 }), 35); // 20 + 15
  assert.equal(popularidadeScore({ registros60d: 1000, avaliacoes4e5_60d: 0 }), 100);
});

test('descobrirScore 70/30', () => {
  assert.equal(descobrirScore({ paladar: 100, popularidade: 0 }), 70);
  assert.equal(descobrirScore({ paladar: 0, popularidade: 100 }), 30);
  assert.equal(descobrirScore({ paladar: 80, popularidade: 60 }), 74); // 56 + 18 = 74
});

test('descobrirScore recai pro sinal disponível', () => {
  assert.equal(descobrirScore({ paladar: 80, popularidade: null }), 80);
  assert.equal(descobrirScore({ paladar: null, popularidade: 60 }), 60);
  assert.equal(descobrirScore({}), null);
});

test('matchTier thresholds', () => {
  assert.equal(matchTier(75), 'high');
  assert.equal(matchTier(50), 'medium');
  assert.equal(matchTier(49), 'low');
  assert.equal(matchTier(null), 'unknown');
});

console.log(`\n${passed} passou · ${failed} falhou`);
if (failed > 0) process.exit(1);
