/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#36393f',
          darker: '#2f3136',
          darkest: '#202225',
          blurple: '#5865f2',
          green: '#57f287',
          red: '#ed4245',
          yellow: '#fee75c',
          text: '#dcddde',
          'text-muted': '#72767d',
        }
      }
    },
  },
  plugins: [],
}