"use client";
import { AvatarState, AVATAR_STATES } from "@/lib/constants";

interface AvatarProps {
  state: AvatarState;
}

export default function Avatar({ state }: AvatarProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings for listening state */}
      {state === AVATAR_STATES.LISTEN && (
        <>
          <div className="absolute w-80 h-80 rounded-full border-2 border-orange-300 animate-pulse-ring" />
          <div
            className="absolute w-80 h-80 rounded-full border-2 border-orange-200 animate-pulse-ring"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="absolute w-80 h-80 rounded-full border-2 border-orange-100 animate-pulse-ring"
            style={{ animationDelay: "1s" }}
          />
        </>
      )}

      {/* Rotating dots for thinking state */}
      {state === AVATAR_STATES.THINK && (
        <div className="absolute w-72 h-72 animate-spin-slow">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500" />
          <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-orange-400" />
          <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-orange-300" />
        </div>
      )}

      {/* Avatar SVG */}
      <div
        className={`relative z-10 transition-all duration-700 ${
          state === AVATAR_STATES.IDLE
            ? "animate-breathe animate-float"
            : state === AVATAR_STATES.LISTEN
              ? "scale-105"
              : state === AVATAR_STATES.PRESENT
                ? "-translate-x-4 scale-95"
                : ""
        }`}
      >
        <svg
          width="280"
          height="380"
          viewBox="0 0 280 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background glow */}
          <ellipse
            cx="140"
            cy="340"
            rx="80"
            ry="20"
            fill="#f97316"
            opacity="0.1"
          />

          {/* Body / Shoulders */}
          <path
            d="M60 340 C60 280, 80 260, 140 250 C200 260, 220 280, 220 340"
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="1"
          />

          {/* Shirt collar */}
          <path
            d="M110 260 L140 280 L170 260"
            fill="white"
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Tie */}
          <path
            d="M135 278 L140 320 L145 278 Z"
            fill="url(#tieGradient)"
          />
          <polygon
            points="132,270 148,270 145,278 135,278"
            fill="url(#tieGradient)"
          />

          {/* Neck */}
          <rect
            x="125"
            y="230"
            width="30"
            height="35"
            rx="15"
            fill="#fbbf8c"
          />

          {/* Head */}
          <ellipse cx="140" cy="160" rx="65" ry="78" fill="#fcd6a8" />

          {/* Hair */}
          <path
            d="M75 150 C75 95, 100 70, 140 70 C180 70, 205 95, 205 150 C205 130, 190 100, 140 100 C90 100, 75 130, 75 150"
            fill="#374151"
          />
          <path
            d="M78 160 C75 130, 85 105, 110 95"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes */}
          <ellipse cx="115" cy="165" rx="8" ry="9" fill="white" />
          <ellipse cx="165" cy="165" rx="8" ry="9" fill="white" />
          <ellipse cx="117" cy="167" rx="4" ry="5" fill="#1f2937" />
          <ellipse cx="167" cy="167" rx="4" ry="5" fill="#1f2937" />
          <ellipse cx="118" cy="165" rx="1.5" ry="1.5" fill="white" />
          <ellipse cx="168" cy="165" rx="1.5" ry="1.5" fill="white" />

          {/* Eyebrows */}
          <path
            d="M100 148 C105 144, 120 143, 128 146"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M152 146 C160 143, 175 144, 180 148"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Nose */}
          <path
            d="M137 175 C137 183, 140 188, 143 188 C146 188, 143 183, 143 175"
            stroke="#e8a87c"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Mouth - friendly smile */}
          <path
            d="M120 205 C130 215, 150 215, 160 205"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Ears */}
          <ellipse cx="75" cy="170" rx="8" ry="12" fill="#fcd6a8" />
          <ellipse cx="205" cy="170" rx="8" ry="12" fill="#fcd6a8" />

          {/* Badge / Lapel pin */}
          <circle cx="100" cy="290" r="6" fill="#f97316" />
          <circle cx="100" cy="290" r="3" fill="#fdba74" />

          {/* Presenting arm (visible in present state) */}
          {state === AVATAR_STATES.PRESENT && (
            <path
              d="M220 300 C240 280, 260 260, 270 240"
              stroke="#1f2937"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              className="animate-fade-in"
            />
          )}

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="tieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
