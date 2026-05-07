import React, { useState, useEffect, useMemo } from "react";
import {
  Star, MapPin, Plus, Search, Share2, ArrowLeft, Bed, Quote,
  Loader2, Check, AlertCircle, Trash2, BookOpen, LogIn,
} from "lucide-react";
import {
  useAuth, useUser,
  SignedIn, SignedOut, SignInButton, SignUpButton, UserButton,
  ClerkLoaded, ClerkLoading,
} from "@clerk/clerk-react";

const API_URL = "/api/reviews";

// ============ Helpers ============

const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const firmnessLabel = (v) => {
  if (v <= 2.5) return "Pillowy";
  if (v <= 4.5) return "Plush";
  if (v <= 6.5) return "Medium";
  if (v <= 8.5) return "Firm";
  return "Very Firm";
};

const feelLabel = (v) => {
  if (v <= 2.5) return "Scratchy";
  if (v <= 4.5) return "Plain";
  if (v <= 6.5) return "Smooth";
  if (v <= 8.5) return "Soft";
  return "Silky";
};

const loftLabel = (v) => {
  if (v <= 2.5) return "Flat";
  if (v <= 4.5) return "Thin";
  if (v <= 6.5) return "Medium";
  if (v <= 8.5) return "Plush";
  return "Cloud";
};

const palette = {
  bg: "#EDE5D2",
  paper: "#F4EEDD",
  card: "#F8F3E3",
  ink: "#1B1F2A",
  inkSoft: "#4A4E5A",
  accent: "#A53A22",
  accentSoft: "#C66243",
  muted: "#8C7E63",
  border: "#D4CABB",
  borderDeep: "#B5A88A",
};

const fontStack = `'Instrument Serif', 'Cormorant Garamond', Georgia, serif`;
const sansStack = `'DM Sans', 'Söhne', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
const monoStack = `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace`;

// ============ Reusable UI ============

function Stars({ value, max = 5, size = 14, interactive = false, onChange }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="inline-flex gap-[2px]" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = (hover ?? value) >= i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onClick={() => interactive && onChange?.(i + 1)}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              fill={filled ? palette.accent : "transparent"}
              color={filled ? palette.accent : palette.muted}
            />
          </button>
        );
      })}
    </div>
  );
}

function Gauge({ value, max = 10, compact = false }) {
  const pct = Math.max(0, Math.min(100, ((value - 1) / (max - 1)) * 100));
  return (
    <div
      style={{
        position: "relative",
        height: compact ? 4 : 6,
        background: palette.border,
        borderRadius: 999,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${palette.accentSoft}, ${palette.accent})`,
          borderRadius: 999,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${pct}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: compact ? 10 : 14,
          height: compact ? 10 : 14,
          background: palette.ink,
          border: `2px solid ${palette.paper}`,
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

function Slider({ value, min = 1, max = 10, onChange, leftLabel, rightLabel, valueLabel }) {
  return (
    <div>
      <div
        className="flex justify-between items-baseline mb-2"
        style={{
          fontFamily: sansStack,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: palette.muted,
        }}
      >
        <span>{leftLabel}</span>
        {valueLabel && (
          <span style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 16, color: palette.accent, textTransform: "none", letterSpacing: 0 }}>
            {valueLabel}
          </span>
        )}
        <span>{rightLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: palette.accent, height: 6 }}
      />
    </div>
  );
}

// Display one component score in card-aggregate context
function ComponentSummary({ label, rating, secondary }) {
  return (
    <div>
      <div
        style={{
          fontFamily: sansStack,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: palette.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div className="flex items-center gap-1 mb-1">
        <Stars value={rating} size={11} />
        <span style={{ fontFamily: monoStack, fontSize: 10, color: palette.inkSoft, marginLeft: 4 }}>
          {rating.toFixed(1)}
        </span>
      </div>
      <div style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 14, color: palette.ink }}>
        {secondary}
      </div>
    </div>
  );
}

