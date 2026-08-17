"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Puts the `dark` class on <html>, which is what globals.css keys off. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
