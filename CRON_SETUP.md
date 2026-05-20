# Tadabbur Circle Auto-Generation Cron Setup

## Overview

The Tadabbur Circle system automatically maintains 4 active/upcoming circles at all times. Each verse can only be used once per Hijri year to prevent duplication.

## Setup Complete ✓

- ✅ Database migration applied
- ✅ CRON_SECRET generated and added to `.env.local`
- ✅ API endpoint secured at `/api/tadabbur/auto-generate`
- ✅ Unique constraint on `(verseKey, hijriYear)` to prevent duplicates
- ✅ Test script available

## Testing Locally

### 1. Start the dev server
```bash
npm run dev
```

### 2. Test the cron endpoint
```bash
npm run cron:test
```

### Expected Response

**When target is met (4 circles exist):**
```json
{
  "success": true,
  "message": "Target of 4 active/upcoming circles already met",
  "activeAndUpcomingCircles": 4
}
```

**When new circles are generated:**
```json
{
  "success": true,
  "message": "Generated 3 new circles (1 were already active/upcoming)",
  "circlesGenerated": 3,
  "previousCount": 1,
  "totalCount": 4,
  "circles": [...]
}
```

## How It Works

1. **Daily Check**: The cron job calls `/api/tadabbur/auto-generate` daily
2. **Circle Count Check**: The endpoint checks active and upcoming circles (within next 30 days)
3. **Generation Logic**: 
   - **Target**: Always maintain 4 active/upcoming circles
   - If fewer than 4 circles exist, generate enough to reach 4
   - New circles are staggered 1 day apart, starting after the latest existing circle ends
   - If 4 or more circles already exist, do nothing
4. **Duplicate Prevention**:
   - Each verse can only be used **once per Hijri year** (unique constraint on `verseKey + hijriYear`)
   - Before creating a circle, checks if the verse has already been used this year
   - If a verse is already used, tries up to 50 times to find an unused verse
   - This prevents the same verse from appearing multiple times in the same year
5. **Circle Properties**:
   - Random verse from curated list (18 meaningful verses)
   - 15-day duration each
   - Staggered start dates for smooth transitions
   - Current Hijri month/year for context

## Production Deployment

### Option 1: Vercel Cron (Recommended)

1. Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/tadabbur/auto-generate",
      "schedule": "0 0 * * *"
    }
  ]
}
```

2. Add `CRON_SECRET` to Vercel environment variables

### Option 2: External Cron Service

Configure with:
- **URL**: `https://your-domain.com/api/tadabbur/auto-generate`
- **Method**: POST
- **Schedule**: Daily at midnight (0 0 * * *)
- **Headers**: 
  ```
  Authorization: Bearer YOUR_CRON_SECRET
  Content-Type: application/json
  ```

## Files

- **API Route**: `src/app/api/tadabbur/auto-generate/route.ts`
- **Helpers**: `src/lib/tadabbur-helpers.ts`
- **Test Script**: `scripts/test-cron.ts`
- **Schema**: `prisma/schema.prisma`
- **Migration**: `prisma/migrations/add_auto_generate_function.sql`

## Schema Constraint

The unique constraint ensures each verse appears only once per year:

```prisma
model TadabburCircle {
  // ... fields
  @@unique([verseKey, hijriYear])
}
```

This prevents duplicate circles for the same verse in the same Hijri year.