// Display component breakdown in hotel detail
function ComponentDetail({ label, rating, gaugeValue, gaugeLabel, gaugeLeftLabel, gaugeRightLabel, gaugeMax = 10 }) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontFamily: sansStack,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: palette.muted,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div className="flex items-center gap-2 mb-5">
        <Stars value={rating} size={14} />
        <span style={{ fontFamily: monoStack, fontSize: 11, color: palette.inkSoft }}>
          {rating.toFixed(1)}
        </span>
      </div>
      <div
        className="flex justify-between items-baseline mb-2"
        style={{
          fontFamily: sansStack,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: palette.muted,
        }}
      >
        <span>{gaugeLeftLabel}</span>
        <span style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 14, color: palette.ink, textTransform: "none", letterSpacing: 0 }}>
          {gaugeLabel}
        </span>
        <span>{gaugeRightLabel}</span>
      </div>
      <Gauge value={gaugeValue} max={gaugeMax} compact />
    </div>
  );
}

// Form input for one component (rating + slider)
function ComponentInput({
  label,
  rating,
  setRating,
  sliderValue,
  setSliderValue,
  sliderLeft,
  sliderRight,
  sliderValueLabel,
  romanNumeral,
}) {
  return (
    <section className="mb-10">
      <div
        style={{
          fontFamily: monoStack,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: palette.accent,
          marginBottom: 20,
          paddingBottom: 8,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {romanNumeral} · {label.toUpperCase()}
      </div>
      <div className="mb-7">
        <div
          style={{
            fontFamily: sansStack,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.muted,
            marginBottom: 8,
          }}
        >
          {label} rating
        </div>
        <Stars value={rating} size={26} interactive onChange={setRating} />
      </div>
      <Slider
        value={sliderValue}
        min={1}
        max={10}
        onChange={setSliderValue}
        leftLabel={sliderLeft}
        rightLabel={sliderRight}
        valueLabel={sliderValueLabel}
      />
    </section>
  );
}

// ============ Top Nav ============

function TopNav({ onMyBeds, currentView }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `${palette.paper}f5`,
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div
        className="max-w-6xl mx-auto flex items-center justify-between"
        style={{ padding: "12px 24px" }}
      >
        <div
          style={{
            fontFamily: monoStack,
            fontSize: 11,
            letterSpacing: "0.18em",
            color: palette.ink,
          }}
        >
          RATEYOURBED.COM
        </div>

        <div className="flex items-center gap-3">
          <ClerkLoading>
            <Loader2 size={14} className="animate-spin" color={palette.muted} />
          </ClerkLoading>

          <ClerkLoaded>
            <SignedIn>
              <button
                onClick={onMyBeds}
                style={{
                  background: currentView === "myBeds" ? palette.ink : "transparent",
                  color: currentView === "myBeds" ? palette.paper : palette.ink,
                  border: `1px solid ${currentView === "myBeds" ? palette.ink : palette.border}`,
                  padding: "6px 12px",
                  fontFamily: sansStack,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BookOpen size={12} strokeWidth={1.6} />
                My beds
              </button>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }}
              />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button
                  style={{
                    background: "transparent",
                    color: palette.ink,
                    border: `1px solid ${palette.border}`,
                    padding: "6px 14px",
                    fontFamily: sansStack,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  style={{
                    background: palette.ink,
                    color: palette.paper,
                    border: "none",
                    padding: "7px 14px",
                    fontFamily: sansStack,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </div>
  );
}

// ============ Browse + Hotel Card ============

function HotelCard({ hotel, onClick, index }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full transition-all"
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        padding: "24px 26px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = palette.ink;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = palette.border;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          style={{
            fontFamily: monoStack,
            fontSize: 10,
            color: palette.muted,
            letterSpacing: "0.1em",
          }}
        >
          № {String(index + 1).padStart(3, "0")}
        </div>
        <Stars value={hotel.avgOverall} size={12} />
      </div>

      <h3
        style={{
          fontFamily: fontStack,
          fontSize: 26,
          lineHeight: 1.05,
          color: palette.ink,
          marginBottom: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {hotel.name}
      </h3>
      <div
        className="flex items-center gap-1 mb-5"
        style={{ fontFamily: sansStack, fontSize: 12, color: palette.inkSoft }}
      >
        <MapPin size={11} strokeWidth={1.5} />
        {hotel.location}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <ComponentSummary
          label="Mattress"
          rating={hotel.avgMattress}
          secondary={firmnessLabel(hotel.avgFirmness)}
        />
        <ComponentSummary
          label="Sheets"
          rating={hotel.avgSheets}
          secondary={feelLabel(hotel.avgFeel)}
        />
        <ComponentSummary
          label="Pillows"
          rating={hotel.avgPillows}
          secondary={loftLabel(hotel.avgLoft)}
        />
      </div>

      <div
        className="flex items-center justify-between pt-4"
        style={{
          borderTop: `1px solid ${palette.border}`,
          fontFamily: sansStack,
          fontSize: 11,
          color: palette.muted,
          letterSpacing: "0.04em",
        }}
      >
        <span>
          {hotel.reviews.length} {hotel.reviews.length === 1 ? "review" : "reviews"}
        </span>
        <span style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 13, color: palette.ink }}>
          Read reviews →
        </span>
      </div>
    </button>
  );
}

function Browse({ hotels, onSelect, onAdd, search, setSearch, sortBy, setSortBy }) {
  return (
    <div className="max-w-6xl mx-auto" style={{ padding: "0 24px 80px" }}>
      <header style={{ padding: "48px 0 64px", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
            fontFamily: monoStack,
            fontSize: 11,
            letterSpacing: "0.18em",
            color: palette.muted,
            marginBottom: 32,
          }}
        >
          <span>{hotels.length} HOTELS RATED</span>
          <span style={{ width: 24, height: 1, background: palette.borderDeep }} />
          <span>HONEST REVIEWS</span>
        </div>

        <h1
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(56px, 11vw, 144px)",
            lineHeight: 0.9,
            letterSpacing: "-0.035em",
            color: palette.ink,
            margin: 0,
          }}
        >
          Rate Your
          <br />
          <span style={{ fontStyle: "italic", color: palette.accent }}>Bed.</span>
        </h1>

        <p
          style={{
            fontFamily: fontStack,
            fontStyle: "italic",
            fontSize: "clamp(20px, 2.4vw, 28px)",
            color: palette.inkSoft,
            maxWidth: 660,
            margin: "32px auto 0",
            lineHeight: 1.35,
          }}
        >
          Honest reviews of hotel mattresses, sheets, and pillows — because
          bed quality doesn't show up in the star rating.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <SignedIn>
            <button
              onClick={onAdd}
              style={{
                padding: "16px 32px",
                background: palette.ink,
                color: palette.paper,
                border: "none",
                fontFamily: sansStack,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 500,
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Rate a bed
            </button>
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal">
              <button
                style={{
                  padding: "16px 32px",
                  background: palette.ink,
                  color: palette.paper,
                  border: "none",
                  fontFamily: sansStack,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 500,
                }}
              >
                <LogIn size={14} strokeWidth={2} />
                Sign up to rate
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </header>

      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        style={{
          paddingBottom: 16,
          borderBottom: `1px solid ${palette.borderDeep}`,
        }}
      >
        <div
          className="flex items-center gap-3 flex-1"
          style={{
            background: palette.paper,
            border: `1px solid ${palette.border}`,
            padding: "10px 14px",
            maxWidth: 360,
          }}
        >
          <Search size={14} strokeWidth={1.5} color={palette.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hotels or cities…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: sansStack,
              fontSize: 14,
              color: palette.ink,
            }}
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: "rating", label: "Top rated" },
            { key: "reviews", label: "Most reviewed" },
            { key: "name", label: "A–Z" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              style={{
                background: sortBy === opt.key ? palette.ink : "transparent",
                color: sortBy === opt.key ? palette.paper : palette.inkSoft,
                border: `1px solid ${sortBy === opt.key ? palette.ink : palette.border}`,
                padding: "8px 14px",
                fontFamily: sansStack,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hotels.length === 0 ? (
        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            fontFamily: fontStack,
            fontStyle: "italic",
            fontSize: 22,
            color: palette.muted,
          }}
        >
          No hotels match your search. Try fewer words.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((h, i) => (
            <HotelCard
              key={h.key}
              hotel={h}
              index={i}
              onClick={() => onSelect(h)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Hotel Detail ============

function HotelDetail({ hotel, onBack, onShare }) {
  const sortedReviews = [...hotel.reviews].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="max-w-3xl mx-auto" style={{ padding: "32px 24px 80px" }}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-10"
        style={{
          fontFamily: sansStack,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: palette.inkSoft,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to all hotels
      </button>

      <div
        style={{
          fontFamily: monoStack,
          fontSize: 11,
          letterSpacing: "0.1em",
          color: palette.muted,
          marginBottom: 8,
        }}
      >
        {hotel.reviews.length} {hotel.reviews.length === 1 ? "REVIEW" : "REVIEWS"}
      </div>

      <h1
        style={{
          fontFamily: fontStack,
          fontSize: "clamp(48px, 8vw, 88px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: palette.ink,
          marginBottom: 12,
        }}
      >
        {hotel.name}
      </h1>

      <div
        className="flex items-center gap-2 mb-10 flex-wrap"
        style={{ fontFamily: sansStack, fontSize: 14, color: palette.inkSoft }}
      >
        <MapPin size={14} strokeWidth={1.5} />
        {hotel.location}
        <button
          onClick={() => onShare(hotel)}
          className="ml-3 inline-flex items-center gap-1"
          style={{
            background: "none",
            border: `1px solid ${palette.border}`,
            padding: "4px 10px",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: palette.ink,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <Share2 size={11} strokeWidth={1.5} /> Share
        </button>
      </div>

      {/* Overall + components */}
      <div
        style={{
          background: palette.paper,
          border: `1px solid ${palette.border}`,
          padding: "28px 28px 24px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: sansStack,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.muted,
            marginBottom: 10,
          }}
        >
          Overall
        </div>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: fontStack, fontSize: 56, lineHeight: 1, color: palette.ink }}>
            {hotel.avgOverall.toFixed(1)}
          </span>
          <span style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 18, color: palette.muted }}>
            / 5
          </span>
          <div className="ml-2"><Stars value={hotel.avgOverall} size={18} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
        <ComponentDetail
          label="Mattress"
          rating={hotel.avgMattress}
          gaugeValue={hotel.avgFirmness}
          gaugeLabel={firmnessLabel(hotel.avgFirmness)}
          gaugeLeftLabel="Pillowy"
          gaugeRightLabel="Firm"
        />
        <ComponentDetail
          label="Sheets"
          rating={hotel.avgSheets}
          gaugeValue={hotel.avgFeel}
          gaugeLabel={feelLabel(hotel.avgFeel)}
          gaugeLeftLabel="Rough"
          gaugeRightLabel="Silky"
        />
        <ComponentDetail
          label="Pillows"
          rating={hotel.avgPillows}
          gaugeValue={hotel.avgLoft}
          gaugeLabel={loftLabel(hotel.avgLoft)}
          gaugeLeftLabel="Flat"
          gaugeRightLabel="Cloud"
        />
      </div>

      <div
        style={{
          fontFamily: monoStack,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: palette.muted,
          marginBottom: 24,
          textTransform: "uppercase",
        }}
      >
        — The Reviews
      </div>

      <div className="flex flex-col gap-10">
        {sortedReviews.map((r, i) => (
          <article key={r.id}>
            <div
              className="flex items-baseline justify-between mb-4 flex-wrap gap-2"
              style={{ fontFamily: sansStack, fontSize: 12, color: palette.muted }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontFamily: monoStack, fontSize: 10, letterSpacing: "0.1em" }}>
                  REVIEW {String(i + 1).padStart(2, "0")}
                </span>
                <span>{r.reviewerName}</span>
                <span>·</span>
                <span>{r.roomType}</span>
                <span>·</span>
                <span>{r.dateStayed}</span>
              </div>
              <Stars value={r.overall} size={12} />
            </div>

            <div className="flex gap-4 items-start">
              <Quote
                size={28}
                strokeWidth={1}
                style={{ color: palette.accent, flexShrink: 0, marginTop: 6 }}
              />
              <p
                style={{
                  fontFamily: fontStack,
                  fontSize: 22,
                  lineHeight: 1.4,
                  color: palette.ink,
                  letterSpacing: "-0.005em",
                  margin: 0,
                }}
              >
                {r.comment}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <ComponentSummary
                label="Mattress"
                rating={r.mattress.rating}
                secondary={firmnessLabel(r.mattress.firmness)}
              />
              <ComponentSummary
                label="Sheets"
                rating={r.sheets.rating}
                secondary={feelLabel(r.sheets.feel)}
              />
              <ComponentSummary
                label="Pillows"
                rating={r.pillows.rating}
                secondary={loftLabel(r.pillows.loft)}
              />
            </div>

            {i < sortedReviews.length - 1 && (
              <div
                style={{
                  marginTop: 40,
                  borderBottom: `1px solid ${palette.border}`,
                }}
              />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ============ Review Form ============

function ReviewForm({ onSubmit, onCancel, defaultName }) {
  const [hotelName, setHotelName] = useState("");
  const [location, setLocation] = useState("");
  const [roomType, setRoomType] = useState("");
  const [dateStayed, setDateStayed] = useState("");
  const [overall, setOverall] = useState(4);
  const [mattressRating, setMattressRating] = useState(4);
  const [firmness, setFirmness] = useState(5);
  const [sheetsRating, setSheetsRating] = useState(4);
  const [feel, setFeel] = useState(5);
  const [pillowsRating, setPillowsRating] = useState(4);
  const [loft, setLoft] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState(defaultName || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const valid =
    hotelName.trim() && location.trim() && comment.trim() && reviewerName.trim();

  async function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        hotelName: hotelName.trim(),
        location: location.trim(),
        roomType: roomType.trim() || "Standard",
        dateStayed: dateStayed.trim() || "Recent",
        overall,
        mattress: { rating: mattressRating, firmness },
        sheets:   { rating: sheetsRating,   feel },
        pillows:  { rating: pillowsRating,  loft },
        comment: comment.trim(),
        reviewerName: reviewerName.trim(),
      });
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${palette.borderDeep}`,
    padding: "10px 0",
    fontFamily: fontStack,
    fontSize: 22,
    color: palette.ink,
    outline: "none",
  };

  const labelStyle = {
    fontFamily: sansStack,
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: palette.muted,
    display: "block",
    marginBottom: 4,
  };

  return (
    <div className="max-w-2xl mx-auto" style={{ padding: "32px 24px 100px" }}>
      <button
        onClick={onCancel}
        className="flex items-center gap-2 mb-10"
        style={{
          fontFamily: sansStack,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: palette.inkSoft,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Cancel
      </button>

      <div
        style={{
          fontFamily: monoStack,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: palette.muted,
          marginBottom: 8,
        }}
      >
        SUBMIT A RATING
      </div>
      <h1
        style={{
          fontFamily: fontStack,
          fontSize: "clamp(40px, 7vw, 64px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: palette.ink,
          marginBottom: 8,
        }}
      >
        Rate the bed.
      </h1>
      <p
        style={{
          fontFamily: fontStack,
          fontStyle: "italic",
          fontSize: 22,
          color: palette.inkSoft,
          marginBottom: 48,
          lineHeight: 1.3,
        }}
      >
        Mattress, sheets, pillows — the whole sleep situation.
      </p>

      {/* I — Hotel */}
      <section className="mb-10">
        <div
          style={{
            fontFamily: monoStack,
            fontSize: 11,
            letterSpacing: "0.12em",
            color: palette.accent,
            marginBottom: 20,
            paddingBottom: 8,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          I · THE HOTEL
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <label style={labelStyle}>Hotel name</label>
            <input
              style={inputStyle}
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="The Carlyle"
            />
          </div>
          <div>
            <label style={labelStyle}>City, state / country</label>
            <input
              style={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="New York, NY"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Room type</label>
              <input
                style={inputStyle}
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="King"
              />
            </div>
            <div>
              <label style={labelStyle}>When you stayed</label>
              <input
                style={inputStyle}
                value={dateStayed}
                onChange={(e) => setDateStayed(e.target.value)}
                placeholder="Aug 2024"
              />
            </div>
          </div>
        </div>
      </section>

      {/* II — Mattress */}
      <ComponentInput
        romanNumeral="II"
        label="Mattress"
        rating={mattressRating}
        setRating={setMattressRating}
        sliderValue={firmness}
        setSliderValue={setFirmness}
        sliderLeft="Pillowy"
        sliderRight="Very Firm"
        sliderValueLabel={firmnessLabel(firmness)}
      />

      {/* III — Sheets */}
      <ComponentInput
        romanNumeral="III"
        label="Sheets"
        rating={sheetsRating}
        setRating={setSheetsRating}
        sliderValue={feel}
        setSliderValue={setFeel}
        sliderLeft="Scratchy"
        sliderRight="Silky"
        sliderValueLabel={feelLabel(feel)}
      />

      {/* IV — Pillows */}
      <ComponentInput
        romanNumeral="IV"
        label="Pillows"
        rating={pillowsRating}
        setRating={setPillowsRating}
        sliderValue={loft}
        setSliderValue={setLoft}
        sliderLeft="Flat"
        sliderRight="Cloud"
        sliderValueLabel={loftLabel(loft)}
      />

      {/* V — Overall + comment */}
      <section className="mb-12">
        <div
          style={{
            fontFamily: monoStack,
            fontSize: 11,
            letterSpacing: "0.12em",
            color: palette.accent,
            marginBottom: 20,
            paddingBottom: 8,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          V · OVERALL & REVIEW
        </div>

        <div className="mb-8">
          <label style={labelStyle}>Overall rating</label>
          <div className="mt-2">
            <Stars value={overall} size={32} interactive onChange={setOverall} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <label style={labelStyle}>What was it like to sleep on?</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              placeholder="Mattress, sheets, pillows — describe what stood out (good or bad)."
              style={{
                ...inputStyle,
                fontSize: 18,
                lineHeight: 1.5,
                resize: "vertical",
                minHeight: 120,
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>Display name on review</label>
            <input
              style={inputStyle}
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="A.B."
              maxLength={60}
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          className="flex items-center gap-2 mb-4"
          style={{
            background: "#F4D9D2",
            border: `1px solid ${palette.accent}`,
            padding: "12px 16px",
            color: palette.accent,
            fontFamily: sansStack,
            fontSize: 13,
          }}
        >
          <AlertCircle size={14} strokeWidth={1.8} /> {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!valid || submitting}
        style={{
          width: "100%",
          padding: "20px 24px",
          background: valid ? palette.ink : palette.borderDeep,
          color: palette.paper,
          border: "none",
          fontFamily: sansStack,
          fontSize: 13,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: valid && !submitting ? "pointer" : "not-allowed",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitting ? "Posting rating…" : "Submit your rating"}
      </button>

      <p
        style={{
          fontFamily: fontStack,
          fontStyle: "italic",
          fontSize: 13,
          color: palette.muted,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        Your rating will be visible to everyone on the site.
      </p>
    </div>
  );
}

// ============ My Beds ============

function MyBeds({ reviews, onBack, onAdd, onDelete, onSelectHotel }) {
  return (
    <div className="max-w-3xl mx-auto" style={{ padding: "32px 24px 80px" }}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-10"
        style={{
          fontFamily: sansStack,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: palette.inkSoft,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to all hotels
      </button>

      <div
        style={{
          fontFamily: monoStack,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: palette.muted,
          marginBottom: 8,
        }}
      >
        YOUR PROFILE
      </div>
      <h1
        style={{
          fontFamily: fontStack,
          fontSize: "clamp(48px, 8vw, 88px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: palette.ink,
          marginBottom: 8,
        }}
      >
        My beds.
      </h1>
      <p
        style={{
          fontFamily: fontStack,
          fontStyle: "italic",
          fontSize: 22,
          color: palette.inkSoft,
          marginBottom: 48,
          lineHeight: 1.3,
        }}
      >
        {reviews.length === 0
          ? "You haven't rated any beds yet."
          : `${reviews.length} ${reviews.length === 1 ? "bed" : "beds"} rated.`}
      </p>

      {reviews.length === 0 ? (
        <button
          onClick={onAdd}
          style={{
            padding: "16px 32px",
            background: palette.ink,
            color: palette.paper,
            border: "none",
            fontFamily: sansStack,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 500,
          }}
        >
          <Plus size={14} strokeWidth={2} />
          Rate your first bed
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: palette.card,
                border: `1px solid ${palette.border}`,
                padding: "20px 22px",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <button
                    onClick={() => onSelectHotel(r.hotelName, r.location)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: fontStack,
                        fontSize: 28,
                        lineHeight: 1.05,
                        color: palette.ink,
                        marginBottom: 2,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.hotelName}
                    </h3>
                  </button>
                  <div
                    style={{
                      fontFamily: sansStack,
                      fontSize: 12,
                      color: palette.inkSoft,
                    }}
                  >
                    {r.location} · {r.roomType} · {r.dateStayed}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={r.overall} size={13} />
                  <button
                    onClick={() => {
                      if (confirm(`Delete your review of ${r.hotelName}?`)) {
                        onDelete(r.id);
                      }
                    }}
                    title="Delete review"
                    style={{
                      background: "none",
                      border: `1px solid ${palette.border}`,
                      padding: 6,
                      cursor: "pointer",
                      color: palette.muted,
                      display: "inline-flex",
                    }}
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <p
                style={{
                  fontFamily: fontStack,
                  fontSize: 17,
                  lineHeight: 1.4,
                  color: palette.ink,
                  margin: "12px 0 16px",
                }}
              >
                {r.comment}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <ComponentSummary
                  label="Mattress"
                  rating={r.mattress.rating}
                  secondary={firmnessLabel(r.mattress.firmness)}
                />
                <ComponentSummary
                  label="Sheets"
                  rating={r.sheets.rating}
                  secondary={feelLabel(r.sheets.feel)}
                />
                <ComponentSummary
                  label="Pillows"
                  rating={r.pillows.rating}
                  secondary={loftLabel(r.pillows.loft)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ App root ============

export default function App() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState({ name: "browse" });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function loadData() {
    setLoadError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (e) {
      console.error("Failed to load reviews:", e);
      setLoadError("Couldn't load the ratings. Check your connection and refresh.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddReview(review) {
    const token = await getToken();
    if (!token) throw new Error("You're not signed in.");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ review }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Server returned ${res.status}`);
    }
    const data = await res.json();
    setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    setView({ name: "browse" });
    showToast("Rating posted. Thanks for the honesty.");
  }

  async function handleDeleteReview(id) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      showToast("Review deleted.");
    } catch (e) {
      console.error(e);
      showToast("Couldn't delete. Try again.");
    }
  }

  // Aggregate reviews by hotel
  const hotels = useMemo(() => {
    const map = new Map();
    for (const r of reviews) {
      // Skip malformed reviews (e.g., during data migration)
      if (!r.mattress || !r.sheets || !r.pillows) continue;

      const key = `${r.hotelName.trim().toLowerCase()}|${r.location.trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: r.hotelName,
          location: r.location,
          reviews: [],
        });
      }
      map.get(key).reviews.push(r);
    }
    return Array.from(map.values()).map((h) => ({
      ...h,
      avgOverall: avg(h.reviews.map((r) => r.overall)),
      avgMattress: avg(h.reviews.map((r) => r.mattress.rating)),
      avgFirmness: avg(h.reviews.map((r) => r.mattress.firmness)),
      avgSheets: avg(h.reviews.map((r) => r.sheets.rating)),
      avgFeel: avg(h.reviews.map((r) => r.sheets.feel)),
      avgPillows: avg(h.reviews.map((r) => r.pillows.rating)),
      avgLoft: avg(h.reviews.map((r) => r.pillows.loft)),
    }));
  }, [reviews]);

  const filteredHotels = useMemo(() => {
    let out = hotels;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q)
      );
    }
    out = [...out];
    if (sortBy === "rating") out.sort((a, b) => b.avgOverall - a.avgOverall);
    else if (sortBy === "reviews")
      out.sort((a, b) => b.reviews.length - a.reviews.length);
    else if (sortBy === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [hotels, search, sortBy]);

  const selectedHotel = useMemo(() => {
    if (view.name !== "hotel") return null;
    return hotels.find((h) => h.key === view.key) || null;
  }, [view, hotels]);

  const myReviews = useMemo(() => {
    if (!user) return [];
    return reviews
      .filter((r) => r.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reviews, user]);

  async function handleShare(hotel) {
    const text = `${hotel.name} — ${hotel.location}
Overall: ${hotel.avgOverall.toFixed(1)}/5
Mattress: ${hotel.avgMattress.toFixed(1)}★ (${firmnessLabel(hotel.avgFirmness)})
Sheets:   ${hotel.avgSheets.toFixed(1)}★ (${feelLabel(hotel.avgFeel)})
Pillows:  ${hotel.avgPillows.toFixed(1)}★ (${loftLabel(hotel.avgLoft)})
${hotel.reviews.length} ${hotel.reviews.length === 1 ? "review" : "reviews"} on Rate Your Bed
${window.location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: hotel.name, text, url: window.location.href });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
    } catch {
      showToast("Couldn't share — try again");
    }
  }

  // Default name for the form
  const defaultDisplayName = user?.firstName || user?.fullName || user?.username || "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        input::placeholder, textarea::placeholder {
          color: ${palette.borderDeep};
          font-style: italic;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 4px;
          background: ${palette.border};
          border-radius: 999px;
        }
        input[type="range"]::-moz-range-track {
          height: 4px;
          background: ${palette.border};
          border-radius: 999px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          background: ${palette.ink};
          border: 2px solid ${palette.paper};
          border-radius: 50%;
          margin-top: -7px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        input[type="range"]::-moz-range-thumb {
          height: 18px;
          width: 18px;
          background: ${palette.ink};
          border: 2px solid ${palette.paper};
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fadeUp { animation: fadeUp 0.5s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          mixBlendMode: "multiply",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <TopNav
          onMyBeds={() => setView({ name: "myBeds" })}
          currentView={view.name}
        />

        {loading ? (
          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Bed size={32} strokeWidth={1.2} color={palette.muted} />
            <div style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 18, color: palette.muted }}>
              Loading the ratings…
            </div>
          </div>
        ) : loadError ? (
          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
              padding: 24,
              textAlign: "center",
            }}
          >
            <AlertCircle size={28} strokeWidth={1.4} color={palette.accent} />
            <div style={{ fontFamily: fontStack, fontStyle: "italic", fontSize: 22, color: palette.ink, maxWidth: 420 }}>
              {loadError}
            </div>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              style={{
                padding: "10px 20px",
                background: palette.ink,
                color: palette.paper,
                border: "none",
                fontFamily: sansStack,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        ) : view.name === "browse" ? (
          <Browse
            hotels={filteredHotels}
            onSelect={(h) => setView({ name: "hotel", key: h.key })}
            onAdd={() => setView({ name: "add" })}
            search={search}
            setSearch={setSearch}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        ) : view.name === "hotel" && selectedHotel ? (
          <HotelDetail
            hotel={selectedHotel}
            onBack={() => setView({ name: "browse" })}
            onShare={handleShare}
          />
        ) : view.name === "add" && isSignedIn ? (
          <ReviewForm
            onSubmit={handleAddReview}
            onCancel={() => setView({ name: "browse" })}
            defaultName={defaultDisplayName}
          />
        ) : view.name === "myBeds" && isSignedIn ? (
          <MyBeds
            reviews={myReviews}
            onBack={() => setView({ name: "browse" })}
            onAdd={() => setView({ name: "add" })}
            onDelete={handleDeleteReview}
            onSelectHotel={(name, location) => {
              const key = `${name.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
              setView({ name: "hotel", key });
            }}
          />
        ) : (
          <Browse
            hotels={filteredHotels}
            onSelect={(h) => setView({ name: "hotel", key: h.key })}
            onAdd={() => setView({ name: "add" })}
            search={search}
            setSearch={setSearch}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        )}
      </div>

      {toast && (
        <div
          className="fadeUp"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: palette.ink,
            color: palette.paper,
            padding: "12px 20px",
            fontFamily: sansStack,
            fontSize: 13,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          <Check size={14} strokeWidth={2} color={palette.accentSoft} />
          {toast}
        </div>
      )}
    </div>
  );
}
