"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider, alpha, createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

type ThemeSettings = {
  mode: ThemeMode;
  primaryColor: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  toggleMode: () => void;
  resetTheme: () => void;
};

const DEFAULT_PRIMARY = "#3f6fd9";
const DEFAULT_MODE: ThemeMode = "light";
const MODE_KEY = "ctrls-theme-mode";
const COLOR_KEY = "ctrls-theme-primary";

const ThemeSettingsContext = createContext<ThemeSettings | null>(null);

function normalizeColor(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return DEFAULT_PRIMARY;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return DEFAULT_MODE;
    const saved = localStorage.getItem(MODE_KEY);
    return saved === "light" || saved === "dark" ? saved : DEFAULT_MODE;
  });
  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_PRIMARY;
    const saved = localStorage.getItem(COLOR_KEY);
    return saved ? normalizeColor(saved) : DEFAULT_PRIMARY;
  });

  const setPrimaryColor = (color: string) => {
    const next = normalizeColor(color);
    setPrimaryColorState(next);
    localStorage.setItem(COLOR_KEY, next);
  };

  const changeMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    localStorage.setItem(MODE_KEY, nextMode);
  };

  const value = useMemo<ThemeSettings>(
    () => ({
      mode,
      primaryColor,
      setMode: changeMode,
      setPrimaryColor,
      toggleMode: () => changeMode(mode === "light" ? "dark" : "light"),
      resetTheme: () => {
        changeMode(DEFAULT_MODE);
        setPrimaryColor(DEFAULT_PRIMARY);
      },
    }),
    [mode, primaryColor]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: primaryColor },
          background: {
            default: mode === "light" ? "#f6f8fc" : "#0d1117",
            paper: mode === "light" ? "#ffffff" : "#121923",
          },
          text: {
            primary: mode === "light" ? "#1f2430" : "#e6edf3",
            secondary: mode === "light" ? "#5b6677" : "#9fb0c4",
          },
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily:
            'Inter, "SF Pro Text", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                borderRadius: 12,
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border: `1px solid ${alpha(mode === "light" ? "#8ca0be" : "#5f738f", 0.2)}`,
                boxShadow:
                  mode === "light"
                    ? "0 16px 40px rgba(31, 41, 55, 0.08)"
                    : "0 16px 40px rgba(2, 6, 23, 0.45)",
              },
            },
          },
        },
      }),
    [mode, primaryColor]
  );

  return (
    <ThemeSettingsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            ":root": {
              "--app-primary": primaryColor,
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within AppThemeProvider");
  }
  return context;
}
