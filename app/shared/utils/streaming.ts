/**
 * Utility for handling streaming responses
 */

/**
 * Process a function in the background without blocking the response
 * This is useful for long-running operations that produce streaming responses.
 * 
 * @param func The async function to execute in the background
 */
export const processInBackground = async (func: () => Promise<void>): Promise<void> => {
  // Start the function but don't await its result
  // This allows the calling code to return immediately while this continues in the background
  func().catch(error => {
    console.error('Background process error:', error);
  });
};

/**
 * Creates a streaming response from a generator
 * 
 * @param generator Async generator that yields chunks
 * @returns A Response object with a readable stream
 */
export const createStreamingResponse = async function* (
  generator: AsyncGenerator<string, void, unknown>
): AsyncGenerator<Uint8Array, void, unknown> {
  const encoder = new TextEncoder();
  
  try {
    for await (const chunk of generator) {
      yield encoder.encode(chunk);
    }
  } catch (error) {
    console.error('Streaming error:', error);
    yield encoder.encode('\n\nStreaming error occurred.');
  }
};

/**
 * Helper to parse streaming JSON responses
 * Use this when the API returns a stream of JSON objects
 * 
 * @param chunk The raw text chunk
 * @returns Parsed object or null if invalid
 */
export const parseStreamingJSON = <T>(chunk: string): T | null => {
  try {
    return JSON.parse(chunk) as T;
  } catch (e) {
    return null;
  }
}; 