"use client";

import { useState, useEffect } from "react";

/**
 * Extracts the dominant color from an image URL
 * Returns a CSS gradient string based on the dominant color
 */
export function useFaviconGradient(imageUrl: string | null | undefined): string {
  const [gradient, setGradient] = useState<string>("");

  useEffect(() => {
    if (!imageUrl) {
      setGradient("");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Scale down for faster processing
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Simple dominant color extraction (average of non-white/non-black pixels)
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const alpha = data[i + 3];

          // Skip transparent, near-white, and near-black pixels
          if (alpha < 128) continue;
          if (red > 240 && green > 240 && blue > 240) continue;
          if (red < 15 && green < 15 && blue < 15) continue;

          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // Create a nice gradient using the dominant color
          // Lighter version at top, color in middle, slightly darker at bottom
          const lighterR = Math.min(255, r + 60);
          const lighterG = Math.min(255, g + 60);
          const lighterB = Math.min(255, b + 60);

          setGradient(
            `linear-gradient(to bottom, rgba(${lighterR}, ${lighterG}, ${lighterB}, 0.4), rgba(${r}, ${g}, ${b}, 0.3), rgba(${r}, ${g}, ${b}, 0.5))`
          );
        }
      } catch (error) {
        console.error("Error extracting favicon color:", error);
      }
    };

    img.onerror = () => {
      console.error("Failed to load favicon for color extraction");
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return gradient;
}

/**
 * Detects if a URL is a favicon URL (either remote or locally stored)
 */
export function isFaviconUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("favicon") || 
         url.includes("google.com/s2/favicons") ||
         url.includes("_favicon");
}
