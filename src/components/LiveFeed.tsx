"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { loadClip, saveClip } from "@/lib/clipStore";
import LiveStreamScreen, { type StreamConfig } from "./LiveStreamScreen";
import styles from "./LiveFeed.module.css";

// Defined at module level so the config objects stay referentially stable.
const SLOTS: StreamConfig[] = [
  {},
  {
    // A stream that started a while ago: big audience from the first second.
    initialViewers: 21800,
    midStream: true,
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
      {index === 0 && <div className={styles.hint}>⌃ ปัดขึ้นเพื่อดูคลิปถัดไป</div>}
    </div>
  );
}
