/**
 * Test token generator for LiveKit
 * 
 * NOTE: This is for testing only! In production, tokens must be
 * generated on the server to keep the API secret secure.
 */

// Simple JWT implementation for testing
function base64urlEscape(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Keeping for potential future use
// function base64urlUnescape(str: string): string {
//   return (str + '==='.slice((str.length + 3) % 4))
//     .replace(/-/g, '+')
//     .replace(/_/g, '/');
// }

// Keeping for potential future use
// function base64urlDecode(str: string): string {
//   return atob(base64urlUnescape(str));
// }

function base64urlEncode(str: string): string {
  return base64urlEscape(btoa(str));
}

export function generateTestToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  room: string
): string {
  // JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + 86400, // 24 hours
    iss: apiKey,
    sub: identity,
    iat: now,
    video: {
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  // Encode header and payload
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Create signature (simplified for testing - use proper HMAC in production!)
  // This is NOT cryptographically secure - only for local testing
  const signature = base64urlEncode(apiSecret + signingInput);

  return `${signingInput}.${signature}`;
}

/**
 * For actual testing with LiveKit server, use this to get a token from the server
 */
export async function getTokenFromServer(
  identity: string,
  room: string,
  serverUrl: string = 'http://localhost:7881'
): Promise<string> {
  try {
    const response = await fetch(`${serverUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity,
        room,
        // Include any other claims you need
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get token from server');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get token from server:', error);
    // Fall back to test token
    return generateTestToken('devkey', 'secret', identity, room);
  }
}