import type { Config } from 'tailwindcss'
const config: Config = { content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme:{extend:{colors:{ink:'#071b18',mint:'#10b981',gold:'#f59e0b'},fontFamily:{sans:['Inter','Arial','sans-serif'],urdu:['Noto Nastaliq Urdu','serif']},boxShadow:{glow:'0 0 40px rgba(16,185,129,.22)'}}}, plugins:[] }
export default config
