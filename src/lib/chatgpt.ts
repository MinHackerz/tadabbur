import OpenAI from "openai";

let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface TadabburContentResult {
  content: string;
  sources?: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Authoritative Islamic sources, prioritised. Tavily restricts results
 * to this allow-list so the AI can ground its prose in well-reviewed
 * scholarship instead of generic web pages.
 */
const AUTHENTIC_DOMAINS = [
  // Core Quran resources
  "quran.com",
  "tafsir.app",
  "altafsir.com",
  "sunnah.com",
  // Reviewed scholarship
  "yaqeeninstitute.org",
  "seekersguidance.org",
  "bayyinahinstitute.com",
  // Q&A and fiqh
  "islamqa.info",
  "islamweb.net",
  "dar-alifta.org",
  // Academic / encyclopedic
  "islamicstudies.info",
  "oxfordislamicstudies.com",
  // Established institutions
  "alimaanmagazine.com",
  "sunnipath.com",
  "almadinainstitute.org",
];

/**
 * Search Tavily for authentic Islamic sources.
 * Results are used by GPT to ground the response in vetted material.
 */
async function searchTavily(query: string): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || apiKey === "tvly-YOUR_TAVILY_KEY_HERE") {
    if (process.env.NODE_ENV === "development") {
      console.log("[Tavily] API key not configured, skipping search");
    }
    return [];
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_domains: AUTHENTIC_DOMAINS,
        max_results: 6,
      }),
    });

    if (!response.ok) {
      console.error("[Tavily] Search failed:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const raw: TavilySearchResult[] = (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score ?? 0,
    }));

    // Deduplicate by domain — keep the highest-scoring result per host so
    // the citation list never has 3 links pointing to the same site.
    const byDomain = new Map<string, TavilySearchResult>();
    for (const r of raw) {
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, "");
        const existing = byDomain.get(host);
        if (!existing || r.score > existing.score) byDomain.set(host, r);
      } catch {
        /* skip malformed URLs */
      }
    }

    return Array.from(byDomain.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  } catch (error) {
    console.error("[Tavily] Search error:", error);
    return [];
  }
}

/**
 * Strip markdown emphasis that GPT sometimes emits despite system rules.
 * We keep `## Headings` and `- bullets`, drop `**bold**` and `*italic*`.
 */
function sanitiseProse(text: string): string {
  return (
    text
      // **bold** → bold (no asterisks)
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      // __bold__ → bold
      .replace(/__([^_\n]+)__/g, "$1")
      // single *italic* → italic (avoid removing list markers at line start)
      .replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/g, "$1$2")
      // _italic_ → italic
      .replace(/(^|[^_\n])_([^_\n]+)_(?!_)/g, "$1$2")
      // Trim trailing spaces on each line
      .replace(/[ \t]+$/gm, "")
      .trim()
  );
}

/**
 * Build a clean, numbered citations block from Tavily results.
 * Format: `1. Source name — Title (host)` so the UI can render minimal,
 * academic-style references without dumping full URLs in body copy.
 */
function buildSourcesBlock(results: TavilySearchResult[]): string {
  if (!results.length) return "";
  return results
    .map((r, i) => {
      let host = "";
      try {
        host = new URL(r.url).hostname.replace(/^www\./, "");
      } catch {
        host = "source";
      }
      const title = (r.title || host).trim().replace(/\s+/g, " ");
      return `${i + 1}. ${title} | ${host} | ${r.url}`;
    })
    .join("\n");
}

interface PromptSpec {
  prompt: string;
  tavilyQuery: string;
}

