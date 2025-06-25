# Content Sensitivity Detection Research

## Challenge
Detect when users are sharing sensitive content without violating end-to-end encryption or analyzing message content.

## Existing Approaches

### 1. Signal's Approach
- **No content analysis** - Treats all messages equally
- **User-initiated disappearing messages** - Manual sensitivity control
- **Screen security** - Prevents screenshots on Android

**Limitation**: No adaptive behavior based on content type

### 2. Corporate DLP Systems
Traditional Data Loss Prevention looks for:
- Credit card patterns
- SSN formats
- Keyword matching

**Problem**: Incompatible with E2E encryption

### 3. Behavioral Analysis Research

**"Privacy-Preserving Detection of Sensitive Data Exposure" (2018)**
Key findings:
- User behavior changes when handling sensitive data
- Typing patterns become more deliberate
- Longer composition times for sensitive messages
- More edits and revisions

### 4. Metadata Patterns

**Research: "Inferring Sensitive Activities from Mobile Metadata" (2020)**
Observable patterns without content access:
- Time of day correlations
- Message length distributions
- Attachment types and sizes
- Interaction frequency changes

## Proposed Solution for Volli

### Multi-Signal Sensitivity Detection

```typescript
interface SensitivityDetector {
  // Analyze without seeing content
  async detectSensitivity(signals: ContentSignals): Promise<SensitivityScore> {
    const factors = await Promise.all([
      this.analyzeUserBehavior(signals.behavior),
      this.analyzeMetadata(signals.metadata),
      this.analyzeContext(signals.context),
      this.checkExplicitSignals(signals.explicit)
    ]);
    
    return this.computeScore(factors);
  }
}
```

### 1. Behavioral Indicators

```typescript
class BehavioralAnalyzer {
  private baseline: UserBaseline;
  
  async analyzeBehavior(behavior: BehaviorData): Promise<BehaviorScore> {
    const indicators = {
      // Typing patterns
      typingSpeed: this.compareToBaseline(behavior.typingSpeed),
      pauseFrequency: this.detectHesitation(behavior.pauses),
      deletionRate: this.measureEdits(behavior.edits),
      
      // Composition patterns  
      compositionTime: this.isUnusuallyLong(behavior.duration),
      messageAbandonment: behavior.draftsDiscarded,
      
      // Review behavior
      previewCount: behavior.messagePreviewsBeforeSend,
      scrollBackBehavior: behavior.reviewedOldMessages
    };
    
    return this.scoreBehavior(indicators);
  }
  
  private detectHesitation(pauses: Pause[]): number {
    // Longer pauses indicate careful consideration
    const significantPauses = pauses.filter(p => p.duration > 3000);
    return significantPauses.length / pauses.length;
  }
}
```

### 2. Metadata Analysis

```typescript
class MetadataAnalyzer {
  async analyzeMetadata(metadata: MessageMetadata): Promise<MetadataScore> {
    const signals = {
      // File indicators
      fileType: this.classifyFileType(metadata.attachments),
      fileName: this.analyzeFileName(metadata.attachments),
      fileSize: this.isUnusualSize(metadata.attachments),
      
      // Message characteristics
      messageLength: this.analyzeLength(metadata.length),
      hasAttachment: metadata.attachments.length > 0,
      formattingComplexity: metadata.formattingUsed,
      
      // Temporal patterns
      unusualTiming: this.isUnusualTime(metadata.timestamp),
      conversationAge: this.getConversationMaturity(metadata.threadId)
    };
    
    return this.scoreMetadata(signals);
  }
  
  private classifyFileType(attachments: Attachment[]): FileSensitivity {
    const sensitiveTypes = {
      'application/pdf': 0.7,        // Often documents
      'image/jpeg': 0.3,             // Could be photos or docs
      'application/zip': 0.8,        // Compressed, possibly sensitive
      'text/plain': 0.5,             // Could be passwords, notes
      'application/vnd.ms-excel': 0.9, // Financial data likely
    };
    
    return attachments.reduce((score, att) => {
      return Math.max(score, sensitiveTypes[att.mimeType] || 0.2);
    }, 0);
  }
}
```

### 3. Contextual Signals

```typescript
class ContextAnalyzer {
  async analyzeContext(context: ConversationContext): Promise<ContextScore> {
    return {
      // Relationship factors
      isNewContact: context.messageCount < 10,
      trustLevel: context.contactTrustLevel,
      
      // Conversation patterns
      topicShift: await this.detectTopicChange(context),
      formalityIncrease: await this.detectFormalityChange(context),
      
      // Environmental
      locationChange: context.userLocationChanged,
      networkChange: context.networkEnvironmentChanged,
      timeGap: context.timeSinceLastMessage > 24 * 60 * 60 * 1000
    };
  }
  
  private async detectTopicChange(context: ConversationContext): Promise<boolean> {
    // Without seeing content, detect rhythm changes
    const recentPattern = context.recentMessageLengths.slice(-10);
    const historicalAvg = context.avgMessageLength;
    
    const deviation = this.calculateDeviation(recentPattern, historicalAvg);
    return deviation > 2.0; // Significant change
  }
}
```

### 4. Explicit User Signals

