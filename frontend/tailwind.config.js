/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy': '#001f3f',
        'navy-dark': '#000d1a',
        'success': '#28a745',
        'danger': '#dc3545',
      }
    },
  },
  plugins: [],
}
