// Match score: paladar do user × ficha técnica do vinho.
// Decisões fechadas em jun/2026 (Gabriel). Ver docs/spec/03-meu-paladar.md § Algoritmo
// e docs/spec/decisoes-pendentes-gabriel.md (D30-D35).
//
// Eixos do paladar (5D): acidez, tanino, frutado, docura, corpo.
// User vem do quiz em escala 0-100. Vinho vem do admin do comerciante em escala 1-5
// (acidez/tanino/frutado/docura) + categórico (corpo).

export const DIMS = ['acidez', 'tanino', 'frutado', 'docura', 'corpo'];

export const WEIGHTS = {
  acidez:  1.5,
  tanino:  1.5,
  frutado: 1.0,
  docura:  1.0,
  corpo:   1.0,
};

export const WEIGHT_SUM = DIMS.reduce((s, k) => s + WEIGHTS[k], 0); // 6.0

// Corpo é categórico no admin do comerciante.
export const MAP_CORPO = {
  'Leve':            25,
  'Médio':           50,
  'Médio-encorpado': 70,
  'Encorpado':       90,
};

// Tier de exibição do badge (mantém threshold 75/50 do componente atual).
export const TIER_THRESHOLDS = { high: 75, medium: 50 };

// Pesos do score Descobrir (70% paladar + 30% popularidade).
export const DESCOBRIR_WEIGHTS = { paladar: 0.7, popularidade: 0.3 };

// Normaliza eixo numérico 1-5 do vinho para 0-100.
// 1=0, 2=25, 3=50, 4=75, 5=100.
export function normalizeAxis(value) {
  if (value == null || isNaN(value)) return null;
  return (Math.max(1, Math.min(5, Number(value))) - 1) * 25;
}

// Converte ficha técnica do vinho (comerciante) num vetor 0-100 nos 5 eixos.
// Aceita também perfis já em 0-100 (mock atual), retorna como veio.
export function normalizeWine(wine) {
  if (!wine) return null;
  const out = {};
  for (const k of DIMS) {
    let v = wine[k];
    if (v == null) continue;
    if (k === 'corpo' && typeof v === 'string') {
      out.corpo = MAP_CORPO[v] != null ? MAP_CORPO[v] : null;
      continue;
    }
    const n = Number(v);
    if (isNaN(n)) continue;
    // Heurística: se vier > 5, assume já em escala 0-100 (mock legado).
    out[k] = n > 5 ? Math.max(0, Math.min(100, n)) : normalizeAxis(n);
  }
  return out;
}

// Score paladar 0-100. user em 0-100 nos 5 eixos. wine pode vir 1-5 ou 0-100.
// Fórmula: 100 − Σ(|wineNorm[k] − user[k]| × peso[k]) / Σ peso[k].
export function paladarScore(user, wine) {
  if (!user || !wine) return null;
  const wn = normalizeWine(wine);
  if (!wn) return null;
  let diff = 0, wSum = 0;
  for (const k of DIMS) {
    if (user[k] == null || wn[k] == null) continue;
    diff += Math.abs(wn[k] - user[k]) * WEIGHTS[k];
    wSum += WEIGHTS[k];
  }
  if (wSum === 0) return null;
  return Math.max(0, Math.round(100 - diff / wSum));
}

// Popularidade 0-100. registros_60d × 2 + avaliacoes_4_5_estrelas_60d × 1.5, capado em 100.
export function popularidadeScore({ registros60d = 0, avaliacoes4e5_60d = 0 } = {}) {
  return Math.max(0, Math.min(100, Math.round(registros60d * 2 + avaliacoes4e5_60d * 1.5)));
}

// Score Descobrir 0-100. 70% paladar + 30% popularidade. Se um dos sinais não existir,
// recai pro que existe (sem editorial — decisão Gabriel jun/2026).
export function descobrirScore({ paladar = null, popularidade = null } = {}) {
  if (paladar == null && popularidade == null) return null;
  if (paladar == null) return Math.round(popularidade);
  if (popularidade == null) return Math.round(paladar);
  const { paladar: wp, popularidade: wpo } = DESCOBRIR_WEIGHTS;
  return Math.round(wp * paladar + wpo * popularidade);
}

export function matchTier(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'unknown';
  if (score >= TIER_THRESHOLDS.high) return 'high';
  if (score >= TIER_THRESHOLDS.medium) return 'medium';
  return 'low';
}
