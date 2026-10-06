"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import styles from "./LiveStreamScreen.module.css";

type Comment = {
  id: string;
  name: string;
  text: string;
};

// Mock comment feed — in a real app this would come from a WebSocket / live chat API.
const MOCK_COMMENTS: Comment[] = [
  { id: "c1", name: "เมย์ไทย", text: "มาแล้ว!! 🙌" },
  { id: "c2", name: "ก้องกิ่ง", text: "เพลงนี้เพราะมากกก" },
  { id: "c3", name: "Nara_", text: "สวยจังวันนี้ 😍" },
  { id: "c4", name: "ปูเป้", text: "ถ่ายทอดจากไหนอะ" },
  { id: "c5", name: "บอยบอย", text: "เก่งมากจริงๆ" },
  { id: "c6", name: "น้องฟ้า", text: "อยากดูอีก 🥹" },
];

const REACTIONS = [
  { emoji: "❤️", left: 30, duration: 3.8, delay: 0 },
  { emoji: "🔥", left: 6, duration: 4.6, delay: 0.6 },
  { emoji: "😂", left: 22, duration: 4.1, delay: 1.3 },
  { emoji: "👍", left: 2, duration: 5, delay: 2 },
  { emoji: "❤️", left: 34, duration: 3.6, delay: 2.7 },
  { emoji: "😍", left: 14, duration: 4.4, delay: 3.4 },
  { emoji: "🔥", left: 26, duration: 4.9, delay: 4.1 },
];

export interface LiveStreamScreenProps {
  accent?: string;
  viewerCount?: string;
  viewerTrend?: string;
}

export default function LiveStreamScreen({
  accent = "#FF3B30",
  viewerCount = "2,481",
  viewerTrend = "+18",
}: LiveStreamScreenProps) {
  const [draft, setDraft] = useState("");

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Mock UI only — wire this up to your chat/live API.
    setDraft("");
  };

  // Comment list is duplicated once so the step animation loops seamlessly.
  const tickerComments = [...MOCK_COMMENTS, ...MOCK_COMMENTS];

  return (
    <div className={styles.phone} style={{ "--accent": accent } as CSSProperties}>
      <div className={styles.videoBg} aria-hidden="true" />
      <div className={styles.videoLabel}>LIVE VIDEO FEED</div>
      <div className={styles.scrimTop} aria-hidden="true" />
      <div className={styles.scrimBottom} aria-hidden="true" />

      <div className={styles.topBar}>
        <div className={styles.viewerPill} aria-label={`มีผู้ชม ${viewerCount} คน`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className={styles.viewerCount}>{viewerCount}</span>
          <span className={styles.viewerTrend}>▲ {viewerTrend}</span>
        </div>
        <div className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span className={styles.liveText}>LIVE</span>
        </div>
      </div>

      <div className={styles.commentsCol} aria-label="ความเห็นผู้ชม">
        <div className={styles.commentsTrack}>
          {tickerComments.map((comment, i) => (
            <div className={styles.comment} key={`${comment.id}-${i}`}>
              <div className={styles.cBubble}>
                <span className={styles.cName}>{comment.name}</span>
                <span className={styles.cText}>{comment.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.reactionCol} aria-hidden="true">
        {REACTIONS.map((r, i) => (
          <span
            key={i}
            className={styles.emoji}
            style={{
              left: `${r.left}px`,
              animationDuration: `${r.duration}s`,
              animationDelay: `${r.delay}s`,
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      <form className={styles.inputBar} onSubmit={handleSend}>
        <input
          className={styles.commentInput}
          type="text"
          placeholder="แสดงความคิดเห็น..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="แสดงความคิดเห็น"
        />
        <button type="button" className={styles.likeBtn} aria-label="กดไลก์">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        <button type="submit" className={styles.sendBtn} aria-label="ส่งความเห็น">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
