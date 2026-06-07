/**
 * Fetch educational content from a public API with caching and fallback.
 */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cachedData = null;
let cacheTimestamp = 0;

const FALLBACK_QUOTES = [
  { quote: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { quote: 'The beautiful thing about learning is that nobody can take it away from you.', author: 'B.B. King' },
  { quote: 'Live as if you were to die tomorrow. Learn as if you were to live forever.', author: 'Mahatma Gandhi' },
];

/**
 * GET /api/dashboard/external — university quotes & educational facts.
 */
const getExternalDashboardData = async (_req, res) => {
  try {
    const now = Date.now();

    if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: { ...cachedData, cached: true },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let quotes = [];
    let fact = null;

    try {
      const quotesRes = await fetch('https://api.quotable.io/quotes?tags=education,wisdom&limit=3', {
        signal: controller.signal,
      });

      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        quotes = (quotesData.results || []).map((q) => ({
          quote: q.content,
          author: q.author,
        }));
      }
    } catch {
      quotes = FALLBACK_QUOTES;
    }

    try {
      const factRes = await fetch('https://uselessfacts.jsph.pl/random.json?language=en', {
        signal: controller.signal,
      });

      if (factRes.ok) {
        const factData = await factRes.json();
        fact = factData.text;
      }
    } catch {
      fact = 'The MIU Portal registration system helps students manage up to 5 courses per semester.';
    }

    clearTimeout(timeout);

    if (quotes.length === 0) {
      quotes = FALLBACK_QUOTES;
    }

    const payload = {
      quotes,
      fact,
      source: 'quotable.io + uselessfacts.jsph.pl',
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    cachedData = payload;
    cacheTimestamp = now;

    res.json({
      success: true,
      data: payload,
    });
  } catch {
    res.json({
      success: true,
      data: {
        quotes: FALLBACK_QUOTES,
        fact: 'Stay curious and keep learning!',
        source: 'fallback',
        fetchedAt: new Date().toISOString(),
        cached: false,
      },
    });
  }
};

module.exports = { getExternalDashboardData };
