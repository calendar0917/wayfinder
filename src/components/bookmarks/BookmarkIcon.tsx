"use client";

import { useState } from "react";

interface BookmarkIconProps {
  icon?: string;
}

const size = 24;

function GlobeIcon() {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="shrink-0 text-text-tertiary"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function BookmarkIcon({ icon }: BookmarkIconProps) {
  const [failed, setFailed] = useState(false);

  if (!icon || failed) {
    return <GlobeIcon />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt=""
      width={size}
      height={size}
      className="rounded shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
