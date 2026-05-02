
export function highlightMatchedText(text, query, highlightClass = "bg-yellow-200") {
  const original = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return original;

  const lower = original.toLowerCase();
  const qLower = q.toLowerCase();

  const substrIndex = lower.indexOf(qLower);
  if (substrIndex >= 0) {
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
