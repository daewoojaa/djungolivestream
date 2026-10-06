// Simulated viewer count + comment generator for the clip
// ("พิชญะไลฟ์สดประกาศทอล์คโชว์เปิดเผยความจริงทั้งหมด").

export const DEFAULT_CLIP_SECONDS = 120;
const PHASE1_END = 0.2; // first 20% of the clip: 0 → 20 viewers, slowly
const PHASE2_END = 0.8; // then a fast climb to 30k
const TARGET = 30000;

/** Viewer count the simulation is heading toward at time t (seconds). */
export function viewerTarget(t: number, duration: number): number {
  const p1 = duration * PHASE1_END;
  const p2 = duration * PHASE2_END;
  if (t < p1) return 3 + 17 * (t / p1);
  if (t < p2) return 20 + (TARGET - 20) * Math.pow((t - p1) / (p2 - p1), 1.7);
  const q = Math.min((t - p2) / (duration - p2), 1);
  return TARGET * (1 + 0.3 * q) + Math.max(0, t - duration) * 40;
}

/** One step of the viewer counter: stalls and small steps early, surges later. */
export function nextViewers(current: number, t: number, duration: number): number {
  const target = viewerTarget(t, duration);
  if (t < duration * PHASE1_END) {
    if (Math.random() < 0.45) return current; // stall
    return Math.min(Math.ceil(target), current + 1 + (Math.random() < 0.25 ? 1 : 0));
  }
  if (Math.random() < 0.08) return current; // occasional pause
  const gap = Math.max(0, target - current);
  const step = Math.ceil(gap * (0.25 + Math.random() * 0.4));
  return current + step;
}

const NAME_BASES = [
  "เมย์", "ก้อง", "Nara", "ปูเป้", "บอย", "น้องฟ้า", "mint", "โอ๊ต", "แพรวา", "Fah",
  "ต้นกล้า", "นุ่น", "Pop", "จอห์น", "ข้าวปั้น", "ลูกพีช", "ธีร์", "มะปราง", "Bank", "แอนนี่",
  "เจ๊ติ๋ม", "พี่หมี", "ฟรีเดอม", "ส้มโอ", "ไอซ์", "มิว", "ปันปัน", "Ploy", "เก่ง", "ทิพย์",
  "Zen", "นัท", "แบม", "เบลล์", "ตั้ม", "กุ๊กไก่", "Max", "ออมสิน", "เจเจ", "หมูหยอง",
];
const NAME_TAILS = ["", "_", ".", "99", "_22", "xo", "ไทย", "จัง", "555", "_official", "07", "คนเดิม", "ii", "_th", "88"];

/** A display name never used before in this session. */
function uniqueName(used: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const name = pick(NAME_BASES) + pick(NAME_TAILS) + (i > 40 ? Math.floor(Math.random() * 9999) : "");
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `user${used.size + 1}`;
  used.add(fallback);
  return fallback;
}

const EARLY = [
  "มาแล้ว!", "ไลฟ์อะไรอะ", "ใครมาก่อนบ้าง", "พิชญะไลฟ์จริงดิ", "เข้ามาดูๆ", "ทอล์คโชว์?",
  "เรื่องอะไรเนี่ย", "มาตามที่เห็นในทวิต", "ขอที่ว่างหน่อย 🙋", "ใครแชร์มา",
];
const MID = [
  "ความจริงอะไรกันแน่", "รอฟังอยู่นะ", "เปิดเผยหมดเลยใช่ไหม", "ลุ้นมาก 😮", "พูดมาเลยพี่",
  "ทอล์คโชว์จัดที่ไหน", "อย่าให้ผิดหวังนะ", "ใจเต้นแรง", "ความจริงทั้งหมดเลยนะ!",
  "ชาวเน็ตมากันเยอะ", "ติดตามอยู่ 👀", "จะพูดเรื่องนั้นไหม", "ขอบอกว่าอยากรู้มาก",
  "พิชญะมีอะไรจะบอก", "ใครรู้บ้างเรื่องอะไร", "รีบพูดเลย รอไม่ไหวแล้ว",
];
const LATE = [
  "คนดูเยอะมาก!!", "ทุกคนมาดูไลฟ์นี้", "เทรนด์ติดอันดับ 1 แล้ว", "ตั๋วทอล์คโชว์ขายที่ไหน",
  "ไม่พลาดแน่นอน 🔥", "เน็ตแตกแน่ๆ", "แชร์ให้เพื่อนแล้ว", "ความจริงจะเป็นยังไงนะ",
  "ขอดูทอล์คโชว์ด้วย!", "คอมเมนต์ไวมาก อ่านไม่ทัน", "พิชญะสู้ๆ 💪", "ตื่นเต้นสุดๆ",
  "รอวันทอล์คโชว์เลย", "เอาจริงแล้วสินะ", "ไลฟ์นี้ต้องจารึก",
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export type SimComment = { id: number; name: string; text: string };

// Small edits so a line can be "typed similarly" without being identical.
const TWEAKS: ((t: string) => string)[] = [
  (t) => t + " 555",
  (t) => t + "เลย",
  (t) => t + "!!",
  (t) => t + " 😮",
  (t) => t + " 🔥",
  (t) => t + " 🥹",
  (t) => t + "ๆ",
  (t) => "จริงดิ " + t,
  (t) => "โอ้โห " + t,
  (t) => "เฮ้ย " + t,
  (t) => t.replace(/!+$/, "") + "???",
  (t) => t.replace(/ /, "  "),
  (t) => t + " 🙏",
  (t) => t + " 😂",
];

/**
 * Builds a comment. Names are unique for the whole session; text is never an
 * exact repeat — about 35% of lines are a tweaked copy of an earlier one.
 */
export function makeComment(
  id: number,
  viewers: number,
  recent: SimComment[],
  usedNames: Set<string>,
  usedTexts: Set<string>,
): SimComment {
  const name = uniqueName(usedNames);
  const pool = viewers < 40 ? EARLY : viewers < 8000 ? [...EARLY.slice(0, 3), ...MID] : [...MID, ...LATE];
  let text = recent.length > 4 && Math.random() < 0.35 ? pick(recent).text : pick(pool);
  for (let i = 0; i < 8 && usedTexts.has(text); i++) {
    // Tweak the original text, not an already-tweaked one, to keep it readable.
    text = pick(TWEAKS)(i === 0 ? text : pick(pool));
  }
  if (usedTexts.has(text)) text += " " + pick(["😮", "🔥", "🙏", "👀", "😂"]) + Math.floor(Math.random() * 99);
  usedTexts.add(text);
  return { id, name, text };
}

/** Milliseconds until the next comment — faster as the audience grows. */
export function commentDelay(viewers: number): number {
  const base = viewers < 40 ? 2400 : viewers < 1000 ? 1500 : viewers < 10000 ? 900 : 550;
  return base * (0.5 + Math.random());
}
