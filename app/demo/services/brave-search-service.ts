/**
 * Brave Search API Service
 * Handles requests to the Brave Search API for retrieving search results
 */

// API configuration
const BRAVE_SEARCH_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_SUMMARIZER_API_URL = 'https://api.search.brave.com/res/v1/summarizer/search';

// Default request parameters
const DEFAULT_PARAMS = {
  count: 5,  // Number of results to return
  country: 'US',
  language: 'en',
  search_lang: 'en',
  safesearch: 'moderate',
};

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  isNews?: boolean;
  publishedDate?: string;
  source?: string;
}

export interface BraveSearchResponse {
  results: BraveSearchResult[];
  query: string;
  totalResults?: number;
  error?: string;
  summary?: string;  // For summarizer responses
  summarizerKey?: string; // For summarizer key
}

/**
 * Search the web using Brave Search API
 * @param query The search query
 * @param apiKey Brave Search API key
 * @param count Optional number of results to return (default 5)
 * @returns Search results or error
 */
export async function searchWeb(
  query: string, 
  apiKey: string,
  count: number = DEFAULT_PARAMS.count
): Promise<BraveSearchResponse> {
  try {
    console.log(`[BraveSearchService] Searching for: "${query}"`);
    
    // Validate inputs
    if (!query.trim()) {
      console.error('[BraveSearchService] Empty search query');
      return { 
        query, 
        results: [],
        error: 'Empty search query'
      };
    }

    if (!apiKey) {
      console.error('[BraveSearchService] Missing API key');
      return { 
        query, 
        results: [],
        error: 'Missing API key'
      };
    }

    // Prepare search parameters
    const params = new URLSearchParams({
      q: query,
      count: count.toString(),
      country: DEFAULT_PARAMS.country,
      language: DEFAULT_PARAMS.language,
      search_lang: DEFAULT_PARAMS.search_lang,
      safesearch: DEFAULT_PARAMS.safesearch,
      summary: '1', // Enable summary to get the summarizer key in the response
    });

    const requestUrl = `${BRAVE_SEARCH_API_URL}?${params.toString()}`;
    console.log(`[BraveSearchService] Calling Brave Search API at: ${requestUrl}`);
    
    // Make the API request
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      const errorMessage = `Brave Search API error: ${response.status} ${response.statusText}`;
      console.error(`[BraveSearchService] ${errorMessage}`);
      
      // Try to get more detailed error information
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
        console.error(`[BraveSearchService] Error details: ${errorDetails}`);
      } catch (e) {
        // If we can't parse JSON, try to get text
        try {
          errorDetails = await response.text();
          console.error(`[BraveSearchService] Error text: ${errorDetails}`);
        } catch (textError) {
          console.error('[BraveSearchService] Could not extract error details');
        }
      }
      
      return { 
        query, 
        results: [],
        error: `API error: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`
      };
    }

    const data = await response.json();
    console.log(`[BraveSearchService] Received response for query: "${query}"`);
    
    // Extract summarizer key if available
    let summarizerKey = null;
    if (data.summarizer?.key) {
      summarizerKey = data.summarizer.key;
      console.log(`[BraveSearchService] Received summarizer key for query: "${query}"`);
    }
    
    // Extract and format results
    const results: BraveSearchResult[] = (data.web?.results || []).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
    }));

    // Add news results if available
    if (data.news?.results) {
      const newsResults: BraveSearchResult[] = data.news.results.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        description: item.description || '',
        isNews: true,
        publishedDate: item.published_date,
        source: item.source
      }));
      
      // Add news results to the top if they exist
      results.unshift(...newsResults);
      
      // Limit to requested count
      if (results.length > count) {
        results.length = count;
      }
    }

    console.log(`[BraveSearchService] Returning ${results.length} results for query: "${query}"`);
    
    return {
      query,
      results,
      totalResults: data.web?.total_results || 0,
      summarizerKey: summarizerKey
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in search service';
    console.error(`[BraveSearchService] Error: ${errorMessage}`, error);
    return { 
      query, 
      results: [],
      error: errorMessage
    };
  }
}

/**
 * Get a summary of search results using Brave Summarizer API
 * @param query The search query
 * @param apiKey Brave Search API key
 * @param count Optional number of results to include in summary (default 5)
 * @returns Summary of search results or error
 */
export async function getSearchSummary(
  query: string,
  apiKey: string,
  count: number = DEFAULT_PARAMS.count
): Promise<BraveSearchResponse> {
  try {
    console.log(`[BraveSearchService] Getting summary for: "${query}"`);
    
    // First, perform a web search to get the summarizer key
    const webSearchResponse = await searchWeb(query, apiKey, count);
    
    // Check for errors in the web search
    if (webSearchResponse.error) {
      return webSearchResponse;
    }
    
    // Check if we got a summarizer key
    if (!webSearchResponse.summarizerKey) {
      console.log(`[BraveSearchService] No summarizer key available for query: "${query}"`);
      return {
        ...webSearchResponse,
        error: 'No summarization available for this query'
      };
    }
    
    // Encode the key for use in URL
    const encodedKey = encodeURIComponent(webSearchResponse.summarizerKey);
    
    // Prepare summarizer parameters
    const params = new URLSearchParams({
      key: webSearchResponse.summarizerKey,
      entity_info: '1'
    });
    
    const summarizerUrl = `${BRAVE_SUMMARIZER_API_URL}?${params.toString()}`;
    console.log(`[BraveSearchService] Calling Brave Summarizer API with key`);
    
    // Make the API request to the summarizer endpoint
    const response = await fetch(summarizerUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });
    
    if (!response.ok) {
      const errorMessage = `Brave Summarizer API error: ${response.status} ${response.statusText}`;
      console.error(`[BraveSearchService] ${errorMessage}`);
      
      // Return the web search results instead, just without summary
      return webSearchResponse;
    }
    
    const data = await response.json();
    console.log(`[BraveSearchService] Received summarizer response`);
    
    // Extract the summary
    const summary = data.summarizer?.text || null;
    
    // Return both the web search results and the summary
    return {
      ...webSearchResponse,
      summary
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in summarizer service';
    console.error(`[BraveSearchService] Error: ${errorMessage}`, error);
    return { 
      query, 
      results: [],
      error: errorMessage
    };
  }
} 