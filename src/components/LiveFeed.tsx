"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { loadClip, saveClip } from "@/lib/clipStore";
import LiveStreamScreen, { type StreamConfig } from "./LiveStreamScreen";
import styles from "./LiveFeed.module.css";

// Defined at module level so the config objects stay referentially stable.
// Clip 1 timeline (seconds), from a rough transcript: he answers accusations (~8-20s),
// denies and gets angry (~20-36s), long pause, says the talk show is pointless (~75-98s),
// then promises to admit fault and asks everyone to wait (~98-122s).
const CLIP1: StreamConfig = {
  scheduled: [
    { at: 12, name: "ปลาทองใจดี", text: "ใครไปพูดอะไรถึงพี่เขาอะ" },
    { at: 17, name: "Kitty_wow", text: "ฟังก่อนๆ เดี๋ยวพลาด" },
    { at: 18, name: "เสือสิงห์99", text: "พิชญะ หลอกลวง เลิกโกหกสักที!", pin: true },
    { at: 24, name: "ลุงต้อมนักเลง", text: "แก้ตัวเก่งนะ ไม่เชื่อหรอก" },
    { at: 28, name: "aom.พิมพ์", text: "ขี้โกหก พูดไปเรื่อย ไม่มีใครเชื่อ!", pin: true },
    { at: 32, name: "ก้านกล้วย", text: "พิชญะโกรธแล้ว!!" },
    { at: 34, name: "Dream_Nine", text: "ใจเย็นๆ พี่ ตอบดีๆ" },
  ],
  phases: [
    { from: 8, to: 20, lines: ["เกิดอะไรขึ้นอะ", "ใครพูดถึงพี่พิชญะ", "พี่พิชญะตอบแล้ว", "ฟังก่อนๆ", "เรื่องที่โดนพูดถึงใช่ไหม", "ตั้งใจฟังนะ", "เงียบๆ ก่อน ขอฟัง"] },
    { from: 20, to: 36, lines: ["ปฏิเสธเลยเหรอ", "เสียงเริ่มสั่นแล้ว", "พิชญะโกรธแล้ว!", "รู้สึกผิดจริงดิ", "ใจเย็นๆ พี่", "แอบสงสาร", "ไม่เชื่อ แถไปเรื่อย", "โกหกหรือเปล่า", "พี่ต้องการอะไรอะ"] },
    { from: 36, to: 75, lines: ["ความจริงคืออะไร", "เงียบไปนานเลย", "ค้างหรือเปล่า", "เน็ตหลุดไหม", "พูดต่อสิ", "ลุ้นจนมือสั่น", "ถ้าเปิดความจริงจะเกิดอะไร", "ยังฟังอยู่นะ"] },
    { from: 75, to: 98, lines: ["ยกเลิกทอล์คโชว์เหรอ!", "ไม่จัดแล้วเหรอ", "อ้าว ไม่จัดแล้ว", "แล้วความจริงล่ะ", "เสียดายอ่ะ", "ทอล์คโชว์ไม่มีแล้ว?!", "ไม่มีประโยชน์ยังไง"] },
    { from: 98, to: 125, lines: ["ยอมรับแล้วเหรอ", "สัญญานะ", "รออยู่นะ", "จะรอดูรายการ", "อย่าหนีนะ", "ขอให้พูดจริง", "ยืนยันแล้วนะ", "รอดูอยู่ๆ"] },
  ],
};

const SLOTS: StreamConfig[] = [
  CLIP1,
  {
    // A stream that started a while ago: big audience from the first second.
    initialViewers: 21800,
    midStream: true,
    // Slow chat so Rose's comment stays on screen for a good while.
    commentPace: 8,
    scheduled: [{ at: 5, name: "โรส", text: "แฟนพี่พิชญะปัจจุบันเป็นยังไงค่ะ?" }],
  },
];

const SWIPE_DISTANCE = 60;

export default function LiveFeed() {
  const [index, setIndex] = useState(0);
  // Bumped each time a slide is swiped into, so it remounts and starts fresh.
  const [visits, setVisits] = useState<number[]>(() => SLOTS.map(() => 0));
  const [clips, setClips] = useState<(string | null)[]>(() => SLOTS.map(() => null));
  const urlsRef = useRef<(string | null)[]>(SLOTS.map(() => null));
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const wheelLockRef = useRef(false);

  const setClip = (slot: number, blob: Blob) => {
    const old = urlsRef.current[slot];
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(blob);
    urlsRef.current[slot] = url;
    setClips((prev) => prev.map((u, i) => (i === slot ? url : u)));
  };

  // Restore remembered clips on first load.
  useEffect(() => {
    let cancelled = false;
    SLOTS.forEach((_, slot) => {
      loadClip(slot).then((blob) => {
        if (blob && !cancelled) setClip(slot, blob);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = (next: number) => {
    if (next < 0 || next >= SLOTS.length || next === index) return;
    setVisits((prev) => prev.map((v, i) => (i === next ? v + 1 : v)));
    setIndex(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Let the comment box be used normally.
    if ((e.target as HTMLElement).closest("input")) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) < SWIPE_DISTANCE || Math.abs(dy) < Math.abs(dx)) return;
    goTo(dy < 0 ? index + 1 : index - 1);
  };

  // Desktop: mouse wheel and arrow keys also switch clips.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowDown") goTo(index + 1);
      if (e.key === "ArrowUp") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (wheelLockRef.current || Math.abs(e.deltaY) < 30) return;
    wheelLockRef.current = true;
    setTimeout(() => (wheelLockRef.current = false), 700);
    goTo(e.deltaY > 0 ? index + 1 : index - 1);
  };

  return (
    <div
      className={styles.feed}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (dragRef.current = null)}
      onWheel={onWheel}
    >
      <div className={styles.track} style={{ transform: `translateY(-${index * 100}%)` }}>
        {SLOTS.map((config, slot) => (
          <div className={styles.slide} key={`${slot}-${visits[slot]}`}>
            <LiveStreamScreen
              config={config}
              clipUrl={clips[slot]}
              active={slot === index}
              onPickClip={(file) => {
                saveClip(slot, file).catch(() => {});
                setClip(slot, file);
              }}
            />
          </div>
        ))}
      </div>
      <div className={styles.dots} aria-hidden="true">
        {SLOTS.map((_, i) => (
          <span key={i} className={`${styles.dot} ${i === index ? styles.dotActive : ""}`} />
        ))}
      </div>
    </div>
  );
}
