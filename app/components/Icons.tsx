"use client";

import React from "react";

/**
 * One icon system for the whole app.
 *
 * Every piece of UI chrome here used to be an emoji (🔔 🚩 🗺️ 🤝 ✍️ 🎧 …).
 * Emoji are rendered by the OS, so they arrive at a different size, weight,
 * colour and baseline on every device, they can't inherit text colour, and
 * they can't be aligned to anything. That single choice was doing more to make
 * the app look unfinished than any layout or colour problem.
 *
 * These are a matched 1.75px-stroke set on a 24px grid, drawn to `currentColor`
 * so they take the colour of whatever they sit in.
 *
 * Emoji are deliberately KEPT where the emoji is the content rather than the
 * chrome: earned badges (🌱 First Step), the 🔥/✋ feed reactions, and confetti.
 */

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function Svg({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconBellOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    <path d="M18.6 13A17 17 0 0 1 18 8a6 6 0 0 0-9.3-5" />
    <path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14" />
    <path d="m2 2 20 20" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </Svg>
);

export const IconMap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.1 4.2 21 2v16l-6.9 2.2" />
    <path d="M9.9 19.8 3 22V6l6.9-2.2" />
    <line x1="9.9" y1="3.8" x2="9.9" y2="19.8" />
    <line x1="14.1" y1="4.2" x2="14.1" y2="20.2" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.8" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h2.2l1.3-2h7l1.3 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <circle cx="12" cy="13" r="3.6" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <polyline points="21 3 21 9 15 9" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="6 9 12 15 18 9" />
  </Svg>
);

export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
    <path d="M7 6H4.5A2.5 2.5 0 0 0 7 9.5" />
    <path d="M17 6h2.5A2.5 2.5 0 0 1 17 9.5" />
    <path d="M12 14v3" />
    <path d="M8.5 20h7" />
    <path d="M10 17h4v3h-4z" />
  </Svg>
);

export const IconFlame = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4.5-6-5.5-10.5C11 7 9 8 8 10c-1-1-1.3-2-1.3-2C5.6 9.6 5 11.6 5 13.6 5 18 8 22 12 22Z" />
  </Svg>
);

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
);

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-5a8.4 8.4 0 0 1 3.6-11.4 8.9 8.9 0 0 1 8 .2 8.4 8.4 0 0 1 4.5 6.7Z" />
  </Svg>
);

export const IconHeadphones = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 16v-4a9 9 0 0 1 18 0v4" />
    <path d="M21 17a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
    <path d="M3 17a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2Z" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5-2-6.5L3.5 11 10 9Z" />
    <path d="M19 3v3" />
    <path d="M20.5 4.5h-3" />
  </Svg>
);

export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <polygon points="16 8 13.5 13.5 8 16 10.5 10.5" />
  </Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.5" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const IconBan = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" />
  </Svg>
);

export const IconSave = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <polyline points="12 6.5 12 12 15.5 14" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="10.5" width="16" height="11" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <polyline points="3 7 12 13.5 21 7" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7.5" />
    <line x1="21" y1="21" x2="16.4" y2="16.4" />
  </Svg>
);

export const IconWhatsApp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21l1.7-4.9A8.5 8.5 0 1 1 8 20.1Z" />
    <path d="M9 8.3c.2 1 .8 2.2 1.7 3.1.9.9 2 1.5 3 1.7l.9-1.2 2 1-.6 1.5c-1.6.5-3.8-.5-5.4-2.1S8 8.6 8.5 7l1.5-.6 1 2Z" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.5 5.5h13l3.5 6.5v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" />
  </Svg>
);

export const IconCrown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18h18" />
    <path d="M3 7.5 7 11l5-6.5 5 6.5 4-3.5-2 7H5Z" />
  </Svg>
);

export const IconGem = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h12l3 6-9 12L3 9Z" />
    <path d="M3 9h18" />
    <path d="m9.5 9 2.5 12L14.5 9 12 3Z" />
  </Svg>
);
