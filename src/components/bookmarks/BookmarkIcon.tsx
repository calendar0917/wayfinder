"use client";

import { useState } from "react";
import Image from "next/image";
import { getLetterAvatar } from "@/lib/favicon";

interface BookmarkIconProps {
  src: string;
  name: string;
}

export default function BookmarkIcon({ src, name }: BookmarkIconProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getLetterAvatar(name)}
        alt={name}
        width={20}
        height={20}
        className="w-5 h-5 rounded shrink-0"
      />
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
      onError={() => setErrored(true)}
    />
  );
}
