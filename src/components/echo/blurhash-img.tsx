"use client";

import { useEffect, useRef, useState } from "react";
import { decode } from "blurhash";
import { cn } from "@/lib/utils";

const SIZE = 32;

/** An image that shows its blurhash (https://blurha.sh) until it has loaded. */
export function BlurhashImg({
  src,
  blurhash,
  className,
}: {
  src: string;
  blurhash: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    try {
      const pixels = decode(blurhash, SIZE, SIZE);
      const image = ctx.createImageData(SIZE, SIZE);
      image.data.set(pixels);
      ctx.putImageData(image, 0, 0);
    } catch {
      // Invalid hash: the tile background shows instead
    }
  }, [blurhash]);

  // A cached image can finish loading before hydration attaches onLoad
  useEffect(() => {
    setLoaded(Boolean(imgRef.current?.complete && imgRef.current.naturalWidth));
  }, [src]);

  return (
    <span className={cn("relative block h-full w-full", className)}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          loaded && "opacity-0",
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative h-full w-full object-cover transition-opacity duration-300",
          !loaded && "opacity-0",
        )}
      />
    </span>
  );
}
