# Day 14: Calligraphy → Practical Life Application

## Changes Made

### 1. Component Update
**File:** `src/components/tadabbur/days/Day14Calligraphy.tsx`
- Changed `angleType` from `"calligraphy"` to `"practical"`
- Title and description already updated to "Practical Life Application"

### 2. Prompt Update
**File:** `src/lib/chatgpt.ts`
- Added new `practical` prompt with comprehensive guidance structure
- Focuses on actionable, real-world application of Quranic verses
- Includes sections for:
  - Core Message
  - Daily Life Applications (Personal, Relationships, Work, Worship)
  - Real-World Scenarios
  - Mindset Shifts
  - Small Steps
  - Challenges and Solutions
  - Reflection Questions

### 3. Cache Clearing
**File:** `scripts/clear-day14-cache.ts` (NEW)
- Script to clear old cached "calligraphy" content for day 14
- Run with: `npm run tadabbur:clear-day14`

## Why This Change?

The old "calligraphy" angle was artistic and cultural, but Day 14 is better served by practical application guidance. The new "Practical Life Application" angle:

1. **More Actionable:** Provides concrete steps users can take immediately
2. **More Relevant:** Connects Quranic wisdom to daily life situations
3. **More Transformative:** Focuses on internal and external change
4. **More Comprehensive:** Covers personal, relational, professional, and spiritual dimensions

## How It Works

### For New Content
- When users access Day 14, the system will:
  1. Check for cached content with `angleType="practical"`
  2. If not found, generate new content using the practical prompt
  3. Cache the result for future users

### For Existing Cached Content
- Old cached content used `angleType="calligraphy"`
- New content uses `angleType="practical"`
- These are treated as separate cache entries
- Old calligraphy cache will remain unused (can be cleaned up with the script)

## Migration Steps

### Option 1: Automatic (Recommended)
- Do nothing - new angleType means fresh content will be generated
- Old cache entries will naturally expire or can be cleaned manually

### Option 2: Manual Cache Clear
Run the cache clearing script:
```bash
npm run tadabbur:clear-day14
```

This will:
- Delete all cached "calligraphy" content for day 14
- Force regeneration with the new "practical" prompt
- Ensure all users see the updated content

## Testing

1. Navigate to a Tadabbur circle's Day 14
2. Verify the title shows "Practical Life Application"
3. Check that the content focuses on practical guidance, not calligraphy
4. Confirm the content includes actionable steps and real-world scenarios

## Notes

- The component filename `Day14Calligraphy.tsx` remains unchanged (just the internal angleType changed)
- This maintains backward compatibility with imports
- Consider renaming the file to `Day14Practical.tsx` in a future refactor
- The change is backward compatible - no breaking changes to the API or database schema
