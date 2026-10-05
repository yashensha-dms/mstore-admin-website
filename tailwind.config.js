/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--theme-color, #313D4D)',
          hover: '#26303d',
          light: '#f1f3f5',
        },
      }
    },
  },
  plugins: [],
}
