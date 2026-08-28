/**
 * Punctuation merge.
 *
 * The punctuation pass used to *check* that the model preserved the word
 * sequence and throw the span away when it didn't. That cost a whole extra
 * invocation per retry — and an invocation is ~22k tokens of harness overhead
 * against ~450 tokens of actual content, so retries dominated the bill.
 *
 * This does it without retrying. The original words are authoritative: align
 * the model's output against them, then transplant only its punctuation and
 * casing. Words the model changed, dropped, split, or invented are discarded in
 * favour of the original.
 *
 * The invariant therefore holds *by construction* — the output word sequence is
 * built from the original word array, so no model behaviour can violate it.
 */

/** A model output token split into its word and trailing punctuation. */
interface Tok {
  /** The word with surrounding punctuation stripped, casing intact. */
  raw: string;
  norm: string;
  punct: string;
  leadingCap: boolean;
}

function normalize(w: string): string {
  return w.toLowerCase().replace(/['‘’]/g, "").replace(/[^a-z0-9]/g, "");
}

function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const norm = normalize(raw);
    if (!norm) continue;
    // Punctuation that trails the final alphanumeric character.
    const m = raw.match(/[^\p{L}\p{N}'‘’]+$/u);
    const punct = m ? m[0].replace(/[^.,?!;:]/g, "") : "";
    const firstLetter = raw.match(/\p{L}/u);
    out.push({
      raw: raw.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}'‘’]+$/u, ""),
      norm,
      punct,
      leadingCap: firstLetter ? firstLetter[0] === firstLetter[0].toUpperCase() : false,
    });
  }
  return out;
}

/**
 * Longest common subsequence over normalized words, returned as a map from
 * original index to model-token index.
 */
function alignLcs(orig: string[], model: string[]): Map<number, number> {
  const n = orig.length;
  const m = model.length;
  // Row-wise DP; only lengths are needed to backtrack with two rows kept.
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i]!;
    const next = dp[i + 1]!;
    for (let j = m - 1; j >= 0; j--) {
      row[j] = orig[i] === model[j] ? next[j + 1]! + 1 : Math.max(next[j]!, row[j + 1]!);
    }
  }
  const pairs = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (orig[i] === model[j]) {
      pairs.set(i, j);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

function applyCase(word: string, cap: boolean): string {
  if (!word) return word;
  const first = word[0]!;
  return cap ? first.toUpperCase() + word.slice(1) : first.toLowerCase() + word.slice(1);
}

/**
 * Returns the original words carrying the model's punctuation and casing.
 *
 * `originalWords` is authoritative and always survives verbatim; only
 * punctuation and capitalization are taken from `modelText`.
 */
export function mergePunctuation(
  originalWords: string[],
  modelText: string,
): { text: string; matched: number; unmatched: number } {
  const toks = tokenize(modelText);
  const origNorm = originalWords.map(normalize);
  const modelNorm = toks.map((t) => t.norm);
  const pairs = alignLcs(origNorm, modelNorm);

  let matched = 0;
  const out: string[] = [];
  for (let i = 0; i < originalWords.length; i++) {
    const word = originalWords[i]!;
    const j = pairs.get(i);
    if (j === undefined) {
      // The model altered or lost this word. Keep the original, unstyled, and
      // let its neighbours supply the sentence shape.
      out.push(word);
      continue;
    }
    matched++;
    const tok = toks[j]!;
    // Casing is asymmetric on purpose. The model may *add* capitalization —
    // that is how "dns" becomes "DNS" — but it may never strip it from a token
    // that was already an acronym, because the correction pass established
    // those and this pass does not get to undo them.
    const isAcronym = /^[A-Z0-9][A-Z0-9.\-_]+$/.test(word);
    const sameLetters = tok.raw.toLowerCase() === word.toLowerCase();
    const styled = isAcronym
      ? word
      : sameLetters
        ? tok.raw
        : applyCase(word, tok.leadingCap);
    out.push(styled + tok.punct);
  }

  return {
    text: out.join(" "),
    matched,
    unmatched: originalWords.length - matched,
  };
}
