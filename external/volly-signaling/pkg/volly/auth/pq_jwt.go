package auth

import (
    "crypto/rand"
    "encoding/base64"
    "errors"
    "time"

    "github.com/livekit/protocol/auth"
)

// VollyVideoGrant extends LiveKit's VideoGrant with post-quantum support
type VollyVideoGrant struct {
    auth.VideoGrant
    
    // Post-quantum extensions
    PQPublicKey string `json:"pqPublicKey,omitempty"`
    PQAlgorithm string `json:"pqAlgorithm,omitempty"`
    PQKeyExpiry int64  `json:"pqKeyExpiry,omitempty"`
}

// VollyAccessToken extends LiveKit's AccessToken
type VollyAccessToken struct {
    apiKey   string
    secret   string
    grant    *VollyVideoGrant
    identity string
    ttl      time.Duration
}

// NewVollyAccessToken creates an enhanced access token
func NewVollyAccessToken(apiKey, secret string) *VollyAccessToken {
    return &VollyAccessToken{
        apiKey: apiKey,
        secret: secret,
        grant:  &VollyVideoGrant{},
        ttl:    auth.DefaultTTL,
    }
}

// AddGrant adds video grant permissions
func (t *VollyAccessToken) AddGrant(grant *VollyVideoGrant) *VollyAccessToken {
    t.grant = grant
    return t
}

// SetIdentity sets the participant identity
func (t *VollyAccessToken) SetIdentity(identity string) *VollyAccessToken {
    t.identity = identity
    return t
}

// SetPostQuantumKey adds ML-KEM-768 public key to the token
func (t *VollyAccessToken) SetPostQuantumKey(publicKey []byte, algorithm string) *VollyAccessToken {
    t.grant.PQPublicKey = base64.StdEncoding.EncodeToString(publicKey)
    t.grant.PQAlgorithm = algorithm
    t.grant.PQKeyExpiry = time.Now().Add(24 * time.Hour).Unix()
    return t
}

// ToJWT generates the JWT token
func (t *VollyAccessToken) ToJWT() (string, error) {
    if t.identity == "" {
        return "", errors.New("identity is required")
    }
    
    // Create standard LiveKit token
    at := auth.NewAccessToken(t.apiKey, t.secret).
        AddGrant(&t.grant.VideoGrant).
        SetIdentity(t.identity).
        SetValidFor(t.ttl)
    
    // Add custom claims for post-quantum support
    at.AddClaim("pqPublicKey", t.grant.PQPublicKey)
    at.AddClaim("pqAlgorithm", t.grant.PQAlgorithm)
    at.AddClaim("pqKeyExpiry", t.grant.PQKeyExpiry)
    
    return at.ToJWT()
}

// VerifyVollyToken verifies and extracts post-quantum data from token
func VerifyVollyToken(token, apiKey, secret string) (*VollyVideoGrant, error) {
    // Verify standard LiveKit token
    verifier := auth.NewAccessToken(apiKey, secret)
    grant, err := verifier.Verify(token)
    if err != nil {
        return nil, err
    }
    
    // Extract post-quantum claims
    vollyGrant := &VollyVideoGrant{
        VideoGrant: *grant.Video,
    }
    
    // Parse custom claims
    claims := verifier.Claims()
    if pqKey, ok := claims["pqPublicKey"].(string); ok {
        vollyGrant.PQPublicKey = pqKey
    }
    if pqAlg, ok := claims["pqAlgorithm"].(string); ok {
        vollyGrant.PQAlgorithm = pqAlg
    }
    if pqExp, ok := claims["pqKeyExpiry"].(float64); ok {
        vollyGrant.PQKeyExpiry = int64(pqExp)
    }
    
    return vollyGrant, nil
}