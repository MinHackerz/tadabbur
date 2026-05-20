/**
 * Test script for Hijri date calculation
 * Run with: npx tsx scripts/test-hijri-date.ts
 */

import { getCurrentHijriDate } from '../src/lib/tadabbur-helpers';

console.log('🗓️  Testing Hijri Date Calculation...\n');

const today = new Date();
console.log(`Gregorian Date: ${today.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}\n`);

const hijriDate = getCurrentHijriDate();
console.log(`Hijri Date: ${hijriDate.month} ${hijriDate.year}\n`);

// Also test with Intl.DateTimeFormat directly for verification
const hijriFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

console.log(`Verification (Intl.DateTimeFormat): ${hijriFormatter.format(today)}\n`);

console.log('✅ Hijri date test complete!');
