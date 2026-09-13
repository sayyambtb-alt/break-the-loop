import React from "react";

/**
 * A lighter, sparser set than the app's other one — 1.4px strokes on a 24
 * grid, drawn to currentColor. Editorial rather than app-store chunky, to
 * match the type.
 */

interface P extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function S({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
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

export const IPin = (p: P) => (
  <S {...p}>
    <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </S>
);

export const IClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </S>
);

export const IWalk = (p: P) => (
  <S {...p}>
    <circle cx="13" cy="4" r="1.6" />
    <path d="M9.5 21l2-5.5L9 12l.8-4 3.2-1 2.6 3.2 2.4 1.2" />
    <path d="m11.5 15.5-3 2.2" />
    <path d="m13.5 12.6 1.8 3.2.7 5.2" />
  </S>
);

export const ITrain = (p: P) => (
  <S {...p}>
    <rect x="5" y="3" width="14" height="13" rx="3" />
    <path d="M5 10h14" />
    <circle cx="9" cy="13" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="0.8" fill="currentColor" stroke="none" />
    <path d="m8 19-2 2M16 19l2 2" />
  </S>
);

export const IRain = (p: P) => (
  <S {...p}>
    <path d="M7 15.5a4.2 4.2 0 0 1 .6-8.4 5.6 5.6 0 0 1 10.6 1.6A3.6 3.6 0 0 1 17.6 15.5Z" />
    <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
  </S>
);

export const IUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
    <path d="M16.5 5.3a3.4 3.4 0 0 1 0 5.4" />
    <path d="M18 14.4a6.5 6.5 0 0 1 3.5 6.1" />
  </S>
);

export const IBook = (p: P) => (
  <S {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5Z" />
    <path d="M4 17.2A1.5 1.5 0 0 1 5.5 16H19" />
  </S>
);

export const IPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IClose = (p: P) => (
  <S {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </S>
);

export const IBack = (p: P) => (
  <S {...p}>
    <path d="M15 5l-7 7 7 7" />
  </S>
);

export const IArrow = (p: P) => (
  <S {...p}>
    <path d="M5 12h13" />
    <path d="m12.5 6 6 6-6 6" />
  </S>
);

export const ICheck = (p: P) => (
  <S {...p}>
    <path d="m20 6.5-11 11L4 12.5" />
  </S>
);

export const ISun = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </S>
);

export const IMoon = (p: P) => (
  <S {...p}>
    <path d="M20 14.3A8.4 8.4 0 0 1 9.7 4 8.4 8.4 0 1 0 20 14.3Z" />
  </S>
);

export const IRupee = (p: P) => (
  <S {...p}>
    <path d="M7 4h10M7 8.5h10M14.5 4c2.2 0 3.5 1.6 3.5 3.6S16.7 12 13.5 12H7l8 8" />
  </S>
);

export const ICamera = (p: P) => (
  <S {...p}>
    <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.3l1.2-2h7l1.2 2H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    <circle cx="12" cy="13" r="3.4" />
  </S>
);

export const ISend = (p: P) => (
  <S {...p}>
    <path d="M21.5 2.5 10.5 13.5" />
    <path d="M21.5 2.5 14.5 21.5l-4-8-8-4Z" />
  </S>
);

export const IEye = (p: P) => (
  <S {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </S>
);
