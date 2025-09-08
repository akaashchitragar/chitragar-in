import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the center position for a popup window
 * @param width - Width of the popup in pixels
 * @param height - Height of the popup in pixels (optional, defaults to 400)
 * @returns Object with x and y coordinates for centering the popup
 */
export function getCenterPosition(width: number, height: number = 400) {
  if (typeof window === 'undefined') {
    // Return default position for SSR
    return { x: 200, y: 100 };
  }
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const x = Math.max(0, (viewportWidth - width) / 2);
  const y = Math.max(0, (viewportHeight - height) / 2);
  
  return { x, y };
}
