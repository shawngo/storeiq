/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'storeiq-purple': '#667eea',
        'storeiq-pink': '#764ba2',
        'storeiq-gold': '#f6ad55',
        'storeiq-red': '#f56565',
        'storeiq-green': '#48bb78',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}