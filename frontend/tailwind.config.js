/** @type {import('tailwindcss').Config} */
module.exports = {
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
