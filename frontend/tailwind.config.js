/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // Active le dark mode basé sur la classe
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './styles/**/*.css'
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#065f46',
                },
            },
        },
    },
    plugins: [],
};