```typescript
class ExplicitSignals {
  detectUserIntent(actions: UserAction[]): SensitivityHint {
    const signals = {
      // Direct indicators
      enabledDisappearing: actions.includes('enable_disappearing'),
      switchedToPrivateMode: actions.includes('switch_private_mode'),
      verifiedContact: actions.includes('verify_safety_number'),
      
      // Indirect indicators
      clearedHistory: actions.includes('clear_history'),
      exportedChat: actions.includes('export_chat'),
      screenshotPrevented: actions.includes('screenshot_blocked'),
      
      // Security actions
      reportedIssue: actions.includes('report_security'),
      blockedContact: actions.includes('block_contact')
    };
    
    return this.interpretSignals(signals);
  }
}
```

### 5. Adaptive Threshold System

```typescript
class AdaptiveThresholds {
  private userProfile: PrivacyProfile;
  
  async calibrate(userFeedback: Feedback[]): Promise<void> {
    // Learn user's sensitivity preferences
    const thresholds = {
      // Privacy-conscious users: lower threshold
      paranoid: { base: 0.3, fileBoost: 0.4 },
      
      // Balanced users: medium threshold
      balanced: { base: 0.5, fileBoost: 0.3 },
      
      // Convenience users: higher threshold
      relaxed: { base: 0.7, fileBoost: 0.2 }
    };
    
    this.userProfile = await this.classifyUser(userFeedback);
    this.thresholds = thresholds[this.userProfile.type];
  }
}
```

## Implementation Strategy

### Phase 1: Basic Detection
```typescript
class BasicSensitivityDetector {
  detect(signals: BasicSignals): SensitivityLevel {
    // Start with explicit signals only
    if (signals.disappearingEnabled) return 'high';
    if (signals.hasFinancialAttachment) return 'high';
    if (signals.hasImageAttachment) return 'medium';
    
    return 'low';
  }
}
```

### Phase 2: Behavioral Learning
```typescript
class BehavioralLearning {
  private sessionPatterns = new Map<string, Pattern>();
  
  learn(interaction: Interaction): void {
    // Build baseline for this session only
    const pattern = {
      avgTypingSpeed: this.updateAverage('typing', interaction.typingSpeed),
      avgMessageLength: this.updateAverage('length', interaction.messageLength),
      typicalSendTime: this.updateTimePattern(interaction.timestamp)
    };
    
    // Detect anomalies from baseline
    if (this.isAnomalous(interaction, pattern)) {
      this.flagPotentialSensitivity(interaction);
    }
  }
}
```

### Phase 3: Contextual Integration
```typescript
class ContextualSensitivity {
  async evaluate(message: MessageContext): Promise<Decision> {
    const sensitivity = await this.detector.analyze(message);
    
    if (sensitivity.score > this.threshold) {
      return {
        suggestion: 'Switch to private mode for this conversation?',
        reason: 'Detected potentially sensitive content',
        actions: [
          { label: 'Yes, switch', action: 'upgrade_mode' },
          { label: 'No thanks', action: 'dismiss' },
          { label: 'Always for this contact', action: 'create_rule' }
        ]
      };
    }
    
    return null;
  }
}
```

## Privacy Guarantees

### 1. No Content Analysis
```typescript
// What we NEVER do
class ContentAnalyzer {
  analyze(message: string) {
    // ❌ NEVER implemented
    // Content remains end-to-end encrypted
  }
}

// What we do instead
class BehaviorAnalyzer {
  analyze(behavior: UserBehavior) {
    // ✅ Only analyze how user interacts
    // Not what they're saying
  }
}
```

### 2. Local Processing Only
- All analysis happens on-device
- No behavioral data sent to servers
- Patterns deleted after session

### 3. User Control
```typescript
interface SensitivitySettings {
  enableDetection: boolean;        // Can disable entirely
  sensitivityThreshold: number;    // User adjustable
  autoUpgrade: boolean;           // Require confirmation
  learnFromBehavior: boolean;     // Opt-in learning
  
  // Granular controls
  detectFileTypes: boolean;
  detectBehaviorChanges: boolean;
  detectTimingPatterns: boolean;
}
```

## Testing Approach

### 1. Accuracy Testing
Create test scenarios:
- Financial discussion simulation
- Medical information sharing
- Casual conversation baseline
- Mixed sensitivity conversations

### 2. False Positive Rate
Monitor:
- How often casual content triggers detection
- User dismissal rate
- Feedback on suggestions

### 3. Performance Impact
Measure:
- CPU usage during typing
- Memory for pattern storage
- Battery impact of monitoring

## Conclusion & Recommendations

### For Volli Implementation:

1. **Start Conservative**
   - Only detect explicit signals (disappearing messages, file types)
   - Gradually add behavioral detection based on user feedback

2. **Make It Transparent**
   ```typescript
   // Show why sensitivity was detected
   interface SensitivityExplanation {
     triggered: string[];  // ["PDF attachment", "Unusual typing pattern"]
     score: number;        // 0.75
     suggestion: string;   // "Consider private mode"
     dismiss: () => void;  // User control
   }
   ```

3. **Learn Privately**
   - Session-only learning (no persistence)
   - User can reset anytime
   - Clear explanation of what's analyzed

4. **Fail Safely**
   - When uncertain, don't interrupt
   - Let users create rules for specific scenarios
   - Never force mode changes

### Success Metrics
- 80% accuracy on true sensitive content
- < 10% false positive rate
- 90% user satisfaction with suggestions
- Zero privacy complaints

The key is making users feel the system is helping them protect sensitive content, not spying on them.