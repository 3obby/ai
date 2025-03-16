import { NextRequest, NextResponse } from "next/server";
import { searchWeb, getSearchSummary } from "@/app/demo/services/brave-search-service";
import { BRAVE_WEB_SEARCH_TOOL, BRAVE_SUMMARIZER_TOOL } from "@/app/demo/types/tools";

// Default environment variable for the Brave Search API key
const DEFAULT_BRAVE_API_KEY = process.env.BRAVE_BASE_AI;

export async function POST(request: NextRequest) {
  try {
    // Extract search parameters from the request body
    const { query, count, apiKey, tool, summarize } = await request.json();

    console.log(`Brave Search API route called with query: "${query}"`);
    console.log(`Requested tool: ${tool || 'default (web search)'}`);
    
    // Check if query is provided
    if (!query || typeof query !== 'string') {
      console.error("Missing or invalid search query");
      return NextResponse.json(
        { error: "Missing or invalid search query" },
        { status: 400 }
      );
    }

    // Use provided API key or fall back to the environment variable
    // This allows for both environment-level configuration and runtime overrides
    const searchApiKey = apiKey || DEFAULT_BRAVE_API_KEY;
    
    console.log(`Brave Search API key available: ${!!searchApiKey}`);
    
    if (!searchApiKey) {
      console.error("Brave Search API key not configured");
      return NextResponse.json(
        { error: "Search API key not configured" },
        { status: 500 }
      );
    }
    
    // Determine which search method to use based on the requested tool
    console.log(`Performing search with query: "${query}", count: ${count || 5}`);
    
    let searchResults;
    
    // Check if we should use the summarizer
    if (tool === BRAVE_SUMMARIZER_TOOL.id || summarize === true) {
      console.log(`Using summarizer for query: "${query}"`);
      searchResults = await getSearchSummary(
        query,
        searchApiKey,
        count || 5
      );
    } else {
      // Default to web search
      console.log(`Using web search for query: "${query}"`);
      searchResults = await searchWeb(
        query,
        searchApiKey,
        count || 5
      );
    }

    // Handle search errors
    if (searchResults.error) {
      console.error(`Search error: ${searchResults.error}`);
      return NextResponse.json(
        { error: searchResults.error },
        { status: 500 }
      );
    }

    // Log appropriate summary of results
    if (searchResults.summary) {
      console.log(`Search successful, found ${searchResults.results.length} results and generated summary`);
    } else {
      console.log(`Search successful, found ${searchResults.results.length} results`);
    }
    
    // Return the search results
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Error in Brave Search API route:", error);
    return NextResponse.json(
      { 
        error: "Failed to perform search", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 