"use client";

import Image from "next/image";

interface BookmarkIconProps {
  src: string;
  name: string;
}

export default function BookmarkIcon({ src, name }: BookmarkIconProps) {
  if (!src) {
    return (
      <div className="w-5 h-5 rounded flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={20}
      height={20}
      className="w-5 h-5 rounded shrink-0"
      unoptimized
    />
  );
}
