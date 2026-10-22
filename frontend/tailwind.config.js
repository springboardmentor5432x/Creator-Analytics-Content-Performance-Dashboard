export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Manrope", "system-ui", "sans-serif"], display: ["Bricolage Grotesque", "Manrope", "sans-serif"] },
      colors: {
        ink: { 950: "#0E2A2F", 900: "#143A41", 700: "#2B5961", 500: "#5E8087", 300: "#A9BFC3", 100: "#E3ECEE", 50: "#F3F7F8" },
        signal: { DEFAULT: "#E8A317", dark: "#B97F06", soft: "#FCF1D6" },
        coral: "#D4553E",
        moss: "#2E8B6A",
      },
    },
  },
  plugins: [],
};