export async function generateTadabburContent(
  verseKey: string,
  verseText: string,
  verseTranslation: string,
  angleType: string
): Promise<TadabburContentResult> {
  if (!openai) {
    throw new Error(
      "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables."
    );
  }

  // ── Prompts ────────────────────────────────────────────────────────────
  // All section headers use `## Title` (Markdown H2). NO `**bold**` or
  // `*italic*` anywhere. The rendering layer parses `## ` lines as headings.
  const prompts: Record<string, PromptSpec> = {
    revelation: {
      prompt: `Write a focused explanation of Asbab al-Nuzul (circumstances of revelation) for Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact section headings, each on its own line, prefixed with "## ":

## Historical Context
When and where the verse was revealed (Makkan or Madinan period), and the broader situation of the early Muslim community at the time.

## The Specific Incident
The event, question, or situation that prompted this revelation. Name the people involved and the immediate problem being addressed.

## The Divine Response
How the verse answered the situation, the guidance or ruling it provided, and the immediate effect on the Companions.

## Scholarly Foundation
Reference classical works (Ibn Kathir, Al-Tabari, Al-Qurtubi, narrations from Ibn Abbas) and any relevant hadith. Note scholarly consensus or differences clearly.

Length: 400–500 words. Authentic, well-sourced, accessible.`,
      tavilyQuery: `Asbab al-Nuzul circumstances of revelation Quran ${verseKey} ${verseTranslation.slice(0, 50)}`,
    },

    sahabi: {
      prompt: `Tell an authentic, well-documented story of a Companion (Sahabi) of Prophet Muhammad ﷺ connected to Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## The Companion
Full name, brief background, relationship to the Prophet ﷺ, and known qualities.

## The Story
The specific incident involving this verse and this companion — what they said, did, or experienced, and how the verse impacted their life.

## Authenticity
Source the story from authentic hadith collections (Bukhari, Muslim, Abu Dawud, etc.) or seerah works (Ibn Hisham, Ibn Kathir's Al-Bidayah wan-Nihayah). Note the chain quality if relevant.

## Timeless Lessons
What we can learn from this companion's example and how their story illuminates the verse's meaning today.

Length: 400–500 words. Narrative, engaging, authentic.`,
      tavilyQuery: `Sahaba companion story Quran ${verseKey} Prophet Muhammad hadith ${verseTranslation.slice(0, 50)}`,
    },

    natural: {
      prompt: `Explore the natural world and scientific principles that echo the wisdom of Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## Signs in Creation
Aspects of the natural world (astronomy, biology, physics, ecology) that reflect the verse's message. Specific, observable examples.

## Modern Understanding
Contemporary scientific knowledge that aligns with the verse's wisdom. Stay accurate and avoid overreach.

## Reflection
How observing nature deepens understanding of the verse, and the connection between Quranic ayat and cosmic ayat.

## Honest Balance
Distinguish clear parallels from speculative connections. Focus on wonder and reflection, not forced "scientific miracles".

Length: 400–500 words. Wonder-inspiring and intellectually honest.`,
      tavilyQuery: `Quran ${verseKey} nature science creation signs ${verseTranslation.slice(0, 50)}`,
    },

    historical: {
      prompt: `Describe the vivid 7th-century Arabian context of Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## Time and Place
Specific period (early Makkan, late Makkan, or Madinan, with year if known), location, and the broader historical moment.

## Society and Politics
Arabian social structure, status of the Muslim community, and the religious, social, economic, or political challenges of the moment.

## Immediate Context
Specific events surrounding this revelation, the questions or problems the community faced, and interactions with other groups (Quraysh, Jews, Christians, hypocrites).

## Impact
How this verse addressed those challenges, its effect on the early Muslim community, and why this context matters for understanding the verse today.

## Sources
Reference seerah works (Ibn Hisham, Ibn Ishaq, Al-Tabari's History) and classical tafsir.

Length: 400–500 words. Vivid, accurate, relevant.`,
      tavilyQuery: `Quran ${verseKey} 7th century Arabia historical context Makkah Madinah ${verseTranslation.slice(0, 50)}`,
    },

    scholar: {
      prompt: `Provide contemporary Islamic scholarly perspectives on Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## Modern Relevance
Contemporary challenges and questions this verse addresses, and common misconceptions to clear up.

## Scholarly Insights
Two or three contemporary scholars (e.g., Yasir Qadhi, Nouman Ali Khan, Omar Suleiman, Hamza Yusuf, Ingrid Mattson). How they connect classical wisdom with modern realities.

## Practical Applications
Concrete ways to apply this verse today — technology, social justice, family, work, community.

## Balanced Approach
Stay anchored to classical scholarship; avoid extremes; respect valid scholarly diversity.

## Sources
Cite specific contemporary works or lectures and the classical references they build upon.

Length: 400–500 words. Relevant, practical, well-sourced.`,
      tavilyQuery: `contemporary Islamic scholars Quran ${verseKey} modern interpretation ${verseTranslation.slice(0, 50)}`,
    },

    constellation: {
      prompt: `Create an integrative summary connecting all 15 angles explored across this Tadabbur Circle for Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

The reader has spent 15 days on: recitation, translations, word-by-word, revelation context, a Companion's story, classical tafsir, personal reflection, natural-world parallels, similar verses, dua in prayer, historical context, contemporary scholarship, this constellation view, calligraphic tradition, and scholarly interpretations.

Use these exact headings, each on its own line, prefixed with "## ":

## Overarching Themes
Three to five major themes that emerged across the angles and the verse's "big picture" message.

## Surprising Connections
Unexpected patterns or moments where one angle illuminated another.

## Holistic Understanding
How linguistic, historical, spiritual, and practical dimensions fit together.

## Integration
How these angles create a complete picture and the value of multi-dimensional Quranic study.

## Personal Takeaway
What the reader should carry forward — moving from information to transformation.

Length: 500–600 words. Integrative, insightful, inspiring.`,
      tavilyQuery: `Quran ${verseKey} comprehensive tafsir interpretation themes ${verseTranslation.slice(0, 50)}`,
    },

    calligraphy: {
      prompt: `Explore the Islamic calligraphic tradition tied to Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## Calligraphic Styles
Major Arabic styles for Quranic verses (Thuluth, Naskh, Diwani, Kufic, Muhaqqaq, Ruq'ah). Aesthetic and spiritual qualities of each.

## Historical Tradition
The sacred art of Quranic calligraphy in Islamic civilization. Famous calligraphers and notable manuscripts.

## Spiritual Significance
Why Muslims have always beautified the Quran's text — visual beauty as worship and meditation.

## This Verse
How this specific verse might be rendered in different styles and how visual elements emphasise its meaning.

## Contemporary Practice
Modern calligraphers, digital calligraphy, and how visual beauty enhances understanding and memorisation.

Length: 400–500 words. Artistic, appreciative, culturally rich.`,
      tavilyQuery: `Islamic calligraphy Quran ${verseKey} Arabic art manuscript ${verseTranslation.slice(0, 50)}`,
    },

    practical: {
      prompt: `Provide practical, actionable guidance on applying Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}" in daily life.

Use these exact headings, each on its own line, prefixed with "## ":

## Core Message
The essential teaching or principle, and why it matters for personal and spiritual growth.

## Daily Life Applications
Personal character, relationships (family, friends, community), work or school, and worship — concrete ways to embody the verse in each.

## Real-World Scenarios
Three or four concrete, relatable examples where this guidance is needed in everyday life.

## Mindset Shifts
Internal changes the verse calls for — old patterns to release, new perspectives to adopt.

## Small Steps
Practical action items someone can start today; habits to build or break.

## Reflection Questions
Questions to help the reader internalise the verse and self-examine.

Length: 500–600 words. Practical, relatable, immediately actionable.`,
      tavilyQuery: `Quran ${verseKey} practical application daily life Islamic guidance ${verseTranslation.slice(0, 50)}`,
    },

    madhab: {
      prompt: `Explain how different Islamic scholarly traditions interpret and apply Quran ${verseKey}: "${verseText}" — Translation: "${verseTranslation}".

Use these exact headings, each on its own line, prefixed with "## ":

## Interpretive Traditions
The diversity of Islamic scholarly approaches and methodological frameworks used to read this verse.

## Areas of Consensus
Where scholars generally agree — shared principles and conclusions.

## Respectful Differences
Where scholars differ and why. Treat ikhtilaf with dignity; show how diversity enriches the tradition.

## Practical Implications
Real-world issues addressed by this verse and how Muslims can navigate different opinions responsibly.

## Sources
Cite classical and contemporary scholarly works, with their evidence.

Length: 500–600 words. Balanced, educational, respectful of valid traditions.`,
      tavilyQuery: `Quran ${verseKey} Islamic scholarly interpretation fiqh jurisprudence ${verseTranslation.slice(0, 50)}`,
    },
  };

  const promptData = prompts[angleType];
  if (!promptData) {
    throw new Error(`Unknown angle type: ${angleType}`);
  }

  try {
    // Ground the response in vetted Islamic sources.
    const tavilyResults = await searchTavily(promptData.tavilyQuery);

    // Build a numbered context block; the model is told to cite as [1], [2], …
    let groundingContext = "";
    if (tavilyResults.length > 0) {
      groundingContext = "\n\nReference material from authentic Islamic sources (cite inline as [1], [2], … and synthesize, do not list verbatim):\n";
      tavilyResults.forEach((result, index) => {
        let host = "";
        try {
          host = new URL(result.url).hostname.replace(/^www\./, "");
        } catch {
          host = "";
        }
        const snippet = (result.content || "").replace(/\s+/g, " ").slice(0, 480);
        groundingContext += `\n[${index + 1}] ${result.title} (${host})\n${snippet}\n`;
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an Islamic scholar producing professional, well-grounded reflections on the Quran for a thoughtful general audience.

OUTPUT FORMAT (strict):
- Use "## Heading" on its own line for every section heading. Use exactly the headings the user requests.
- Write in clean, professional prose under each heading. Plain English unless quoting Arabic terms.
- DO NOT use markdown bold (**text**) or italics (*text* or _text_) anywhere. No asterisks for emphasis.
- DO NOT prefix lines with extra symbols. Use simple paragraphs.
- For lists, use "- " bullets only when truly enumerating items.
- Do not output "Reference Material:" or repeat the grounding snippets verbatim. Synthesize them.

CITATIONS:
- When you draw on the provided reference material, cite inline using bracketed numbers like [1] or [2, 3]. Use these numbers only — do not insert URLs or domain names in body text.
- After your final section, add nothing — the application appends the references list automatically.

CONTENT STANDARDS:
- Cite classical sources (tafsir, hadith collections, seerah) where appropriate.
- Distinguish authentic narrations from weak ones.
- Present multiple scholarly opinions when they exist.
- Be intellectually honest; acknowledge what is and isn't known.
- Keep the tone warm, accurate, and accessible.`,
        },
        {
          role: "user",
          content: promptData.prompt + groundingContext,
        },
      ],
      temperature: 0.65,
      max_tokens: 1400,
    });

    let content = response.choices[0].message.content || "";

    // Drop any model-emitted "## Sources" / "Sources:" tail — we render
    // the curated, deduplicated source list ourselves from Tavily.
    content = content
      .replace(/\n+##\s*Sources?\s*[\s\S]*$/i, "")
      .replace(/\n+(?:Sources?|References)\s*[:：]?\s*\n[\s\S]*$/i, "")
      .trim();

    const sanitisedContent = sanitiseProse(content);
    const sourcesBlock = buildSourcesBlock(tavilyResults);

    return {
      content: sanitisedContent,
      sources: sourcesBlock || undefined,
    };
  } catch (error) {
    console.error("[ChatGPT] API error:", error);
    throw new Error("Failed to generate content from ChatGPT");
  }
}

export async function isOpenAIConfigured(): Promise<boolean> {
  return Boolean(process.env.OPENAI_API_KEY);
}
