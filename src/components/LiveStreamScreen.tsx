"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  commentDelay,
  DEFAULT_CLIP_SECONDS,
  makeComment,
  nextViewers,
  nextViewersMidStream,
  type SimComment,
} from "@/lib/liveSim";
import styles from "./LiveStreamScreen.module.css";

const VISIBLE_COMMENTS = 5;
const PINNED_MS = 8000;

const REACTIONS = [
  { emoji: "❤️", left: 30, duration: 3.8, delay: 0 },
  { emoji: "🔥", left: 6, duration: 4.6, delay: 0.6 },
  { emoji: "😂", left: 22, duration: 4.1, delay: 1.3 },
  { emoji: "👍", left: 2, duration: 5, delay: 2 },
  { emoji: "❤️", left: 34, duration: 3.6, delay: 2.7 },
  { emoji: "😍", left: 14, duration: 4.4, delay: 3.4 },
  { emoji: "🔥", left: 26, duration: 4.9, delay: 4.1 },
];

/** A comment that appears at a fixed point of the clip, every time it plays. */
export type ScheduledComment = {
  at: number;
  name: string;
  text: string;
  /** Show as a highlighted banner for a few seconds (e.g. a comment the streamer reads out). */
  pin?: boolean;
};

/** Chat topics tied to what is being said in the clip between `from` and `to` seconds. */
export type TopicPhase = { from: number; to: number; lines: string[] };

export interface StreamConfig {
  /** Viewer count to start from; with `midStream` the count creeps up from here. */
  initialViewers?: number;
  /** Simulates joining a stream that started a while ago (busy chat from the start). */
  midStream?: boolean;
  scheduled?: ScheduledComment[];
  phases?: TopicPhase[];
}

export interface LiveStreamScreenProps {
  accent?: string;
  config?: StreamConfig;
  clipUrl: string | null;
  /** Only the visible slide plays and simulates; the others stay frozen. */
  active: boolean;
  onPickClip: (file: File) => void;
}

export default function LiveStreamScreen({
  accent = "#FF3B30",
  config = {},
  clipUrl,
  active,
  onPickClip,
}: LiveStreamScreenProps) {
  const initialViewers = config.initialViewers ?? 0;
  const midStream = config.midStream ?? false;
  const scheduled = config.scheduled;
  const phases = config.phases;

  const [draft, setDraft] = useState("");
  const [viewers, setViewers] = useState(initialViewers);
  const [trend, setTrend] = useState(0);
  const [comments, setComments] = useState<SimComment[]>([]);
  const [pinned, setPinned] = useState<SimComment | null>(null);
  // Bumping this restarts the simulation (viewer count, comments, clip playback).
  const [session, setSession] = useState(0);
  // Browsers block autoplay-with-sound without a tap (e.g. clip restored on reload).
  const [needsUnmute, setNeedsUnmute] = useState(false);
  // True once the clip has played to its end: everything freezes.
  const [ended, setEnded] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(DEFAULT_CLIP_SECONDS);
  const viewersRef = useRef(initialViewers);
  const commentsRef = useRef<SimComment[]>([]);
  const idRef = useRef(0);
  const usedNamesRef = useRef(new Set<string>());
  const usedTextsRef = useRef(new Set<string>());
  const firedRef = useRef(new Set<number>());
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = active && !ended;

  const clearPin = () => {
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    pinTimerRef.current = null;
    setPinned(null);
  };

  const resetSession = () => {
    setViewers(initialViewers);
    setTrend(0);
    setComments([]);
    clearPin();
    setEnded(false);
    setSession((n) => n + 1);
  };

  // Play with sound while active; fall back to muted playback if the browser refuses.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl) return;
    if (!active) {
      video.pause();
      return;
    }
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
      setNeedsUnmute(true);
    });
  }, [clipUrl, active]);

  useEffect(() => () => {
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
  }, []);

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
    durationRef.current = DEFAULT_CLIP_SECONDS;
    setNeedsUnmute(false);
    onPickClip(file);
  };

  // Viewer count. Fresh stream: ~20 with stalls, then a fast climb to 30k.
  // Mid-stream: starts at `initialViewers` and keeps rising.
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    viewersRef.current = initialViewers;
    let history: number[] = [];
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const next = midStream
        ? nextViewersMidStream(viewersRef.current, t, durationRef.current, initialViewers)
        : nextViewers(viewersRef.current, t, durationRef.current);
      viewersRef.current = next;
      history = [...history.slice(-6), next];
      setViewers(next);
      setTrend(next - history[0]);
      timer = setTimeout(tick, 600 + Math.random() * 700);
    };
    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [session, running, midStream, initialViewers]);

  // Comments: fresh and tweaked lines, faster as the audience grows.
  useEffect(() => {
    if (!running) return;
    commentsRef.current = [];
    idRef.current = 0;
    usedNamesRef.current = new Set(scheduled?.map((c) => c.name));
    usedTextsRef.current = new Set(scheduled?.map((c) => c.text));
    firedRef.current = new Set();
    let timer: ReturnType<typeof setTimeout>;
    const push = () => {
      // Mostly talk about whatever is being said in the clip right now.
      const time = videoRef.current?.currentTime ?? 0;
      const phase = phases?.find((ph) => time >= ph.from && time < ph.to);
      const topicLines = phase && Math.random() < 0.7 ? phase.lines : undefined;
      const next = makeComment(
        idRef.current++,
        viewersRef.current,
        commentsRef.current,
        usedNamesRef.current,
        usedTextsRef.current,
        topicLines,
      );
      commentsRef.current = [...commentsRef.current.slice(-24), next];
      setComments(commentsRef.current.slice(-VISIBLE_COMMENTS));
      timer = setTimeout(push, commentDelay(viewersRef.current));
    };
    timer = setTimeout(push, midStream ? 300 : 1200);
    return () => clearTimeout(timer);
  }, [session, running, midStream, scheduled, phases]);

  // Scheduled comments fire off the video's own clock, so they land at the same
  // moment of the clip on every play.
  const handleTimeUpdate = () => {
    if (!running || !scheduled) return;
    const time = videoRef.current?.currentTime ?? 0;
    scheduled.forEach((item, i) => {
      if (time < item.at || firedRef.current.has(i)) return;
      firedRef.current.add(i);
      const comment: SimComment = { id: idRef.current++, name: item.name, text: item.text };
      commentsRef.current = [...commentsRef.current.slice(-24), comment];
      setComments(commentsRef.current.slice(-VISIBLE_COMMENTS));
      if (!item.pin) return;
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
      setPinned(comment);
      pinTimerRef.current = setTimeout(() => setPinned(null), PINNED_MS);
    });
  };

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
          autoPlay={active}
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
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

      {pinned && (
        <div className={styles.pinned} key={pinned.id}>
          <span className={styles.pinnedLabel}>📌 ความเห็นเด่น</span>
          <span className={styles.cName}>{pinned.name}</span>
          <span className={styles.cText}>{pinned.text}</span>
        </div>
      )}

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
        {running &&
          REACTIONS.map((r, i) => (
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
