/**
 * LLM Service — OpenAI GPT integration
 * Handles real AI responses with streaming, conversation history,
 * and healthcare safety guardrails.
 */

const OpenAI = require('openai');

// System prompt that defines the assistant's identity and behaviour
const SYSTEM_PROMPT = `You are HealthCare AI, an intelligent conversational health assistant built for the AI Healthcare Assistant platform.

## Your Identity
- You are a knowledgeable, empathetic health assistant — not a doctor, physician, or diagnostic system.
- You assist with health education, symptom guidance, first aid, medication information, nutrition, wellness, and general health questions.
- You speak clearly, use plain language, and format answers with markdown (headings, lists, bold) when it improves readability.

## Conversation Behaviour
- Respond naturally to the user's actual question — greetings get greetings, health questions get health answers, follow-up questions use prior context.
- NEVER force every message into a symptom-diagnosis report. Only suggest a structured health assessment when the user explicitly describes symptoms and asks for help understanding them.
- Maintain continuity: if a user says "what about my hand?" and previously mentioned a hand injury, connect the dots.
- Ask focused follow-up questions when important information is genuinely missing. Do NOT bombard the user with more than 2–3 questions at once.
- Avoid asking questions the user already answered earlier in the conversation.

## Medical Safety Rules (non-negotiable)
1. NEVER claim to provide a confirmed diagnosis.
2. NEVER invent specific statistics, probabilities, or "X% chance of condition Y" — these are not validated.
3. If symptoms suggest a medical emergency (chest pain, difficulty breathing, stroke signs, severe bleeding, suicidal thoughts, etc.), immediately and clearly advise the user to call emergency services (108 in India, 911 in the US, 999 in the UK) or go to the nearest emergency room — do NOT delay this behind a questionnaire.
4. Give medication information with appropriate safety caveats. Do not recommend specific doses for individual users.
5. Do not invent citations, studies, or medical data.
6. Distinguish clearly between general health education and personal medical guidance.
7. Always include a brief reminder to consult a qualified healthcare provider for personal medical decisions.

## Out-of-Healthcare Questions
- If a user asks a general question (e.g., "explain machine learning"), answer it briefly and helpfully, then note that your primary expertise is healthcare.
- Do not refuse non-healthcare questions; just be transparent about your focus area.

## Formatting
- Use markdown: **bold**, _italic_, ### headings, bullet lists, numbered lists.
- For emergency situations, start the response with a clear ⚠️ or 🚨 warning.
- Keep responses concise unless detail is genuinely needed.
- Do not use excessive emoji; use them only to improve clarity.`;

let openaiClient = null;

/**
 * Lazily initialise the OpenAI client.
 * Returns null (with a warning) if the key is missing.
 */
function getClient() {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }

  const isGroq = apiKey.startsWith('gsk_');
  const baseURL = process.env.OPENAI_BASE_URL || (isGroq ? 'https://api.groq.com/openai/v1' : undefined);

  openaiClient = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return openaiClient;
}

/**
 * Build the messages array for the OpenAI API from stored conversation history.
 * Keeps a bounded context window to avoid runaway token use.
 *
 * @param {Array}  history  - Array of {role, content} from MongoDB (excludes current message)
 * @param {string} message  - The new user message
 * @returns {Array}         - OpenAI messages array
 */
function buildMessages(history, message) {
  const MAX_HISTORY_MESSAGES = 20; // 10 user + 10 assistant turns max

  // Take the last N messages to keep context bounded
  const boundedHistory = history.slice(-MAX_HISTORY_MESSAGES).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...boundedHistory,
    { role: 'user', content: message },
  ];
}

/**
 * Stream a chat response from OpenAI.
 * Calls onChunk(text) for each incremental token, then calls onDone(fullText).
 * On error, calls onError(err).
 *
 * @param {string}   message    - Current user message
 * @param {Array}    history    - Previous messages [{role, content}]
 * @param {Function} onChunk    - Called with each text chunk
 * @param {Function} onDone     - Called with the complete response text
 * @param {Function} onError    - Called with an Error
 * @param {AbortSignal} signal  - Optional AbortSignal to cancel streaming
 */
async function streamChatResponse(message, history, onChunk, onDone, onError, signal) {
  const client = getClient();

  if (!client) {
    onError(new Error(
      'OPENAI_NOT_CONFIGURED: The AI service is not configured. ' +
      'Please set the OPENAI_API_KEY environment variable on the server.'
    ));
    return;
  }

  const messages = buildMessages(history, message);

  try {
    const model = process.env.OPENAI_MODEL || (process.env.OPENAI_API_KEY?.startsWith('gsk_') ? 'openai/gpt-oss-20b' : 'gpt-4o-mini');

    const stream = await client.chat.completions.create(
      {
        model,
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      },
      { signal }
    );

    let fullText = '';

    for await (const chunk of stream) {
      // Check if the client disconnected
      if (signal?.aborted) break;

      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }

      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === 'stop' || finishReason === 'length') {
        break;
      }
    }

    onDone(fullText);
  } catch (err) {
    // OpenAI SDK wraps abort as APIUserAbortError
    if (err.name === 'APIUserAbortError' || err.message?.includes('aborted')) {
      onDone(''); // Treat cancellation as a clean end with empty completion
      return;
    }

    // Surface clear, non-technical error messages
    let message = err.message || 'Unknown AI error';

    if (err.status === 401) {
      message = 'OPENAI_AUTH_ERROR: Invalid OpenAI API key. Please verify OPENAI_API_KEY on the server.';
    } else if (err.status === 429) {
      message = 'OPENAI_RATE_LIMIT: The AI service is currently rate-limited. Please try again in a moment.';
    } else if (err.status === 500 || err.status === 503) {
      message = 'OPENAI_UNAVAILABLE: The OpenAI service is temporarily unavailable. Please try again shortly.';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      message = 'OPENAI_NETWORK_ERROR: Cannot reach the AI service. Check the server\'s network connection.';
    }

    onError(new Error(message));
  }
}

/**
 * Non-streaming version for fallback or testing.
 * Returns the full response text.
 */
async function getChatResponse(message, history) {
  const client = getClient();

  if (!client) {
    throw new Error(
      'OPENAI_NOT_CONFIGURED: The AI service is not configured. ' +
      'Please set the OPENAI_API_KEY environment variable.'
    );
  }

  const messages = buildMessages(history, message);

  const model = process.env.OPENAI_MODEL || (process.env.OPENAI_API_KEY?.startsWith('gsk_') ? 'openai/gpt-oss-20b' : 'gpt-4o-mini');

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Check if the LLM service is available (API key present).
 */
function isLLMAvailable() {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.trim().length > 0);
}

module.exports = { streamChatResponse, getChatResponse, isLLMAvailable };
