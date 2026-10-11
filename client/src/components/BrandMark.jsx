import { useId } from 'react';

// The GramSetu mark: a bridge arch (the portal's whole job is spanning the
// gap between a household and the schemes meant for it) anchored on two
// piers, in the app's own navy/saffron/green palette. No background square
// here — every place this is used already sits on a navy ground; the
// standalone app-icon/favicon version (with its own backdrop) lives at
// client/public/favicon.svg.
export default function BrandMark({ size = 32 }) {
  const uid = useId();
  const archId = `${uid}-arch`;
  const pierId = `${uid}-pier`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="GramSetu">
      <defs>
        <linearGradient id={archId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffb65c" />
          <stop offset="100%" stopColor="#ff9933" />
        </linearGradient>
        <linearGradient id={pierId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1fa652" />
          <stop offset="100%" stopColor="#0f6e33" />
        </linearGradient>
      </defs>
      <path
        d="M38,130 A 62,76 0 0 1 162,130"
        stroke={`url(#${archId})`}
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="22" y="120" width="32" height="24" rx="9" fill={`url(#${pierId})`} />
      <rect x="146" y="120" width="32" height="24" rx="9" fill={`url(#${pierId})`} />
    </svg>
  );
}
