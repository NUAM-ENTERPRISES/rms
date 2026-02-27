import React from "react";
import { useTheme } from "@/context/ThemeContext";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded focus:outline-none"
      style={{
        background: theme === "dark" ? "#222" : "#f3f3f3",
        color: theme === "dark" ? "#f3f3f3" : "#222",
        border: "1px solid #ccc",
      }}
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
};
