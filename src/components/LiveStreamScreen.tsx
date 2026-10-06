"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import { loadClip, saveClip } from "@/lib/clipStore";
import {
  commentDelay,
  DEFAULT_CLIP_SECONDS,
  makeComment,
  nextViewers,
  type SimComment,
} from "@/lib/liveSim";
import styles from "./LiveStreamScreen.module.css";

const VISIBLE_COMMENTS = 5;

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
}

export default function LiveStreamScreen({ accent = "#FF3B30" }: LiveStreamScreenProps) {
  const [draft, setDraft] = useState("");
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  const [trend, setTrend] = useState(0);
  const [comments, setComments] = useState<SimComment[]>([]);
  // Bumping this restarts the simulation (viewer count, comments, clip playback).
  const [session, setSession] = useState(0);
  // Browsers block autoplay-with-sound without a tap (e.g. clip restored on reload).
  const [needsUnmute, setNeedsUnmute] = useState(false);
  // True once the clip has played to its end: everything freezes.
  const [ended, setEnded] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(DEFAULT_CLIP_SECONDS);
  const viewersRef = useRef(0);
  const commentsRef = useRef<SimComment[]>([]);

  const resetSession = useCallback(() => {
    setViewers(0);
    setTrend(0);
    setComments([]);
    setEnded(false);
    setSession((n) => n + 1);
  }, []);

  const applyClip = useCallback((blob: Blob) => {
    setClipUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    durationRef.current = DEFAULT_CLIP_SECONDS;
    setNeedsUnmute(false);
    resetSession();
  }, [resetSession]);

  // Restore the remembered clip on first load.
  useEffect(() => {
    let cancelled = false;
    loadClip().then((blob) => {
      if (blob && !cancelled) applyClip(blob);
    });
    return () => {
      cancelled = true;
    };
  }, [applyClip]);

  // Play with sound; fall back to muted playback if the browser refuses.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl) return;
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
      setNeedsUnmute(true);
    });
  }, [clipUrl]);

  const unmute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.play().catch(() => {});
    }
    setNeedsUnmute(false);
  };

  const handlePickClip = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    saveClip(file).catch(() => {});
    applyClip(file);
  };

  // Viewer count: ~20 with stalls early, then a fast climb to 30k and beyond.
  useEffect(() => {
    if (ended) return;
    const start = performance.now();
    viewersRef.current = 0;
    let history: number[] = [];
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const next = nextViewers(viewersRef.current, t, durationRef.current);
      viewersRef.current = next;
      history = [...history.slice(-6), next];
      setViewers(next);
      setTrend(next - history[0]);
      timer = setTimeout(tick, 600 + Math.random() * 700);
    };
    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [session, ended]);

  // Comments: mix of fresh and repeated lines, faster as the audience grows.
  useEffect(() => {
    if (ended) return;
    commentsRef.current = [];
    let id = 0;
    let timer: ReturnType<typeof setTimeout>;
    const push = () => {
      const next = makeComment(id++, viewersRef.current, commentsRef.current);
      commentsRef.current = [...commentsRef.current.slice(-24), next];
      setComments(commentsRef.current.slice(-VISIBLE_COMMENTS));
      timer = setTimeout(push, commentDelay(viewersRef.current));
    };
    timer = setTimeout(push, 1200);
    return () => clearTimeout(timer);
  }, [session, ended]);

  const restart = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    resetSession();
  };

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Mock UI only — wire this up to your chat/live API.
    setDraft("");
  };

  const viewerCount = viewers.toLocaleString("en-US");
  const viewerTrend = Math.max(0, trend).toLocaleString("en-US");

  return (
    <div className={styles.phone} style={{ "--accent": accent } as CSSProperties}>
      <div className={styles.videoBg} aria-hidden="true" />
      {clipUrl ? (
        <video
          ref={videoRef}
          key={clipUrl}
          className={styles.video}
          src={clipUrl}
          autoPlay
          playsInline
          onEnded={() => {
            setEnded(true);
            setTrend(0);
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) durationRef.current = d;
          }}
        />
      ) : (
        <div className={styles.videoLabel}>แตะ LIVE เพื่อเพิ่มคลิป</div>
      )}
      {ended && (
        <div className={styles.endedBanner} role="status">
          ถ่ายทอดสดสิ้นสุดแล้ว
        </div>
      )}
      {needsUnmute && !ended && (
        <button type="button" className={styles.unmuteBtn} onClick={unmute}>
          🔇 แตะเพื่อเปิดเสียง
        </button>
      )}
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={handlePickClip} />
      <div className={styles.scrimTop} aria-hidden="true" />
      <div className={styles.scrimBottom} aria-hidden="true" />

      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.viewerPill}
          onClick={restart}
          aria-label={`มีผู้ชม ${viewerCount} คน แตะเพื่อเริ่มใหม่`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className={styles.viewerCount}>{viewerCount}</span>
          {!ended && <span className={styles.viewerTrend}>▲ {viewerTrend}</span>}
        </button>
        <button
          type="button"
          className={`${styles.liveBadge} ${ended ? styles.liveEnded : ""}`}
          onClick={() => fileRef.current?.click()}
          aria-label="แตะเพื่อเลือกคลิปวิดีโอ"
        >
          <span className={styles.liveDot} aria-hidden="true" />
          <span className={styles.liveText}>LIVE</span>
        </button>
      </div>

      <div className={styles.commentsCol} aria-label="ความเห็นผู้ชม">
        <div className={styles.commentsTrack}>
          {comments.map((comment) => (
            <div className={styles.comment} key={comment.id}>
              <div className={styles.cBubble}>
                <span className={styles.cName}>{comment.name}</span>
                <span className={styles.cText}>{comment.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.reactionCol} aria-hidden="true">
        {!ended && REACTIONS.map((r, i) => (
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
