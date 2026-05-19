export default function TadabburLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Arabic Calligraphy Icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Ornamental border circle */}
        <circle
          cx="16"
          cy="16"
          r="14.5"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        
        {/* Inner decorative circle */}
        <circle
          cx="16"
          cy="16"
          r="12"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.2"
        />
        
        {/* Stylized Arabic letter "ت" (Ta) - main element */}
        <path
          d="M 10 14 Q 12 12, 16 12 Q 20 12, 22 14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Two dots above (characteristic of ت) */}
        <circle cx="13.5" cy="9.5" r="1.2" fill="currentColor" />
        <circle cx="18.5" cy="9.5" r="1.2" fill="currentColor" />
        
        {/* Stylized "د" (Dal) - flowing curve */}
        <path
          d="M 11 18 Q 13 16, 16 16 Q 19 16, 21 18 Q 22 19, 22 20.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Base flourish - traditional Islamic calligraphy element */}
        <path
          d="M 10 22 Q 16 24, 22 22"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        
        {/* Decorative dots (traditional Islamic manuscript style) */}
        <circle cx="16" cy="20" r="0.8" fill="currentColor" opacity="0.4" />
      </svg>

      {/* Text Logo */}
      <div className="flex flex-col leading-none">
        {/* Arabic text */}
        <span 
          className="font-arabic text-[18px] tracking-wide text-warm"
          style={{ fontWeight: 500 }}
        >
          تدبر
        </span>
        {/* English transliteration */}
        <span 
          className="text-[11px] font-semibold tracking-[0.08em] text-ink-tertiary uppercase"
          style={{ marginTop: '1px' }}
        >
          Tadabbur
        </span>
      </div>
    </div>
  );
}
