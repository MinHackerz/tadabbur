/**
 * Certificate Generator
 * Generates SVG certificates with QR codes for Tadabbur completion
 */

interface CertificateData {
  userName: string;
  verseKey: string;
  verseText: string;
  completedAt: Date;
  certificateId: string;
  verificationUrl: string;
}

/**
 * Generate QR code as SVG
 * Simple implementation without external dependencies
 */
function generateQRCodeSVG(data: string, size: number = 200): string {
  // For production, you'd use a proper QR code library
  // This is a placeholder that creates a simple pattern
  // In production, use: https://www.npmjs.com/package/qrcode or similar
  
  const encoded = encodeURIComponent(data);
  // Using a free QR code API service
  return `<image href="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}" width="${size}" height="${size}"/>`;
}

/**
 * Generate certificate as SVG
 */
export function generateCertificateSVG(data: CertificateData): string {
  const formattedDate = data.completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="1600" fill="#FDFBF7"/>
  
  <!-- Border -->
  <rect x="40" y="40" width="1120" height="1520" fill="none" stroke="#D4AF37" stroke-width="4" rx="20"/>
  <rect x="50" y="50" width="1100" height="1500" fill="none" stroke="#D4AF37" stroke-width="2" rx="15"/>
  
  <!-- Islamic Pattern (decorative) -->
  <circle cx="600" cy="150" r="80" fill="none" stroke="#D4AF37" stroke-width="2" opacity="0.3"/>
  <circle cx="600" cy="150" r="60" fill="none" stroke="#D4AF37" stroke-width="2" opacity="0.3"/>
  
  <!-- Title -->
  <text x="600" y="250" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="#2C3E50" text-anchor="middle">
    Certificate of Completion
  </text>
  
  <!-- Subtitle -->
  <text x="600" y="300" font-family="Georgia, serif" font-size="24" fill="#7F8C8D" text-anchor="middle">
    15-Day Tadabbur Journey
  </text>
  
  <!-- Divider -->
  <line x1="300" y1="340" x2="900" y2="340" stroke="#D4AF37" stroke-width="2"/>
  
  <!-- Main Text -->
  <text x="600" y="420" font-family="Georgia, serif" font-size="20" fill="#34495E" text-anchor="middle">
    This certifies that
  </text>
  
  <!-- User Name -->
  <text x="600" y="480" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#2C3E50" text-anchor="middle">
    ${data.userName}
  </text>
  
  <!-- Achievement Text -->
  <text x="600" y="540" font-family="Georgia, serif" font-size="20" fill="#34495E" text-anchor="middle">
    has successfully completed a comprehensive 15-day deep study of
  </text>
  
  <!-- Verse Reference -->
  <text x="600" y="600" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#D4AF37" text-anchor="middle">
    Quran ${data.verseKey}
  </text>
  
  <!-- Verse Text (truncated if too long) -->
  <text x="600" y="660" font-family="Georgia, serif" font-size="18" font-style="italic" fill="#7F8C8D" text-anchor="middle">
    "${data.verseText.length > 100 ? data.verseText.substring(0, 100) + '...' : data.verseText}"
  </text>
  
  <!-- Journey Description -->
  <text x="150" y="750" font-family="Georgia, serif" font-size="16" fill="#34495E">
    Through this journey, the learner explored:
  </text>
  
  <!-- Columns of achievements -->
  <g font-family="Georgia, serif" font-size="14" fill="#34495E">
    <!-- Column 1 -->
    <text x="150" y="790">✓ Recitation &amp; Deep Listening</text>
    <text x="150" y="820">✓ Multiple Translations</text>
    <text x="150" y="850">✓ Word-by-Word Analysis</text>
    <text x="150" y="880">✓ Circumstances of Revelation</text>
    <text x="150" y="910">✓ Companion Stories</text>
    
    <!-- Column 2 -->
    <text x="450" y="790">✓ Classical Tafsir</text>
    <text x="450" y="820">✓ Personal Reflection</text>
    <text x="450" y="850">✓ Natural World Parallels</text>
    <text x="450" y="880">✓ Similar Verses</text>
    <text x="450" y="910">✓ Personal Supplication</text>
    
    <!-- Column 3 -->
    <text x="750" y="790">✓ Historical Context</text>
    <text x="750" y="820">✓ Contemporary Scholars</text>
    <text x="750" y="850">✓ Holistic Integration</text>
    <text x="750" y="880">✓ Practical Life Application</text>
    <text x="750" y="910">✓ Madhab Applications</text>
  </g>
  
  <!-- Quranic Quote -->
  <text x="600" y="1000" font-family="Georgia, serif" font-size="18" font-style="italic" fill="#D4AF37" text-anchor="middle">
    "Indeed, in the remembrance of Allah do hearts find rest."
  </text>
  <text x="600" y="1030" font-family="Georgia, serif" font-size="14" fill="#7F8C8D" text-anchor="middle">
    — Quran 13:28
  </text>
  
  <!-- Date -->
  <text x="600" y="1120" font-family="Georgia, serif" font-size="18" fill="#34495E" text-anchor="middle">
    Completed on ${formattedDate}
  </text>
  
  <!-- QR Code -->
  <g transform="translate(500, 1180)">
    ${generateQRCodeSVG(data.verificationUrl, 180)}
  </g>
  
  <!-- QR Code Label -->
  <text x="600" y="1400" font-family="Georgia, serif" font-size="14" fill="#7F8C8D" text-anchor="middle">
    Scan to verify certificate
  </text>
  
  <!-- Certificate ID -->
  <text x="600" y="1450" font-family="Courier, monospace" font-size="12" fill="#95A5A6" text-anchor="middle">
    Certificate ID: ${data.certificateId}
  </text>
  
  <!-- Footer -->
  <text x="600" y="1520" font-family="Georgia, serif" font-size="14" fill="#95A5A6" text-anchor="middle">
    Quran Insight App • Tadabbur Program
  </text>
</svg>`;
}

/**
 * Convert SVG to data URL for download
 */
export function svgToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate certificate filename
 */
export function generateCertificateFilename(verseKey: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  const verseStr = verseKey.replace(':', '-');
  return `tadabbur-certificate-${verseStr}-${dateStr}.svg`;
}
