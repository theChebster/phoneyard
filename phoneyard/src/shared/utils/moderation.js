const BANNED_WORDS = ['idiot', 'stupid', 'scammer123', 'fuck', 'shit', 'bitch'];

export function isSpammy(text) {
  const lower = text.toLowerCase();
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  const hasBanned = BANNED_WORDS.some((w) => lower.includes(w));
  const repeated = /(.)\1{7,}/.test(text);
  return {
    blocked: urlCount >= 2 || hasBanned || repeated,
    hasBanned,
    urlCount,
    repeated,
  };
}
