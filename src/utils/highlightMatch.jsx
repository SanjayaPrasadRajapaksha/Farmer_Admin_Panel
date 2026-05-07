
const normalizeSearchMode = (mode) => (String(mode || "contains").toLowerCase() === "fuzzy" ? "fuzzy" : "contains");

export function fuzzyMatch(text, query) {
  const original = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return true;

  const lower = original.toLowerCase();
  const qLower = q.toLowerCase();
  let qIdx = 0;

  for (const ch of lower) {
    if (qIdx < qLower.length && ch === qLower[qIdx]) {
      qIdx += 1;
    }
  }

  return qIdx === qLower.length;
}

export function matchesSearch(text, query, mode = "contains") {
  const original = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return true;

  const normalizedMode = normalizeSearchMode(mode);
  if (normalizedMode === "fuzzy") {
    return fuzzyMatch(original, q);
  }

  return original.toLowerCase().includes(q.toLowerCase());
}

export function highlightMatchedText(text, query, highlightClass = "bg-yellow-200", mode = "contains") {
  const original = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return original;

  const normalizedMode = normalizeSearchMode(mode);
  const lower = original.toLowerCase();
  const qLower = q.toLowerCase();

  if (normalizedMode === "contains") {
    const substrIndex = lower.indexOf(qLower);
    if (substrIndex < 0) return original;
    const before = original.slice(0, substrIndex);
    const match = original.slice(substrIndex, substrIndex + q.length);
    const after = original.slice(substrIndex + q.length);
    return [before, <span key={0} className={highlightClass}>{match}</span>, after];
  }

  const nodes = [];
  let qIdx = 0;
  let currentChunk = "";
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    const chLower = ch.toLowerCase();
    if (qIdx < qLower.length && chLower === qLower[qIdx]) {
      if (currentChunk) {
        nodes.push(currentChunk);
        currentChunk = "";
      }
      nodes.push(
        <span key={i} className={highlightClass}>
          {ch}
        </span>
      );
      qIdx++;
    } else {
      currentChunk += ch;
    }
  }

  if (currentChunk) nodes.push(currentChunk);
  if (qIdx < qLower.length) return original;
  return nodes;
}

export default highlightMatchedText;
