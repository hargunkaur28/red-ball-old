import { motion } from 'framer-motion';

const tickerItems = [
  'HEART', 'RESPECT', 'TEAMWORK', 'DISCIPLINE',
  'INTEGRITY', 'PASSION', 'SPIRIT', 'EXCELLENCE',
];

// Cricket ball SVG as separator
const BallSeparator = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" className="mx-4 shrink-0 opacity-80">
    <circle cx="9" cy="9" r="7" fill="none" stroke="white" strokeWidth="1.5" />
    <path d="M6 3.5c1.5 3.5 1.5 7.5 0 11M12 3.5c-1.5 3.5-1.5 7.5 0 11" stroke="white" strokeWidth="0.8" fill="none" />
  </svg>
);



export default function ValuesMarquee() {
  return (
    <section className="bg-[#0D0D0D]">
      {/* Part A — Infinite Horizontal Ticker */}
      <div className="bg-[#C8102E] py-4 overflow-hidden">
        <div className="ticker-track">
          {/* Render content twice for seamless loop */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center shrink-0">
              {tickerItems.map((item, i) => (
                <div key={`${copy}-${i}`} className="flex items-center">
                  <span
                    className="text-white text-[28px] tracking-[4px] whitespace-nowrap"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {item}
                  </span>
                  <BallSeparator />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>


    </section>
  );
}
