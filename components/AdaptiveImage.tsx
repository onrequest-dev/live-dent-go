"use client";

import { getLocalMediaUrl } from "@/client/helpers/upload_image";
import Image, { ImageProps } from "next/image";
import { useState, useEffect, useRef } from "react";

interface AdaptiveImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export default function AdaptiveImage({
  src,
  fallbackSrc = "/placeholder.png",
  ...props
}: AdaptiveImageProps) {
    return (
      <Image src={src || fallbackSrc} {...props} alt={props.alt || "image"} />
    );
}
