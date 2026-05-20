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
  tavilyResults?: TavilySearchResult[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Search Tavily for authentic Islamic sources
 */
async function searchTavily(query: string): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey || apiKey === "tvly-YOUR_TAVILY_KEY_HERE") {
    if (process.env.NODE_ENV === 'development') {
      console.log("[Tavily] API key not configured, skipping search");
    }
    return [];
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_domains: [
          "quran.com",
          "islamqa.info",
          "seekersguidance.org",
          "yaqeeninstitute.org",
          "islamweb.net",
          "sunnah.com",
          "islamicstudies.info"
        ],
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.error("[Tavily] Search failed:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    return (data.results || []).map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
    }));
  } catch (error) {
    console.error("[Tavily] Search error:", error);
    return [];
  }
}

interface TadabburContentResult {
  content: string;
  sources?: string;
  tavilyResults?: TavilySearchResult[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function generateTadabburContent(
  verseKey: string,
  verseText: string,
  verseTranslation: string,
  angleType: string
): Promise<TadabburContentResult> {
  if (!openai) {
    throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.");
  }

  // Enhanced prompts with better instructions
  const prompts: Record<string, { prompt: string; tavilyQuery: string }> = {
    revelation: {
      prompt: `Provide a detailed explanation of the Asbab al-Nuzul (circumstances of revelation) for Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

Structure your response as follows:

**Historical Context:**
- When and where was this verse revealed (Makkan or Madinan period)?
- What was the broader situation of the Muslim community at that time?

**Specific Incident:**
- What specific event, question, or situation prompted this revelation?
- Who were the key people involved?
- What was the immediate problem or need being addressed?

**Divine Response:**
- How did this verse address the situation?
- What guidance or ruling did it provide?
- What was the immediate impact on the companions?

**Scholarly Sources:**
- Reference classical tafsir works (Ibn Kathir, Al-Tabari, Al-Qurtubi, Ibn Abbas)
- Cite relevant hadith collections if applicable
- Note any scholarly consensus or differences

Keep it authentic, well-sourced, and accessible (400-500 words).`,
      tavilyQuery: `Asbab al-Nuzul circumstances of revelation Quran ${verseKey} ${verseTranslation.slice(0, 50)}`
    },

    sahabi: {
      prompt: `Tell an authentic, well-documented story of a Companion (Sahabi) of Prophet Muhammad ﷺ who was directly connected to Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

Structure your response:

**The Companion:**
- Full name and brief background
- Their relationship to the Prophet ﷺ
- Their known qualities and contributions

**The Story:**
- The specific incident involving this verse and this companion
- What they said, did, or experienced
- How this verse impacted their life or actions
- The lessons they drew from it

**Historical Authenticity:**
- Source the story from authentic hadith collections (Bukhari, Muslim, Abu Dawud, etc.)
- Reference seerah works (Ibn Hisham, Ibn Kathir's Al-Bidayah wan-Nihayah)
- Note the chain of narration quality if relevant

**Timeless Lessons:**
- What can we learn from this companion's example?
- How does their story illuminate the verse's meaning?

Keep it narrative, engaging, and authentic (400-500 words).`,
      tavilyQuery: `Sahaba companion story Quran ${verseKey} Prophet Muhammad hadith ${verseTranslation.slice(0, 50)}`
    },

    natural: {
      prompt: `Explore the natural world and scientific principles that echo the wisdom of Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

Structure your response:

**Natural Phenomena:**
- What aspects of creation (Ayat in nature) reflect this verse's message?
- Specific examples from the natural world (astronomy, biology, physics, etc.)
- Observable patterns or principles

**Scientific Understanding:**
- Modern scientific knowledge that aligns with the verse's wisdom
- How contemporary science reveals deeper layers of meaning
- Avoid overreach - focus on genuine parallels

**Spiritual Reflection:**
- How does observing nature deepen our understanding of this verse?
- The connection between Quranic Ayat (verses) and cosmic Ayat (signs)
- Practical ways to observe these signs in daily life

**Balance:**
- Maintain intellectual honesty
- Distinguish between clear parallels and speculative connections
- Focus on wonder and reflection, not forced "scientific miracles"

Keep it accessible, wonder-inspiring, and intellectually honest (400-500 words).`,
      tavilyQuery: `Quran ${verseKey} nature science creation signs ${verseTranslation.slice(0, 50)}`
    },

    historical: {
      prompt: `Describe the vivid historical context of 7th century Arabia when Quran verse ${verseKey} was revealed: "${verseText}" (Translation: "${verseTranslation}").

Structure your response:

**Time and Place:**
- Specific period (early Makkan, late Makkan, Madinan - which year?)
- Location (Makkah, Madinah, or during a journey/battle?)
- The broader historical moment

**Social and Political Landscape:**
- What was happening in Arabian society?
- The status of Muslims at that time (persecuted minority, growing community, established state?)
- Key challenges: religious, social, economic, or political

**Immediate Context:**
- Specific events or circumstances surrounding this revelation
- The questions or problems the Muslim community faced
- Interactions with other groups (Quraysh, Jews, Christians, hypocrites, etc.)

**Impact and Application:**
- How this verse addressed those specific challenges
- The immediate effect on the early Muslim community
- Why this historical context matters for understanding the verse today

**Sources:**
- Reference seerah works (Ibn Hisham, Ibn Ishaq, Al-Tabari's History)
- Classical tafsir that discusses historical context
- Authentic hadith collections

Keep it vivid, historically accurate, and relevant (400-500 words).`,
      tavilyQuery: `Quran ${verseKey} 7th century Arabia historical context Makkah Madinah ${verseTranslation.slice(0, 50)}`
    },

    scholar: {
      prompt: `Provide contemporary Islamic scholarly perspectives on Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

Structure your response:

**Modern Context:**
- What contemporary challenges or questions does this verse address?
- How is it relevant to Muslims living in the 21st century?
- Common misconceptions or misapplications

**Scholarly Insights:**
- Perspectives from 2-3 contemporary scholars (e.g., Yasir Qadhi, Nouman Ali Khan, Omar Suleiman, Hamza Yusuf, Ingrid Mattson, etc.)
- How they connect classical wisdom with modern realities
- Fresh insights that bridge tradition and contemporary life

**Practical Applications:**
- Concrete ways to apply this verse today
- Relevance to modern issues (technology, social justice, family life, work, etc.)
- Actionable guidance for daily life

**Balanced Approach:**
- Maintain connection to classical scholarship
- Avoid extremes (neither rigid literalism nor excessive liberalism)
- Respect diversity of valid scholarly opinions

**Sources:**
- Reference contemporary books, lectures, or articles
- Cite specific scholars and their works
- Link to classical sources they build upon

Keep it relevant, practical, and well-sourced (400-500 words).`,
      tavilyQuery: `contemporary Islamic scholars Quran ${verseKey} modern interpretation ${verseTranslation.slice(0, 50)}`
    },

    constellation: {
      prompt: `Create an integrative summary connecting all the angles explored for Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

The reader has completed a 15-day journey exploring:
1. Recitation and listening (Day 1)
2. Multiple translations (Day 2)
3. Word-by-word analysis (Day 3)
4. Circumstances of revelation (Day 4)
5. A Companion's story (Day 5)
6. Classical tafsir (Day 6)
7. Personal reflection (Day 7)
8. Natural world parallels (Day 8)
9. Similar verses (Day 9)
10. Reading as dua in prayer (Day 10)
11. Historical context (Day 11)
12. Contemporary scholarship (Day 12)
13. This constellation view (Day 13)
14. Calligraphic tradition (Day 14)
15. Scholarly interpretations (Day 15)

Structure your response:

**Overarching Themes:**
- What 3-5 major themes emerged across all these angles?
- The "big picture" message of this verse

**Surprising Connections:**
- Unexpected patterns or insights that emerged
- How different angles illuminated each other
- Moments of "aha!" realization

**Holistic Understanding:**
- How linguistic, historical, spiritual, and practical dimensions fit together
- The verse's timeless wisdom across contexts
- Its relevance from 7th century Arabia to today

**Integration:**
- How these 15 angles create a complete picture
- The value of multi-dimensional Quranic study
- Moving from information to transformation

**Personal Takeaway:**
- What should the reader carry forward from this journey?
- How has this verse become a living reality?

Keep it integrative, insightful, and inspiring (500-600 words).`,
      tavilyQuery: `Quran ${verseKey} comprehensive tafsir interpretation themes ${verseTranslation.slice(0, 50)}`
    },

    calligraphy: {
      prompt: `Explore the Islamic calligraphic tradition and artistic heritage related to Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}").

Structure your response:

**Calligraphic Styles:**
- Major Arabic calligraphy styles: Thuluth, Naskh, Diwani, Kufic, Muhaqqaq, Ruq'ah
- Which styles are commonly used for Quranic verses?
- The aesthetic and spiritual qualities of each style

**Historical Tradition:**
- The sacred art of Quranic calligraphy in Islamic civilization
- Famous calligraphers throughout history
- Manuscripts and masterpieces featuring Quranic verses

**Spiritual Significance:**
- Why Muslims have always beautified the Quran's text
- The connection between visual beauty and spiritual meaning
- Calligraphy as a form of worship and meditation

**This Verse:**
- How this specific verse might be rendered in different styles
- Visual elements that could emphasize its meaning
- The interplay between form and content

**Contemporary Practice:**
- Modern calligraphers keeping the tradition alive
- Digital calligraphy and new media
- How visual beauty enhances understanding and memorization

**Reflection:**
- What does the Islamic emphasis on beautiful Quranic writing teach us?
- The role of aesthetics in spiritual practice

Keep it artistic, appreciative, and culturally rich (400-500 words).`,
      tavilyQuery: `Islamic calligraphy Quran ${verseKey} Arabic art manuscript ${verseTranslation.slice(0, 50)}`
    },

    madhab: {
      prompt: `Explain how different Islamic scholarly traditions and schools of thought have interpreted and applied Quran verse ${verseKey}: "${verseText}" (Translation: "${verseTranslation}") in their understanding and practice.

Structure your response:

**Introduction:**
- The diversity of Islamic scholarly traditions
- Different methodological approaches to Quranic interpretation
- The role of this verse in Islamic understanding

**Interpretive Approaches:**
- How different scholars and traditions understand this verse
- Various methodological frameworks used
- The principles guiding interpretation

**Practical Applications:**
- How this verse has been applied in different contexts
- Real-world guidance derived from it
- Contemporary relevance across different communities

**Areas of Consensus:**
- Where scholars generally agree
- Shared principles and conclusions
- Core meanings accepted across traditions

**Respectful Differences:**
- Where scholars differ and why
- The validity of multiple valid interpretations (ikhtilaf)
- How differences enrich Islamic scholarship
- The importance of respecting diverse opinions

**Practical Implications:**
- Real-world issues addressed by this verse
- How Muslims can navigate different opinions
- The importance of following qualified scholarship
- Applying this verse in daily life

**Sources:**
- Reference classical and contemporary scholarly works
- Cite specific interpretations and their evidence
- Note scholarly consensus where it exists

Keep it balanced, educational, and respectful of all valid scholarly traditions (500-600 words).`,
      tavilyQuery: `Quran ${verseKey} Islamic scholarly interpretation fiqh jurisprudence ${verseTranslation.slice(0, 50)}`
    },
  };

  const promptData = prompts[angleType];
  if (!promptData) {
    throw new Error(`Unknown angle type: ${angleType}`);
  }

  try {
    // Search Tavily for authentic sources
    const tavilyResults = await searchTavily(promptData.tavilyQuery);

    // Build context from Tavily results
    let tavilyContext = "";
    if (tavilyResults.length > 0) {
      tavilyContext = "\n\n**Additional Context from Authentic Islamic Sources:**\n";
      tavilyResults.forEach((result, index) => {
        tavilyContext += `\n${index + 1}. ${result.title} (${result.url})\n${result.content.slice(0, 300)}...\n`;
      });
    }

    // Generate content with ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable Islamic scholar providing authentic, well-sourced information about the Quran. 

CRITICAL GUIDELINES:
1. Always cite classical sources (tafsir, hadith collections, seerah works)
2. Maintain academic rigor while being accessible
3. When discussing scientific or historical matters, be accurate and avoid overreach
4. Distinguish between authentic narrations and weak/fabricated ones
5. Present multiple scholarly opinions when they exist
6. Be intellectually honest - acknowledge what we know and what we don't
7. Focus on practical application and spiritual growth
8. Use the provided web sources to enhance accuracy and provide verifiable references

When you reference information from the provided sources, cite them clearly with [Source: Title - URL].

At the end of your response, include a "**Sources:**" section listing all references.`,
        },
        {
          role: "user",
          content: promptData.prompt + tavilyContext,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content || "";
    
    // Extract sources section
    const sourcesMatch = content.match(/\*\*Sources?:?\*\*\s*([\s\S]+)$/i);
    const sources = sourcesMatch ? sourcesMatch[1].trim() : undefined;
    const mainContent = sourcesMatch ? content.replace(/\*\*Sources?:?\*\*\s*[\s\S]+$/i, "").trim() : content;

    return {
      content: mainContent,
      sources,
      tavilyResults: tavilyResults.length > 0 ? tavilyResults : undefined,
    };
  } catch (error) {
    console.error("[ChatGPT] API error:", error);
    throw new Error("Failed to generate content from ChatGPT");
  }
}

export async function isOpenAIConfigured(): Promise<boolean> {
  return Boolean(process.env.OPENAI_API_KEY);
}
