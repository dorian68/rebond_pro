import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** cn façon shadcn (résout les conflits de classes Tailwind via tailwind-merge).
 *  Dédié au site vitrine — ne pas confondre avec le cn léger de @/lib/utils. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
