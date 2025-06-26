import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  ConversationType,
  Participant,
  ParticipantRole,
  ParticipantPermissions,
  ConversationMetadata,
  Message
} from './types';

/**
 * Conversation management functionality
 */

/**
 * Create a new conversation
 */
export function createConversation(
  type: ConversationType,
  participants: Array<{
    userId: string;
    role?: ParticipantRole;
    nickname?: string;
  }>,
  metadata: Partial<ConversationMetadata> = {}
): Conversation {
  const now = Date.now();
  
  // Create participants with default permissions
  const conversationParticipants: Participant[] = participants.map((p, index) => ({
    userId: p.userId,
    role: p.role || (index === 0 ? ParticipantRole.OWNER : ParticipantRole.MEMBER),
    joinedAt: now,
    permissions: getDefaultPermissions(p.role || (index === 0 ? ParticipantRole.OWNER : ParticipantRole.MEMBER)),
    nickname: p.nickname
  }));
  
  return {
    id: uuidv4(),
    type,
    participants: conversationParticipants,
    metadata: {
      name: metadata.name,
      description: metadata.description,
      avatar: metadata.avatar,
      isArchived: metadata.isArchived || false,
      isMuted: metadata.isMuted || false,
      isPinned: metadata.isPinned || false,
      tags: metadata.tags || [],
      customData: metadata.customData || {}
    },
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a direct conversation between two users
 */
export function createDirectConversation(
  user1Id: string,
  user2Id: string
): Conversation {
  return createConversation(
    ConversationType.DIRECT,
    [
      { userId: user1Id, role: ParticipantRole.MEMBER },
      { userId: user2Id, role: ParticipantRole.MEMBER }
    ]
  );
}

/**
 * Create a group conversation
 */
export function createGroupConversation(
  ownerId: string,
  memberIds: string[],
  name: string,
  description?: string
): Conversation {
  const participants = [
    { userId: ownerId, role: ParticipantRole.OWNER },
    ...memberIds.map(id => ({ userId: id, role: ParticipantRole.MEMBER }))
  ];
  
  return createConversation(
    ConversationType.GROUP,
    participants,
    { name, description }
  );
}

/**
 * Add participant to conversation
 */
export function addParticipant(
  conversation: Conversation,
  userId: string,
  role: ParticipantRole = ParticipantRole.MEMBER,
  _invitedBy?: string
): Conversation {
  // Check if user is already a participant
  if (conversation.participants.some(p => p.userId === userId)) {
    throw new Error('User is already a participant');
  }
  
  // Direct conversations can only have 2 participants
  if (conversation.type === ConversationType.DIRECT && conversation.participants.length >= 2) {
    throw new Error('Direct conversations can only have 2 participants');
  }
  
  const newParticipant: Participant = {
    userId,
    role,
    joinedAt: Date.now(),
    permissions: getDefaultPermissions(role)
  };
  
  return {
    ...conversation,
    participants: [...conversation.participants, newParticipant],
    updatedAt: Date.now()
  };
}

/**
 * Remove participant from conversation
 */
export function removeParticipant(conversation: Conversation, userId: string): Conversation {
  const participant = conversation.participants.find(p => p.userId === userId);
  if (!participant) {
    throw new Error('User is not a participant');
  }
  
  // Cannot remove the last owner
  if (participant.role === ParticipantRole.OWNER) {
    const ownerCount = conversation.participants.filter(p => p.role === ParticipantRole.OWNER).length;
    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last owner');
    }
  }
  
  return {
    ...conversation,
    participants: conversation.participants.filter(p => p.userId !== userId),
    updatedAt: Date.now()
  };
}

/**
 * Update participant role
 */
export function updateParticipantRole(
  conversation: Conversation,
  userId: string,
  newRole: ParticipantRole
): Conversation {
  const participantIndex = conversation.participants.findIndex(p => p.userId === userId);
  if (participantIndex === -1) {
    throw new Error('User is not a participant');
  }
  
  const participant = conversation.participants[participantIndex];
  
  // Cannot change the last owner's role
  if (participant.role === ParticipantRole.OWNER && newRole !== ParticipantRole.OWNER) {
    const ownerCount = conversation.participants.filter(p => p.role === ParticipantRole.OWNER).length;
    if (ownerCount <= 1) {
      throw new Error('Cannot remove the last owner');
    }
  }
  
  const updatedParticipant: Participant = {
    ...participant,
    role: newRole,
    permissions: getDefaultPermissions(newRole)
  };
  
  const updatedParticipants = [...conversation.participants];
  updatedParticipants[participantIndex] = updatedParticipant;
  
  return {
    ...conversation,
    participants: updatedParticipants,
    updatedAt: Date.now()
  };
}

/**
 * Update participant permissions
 */
export function updateParticipantPermissions(
  conversation: Conversation,
  userId: string,
  permissions: Partial<ParticipantPermissions>
): Conversation {
  const participantIndex = conversation.participants.findIndex(p => p.userId === userId);
  if (participantIndex === -1) {
    throw new Error('User is not a participant');
  }
  
  const participant = conversation.participants[participantIndex];
  const updatedParticipant: Participant = {
    ...participant,
    permissions: {
      ...participant.permissions,
      ...permissions
    }
  };
  
  const updatedParticipants = [...conversation.participants];
  updatedParticipants[participantIndex] = updatedParticipant;
  
  return {
    ...conversation,
    participants: updatedParticipants,
    updatedAt: Date.now()
  };
}

/**
 * Update conversation metadata
 */
export function updateConversationMetadata(
  conversation: Conversation,
  metadata: Partial<ConversationMetadata>
): Conversation {
  return {
    ...conversation,
    metadata: {
      ...conversation.metadata,
      ...metadata
    },
    updatedAt: Date.now()
  };
}

/**
 * Set conversation last message
 */
export function setLastMessage(conversation: Conversation, message: Message): Conversation {
  return {
    ...conversation,
    lastMessage: message,
    updatedAt: Date.now()
  };
}

/**
 * Archive conversation
 */
export function archiveConversation(conversation: Conversation): Conversation {
  return updateConversationMetadata(conversation, { isArchived: true });
}

/**
 * Unarchive conversation
 */
export function unarchiveConversation(conversation: Conversation): Conversation {
  return updateConversationMetadata(conversation, { isArchived: false });
}

/**
 * Mute conversation
 */
export function muteConversation(conversation: Conversation, _muteUntil?: number): Conversation {
  return updateConversationMetadata(conversation, { isMuted: true });
}

/**
 * Unmute conversation
 */
export function unmuteConversation(conversation: Conversation): Conversation {
  return updateConversationMetadata(conversation, { isMuted: false });
}

/**
 * Pin conversation
 */
export function pinConversation(conversation: Conversation): Conversation {
  return updateConversationMetadata(conversation, { isPinned: true });
}

/**
 * Unpin conversation
 */
export function unpinConversation(conversation: Conversation): Conversation {
  return updateConversationMetadata(conversation, { isPinned: false });
}

/**
 * Get participant by user ID
 */
export function getParticipant(conversation: Conversation, userId: string): Participant | undefined {
  return conversation.participants.find(p => p.userId === userId);
}

/**
 * Check if user is participant
 */
export function isParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.participants.some(p => p.userId === userId);
}

/**
 * Check if user can perform action
 */
export function canUserPerformAction(
  conversation: Conversation,
  userId: string,
  action: keyof ParticipantPermissions
): boolean {
  const participant = getParticipant(conversation, userId);
  if (!participant) {
    return false;
  }
  
  return participant.permissions[action];
}

/**
 * Check if user is admin or owner
 */
export function isUserAdminOrOwner(conversation: Conversation, userId: string): boolean {
  const participant = getParticipant(conversation, userId);
  if (!participant) {
    return false;
  }
  
  return participant.role === ParticipantRole.OWNER || 
         participant.role === ParticipantRole.ADMIN;
}

/**
 * Get conversation display name
 */
export function getConversationDisplayName(conversation: Conversation, currentUserId?: string): string {
  if (conversation.metadata.name) {
    return conversation.metadata.name;
  }
  
  if (conversation.type === ConversationType.DIRECT) {
    const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
    return otherParticipant?.nickname || `User ${otherParticipant?.userId.slice(0, 8)}` || 'Direct Message';
  }
  
  if (conversation.type === ConversationType.GROUP) {
    const participantNames = conversation.participants
      .map(p => p.nickname || `User ${p.userId.slice(0, 8)}`)
      .join(', ');
    
    return participantNames.length > 50 
      ? participantNames.substring(0, 47) + '...'
      : participantNames;
  }
  
  return 'Conversation';
}

/**
 * Get active participants (not muted)
 */
export function getActiveParticipants(conversation: Conversation): Participant[] {
  const now = Date.now();
  return conversation.participants.filter(p => !p.muteUntil || p.muteUntil < now);
}

/**
 * Get conversation member count
 */
export function getMemberCount(conversation: Conversation): number {
  return conversation.participants.length;
}

/**
 * Check if conversation is empty
 */
export function isConversationEmpty(conversation: Conversation): boolean {
  return conversation.participants.length === 0;
}

/**
 * Get default permissions for role
 */
function getDefaultPermissions(role: ParticipantRole): ParticipantPermissions {
  switch (role) {
    case ParticipantRole.OWNER:
      return {
        canSendMessages: true,
        canSendMedia: true,
        canInviteUsers: true,
        canEditGroupInfo: true,
        canDeleteMessages: true,
        canPinMessages: true
      };
    
    case ParticipantRole.ADMIN:
      return {
        canSendMessages: true,
        canSendMedia: true,
        canInviteUsers: true,
        canEditGroupInfo: true,
        canDeleteMessages: true,
        canPinMessages: true
      };
    
    case ParticipantRole.MODERATOR:
      return {
        canSendMessages: true,
        canSendMedia: true,
        canInviteUsers: false,
        canEditGroupInfo: false,
        canDeleteMessages: true,
        canPinMessages: true
      };
    
    case ParticipantRole.MEMBER:
      return {
        canSendMessages: true,
        canSendMedia: true,
        canInviteUsers: false,
        canEditGroupInfo: false,
        canDeleteMessages: false,
        canPinMessages: false
      };
    
    case ParticipantRole.GUEST:
      return {
        canSendMessages: true,
        canSendMedia: false,
        canInviteUsers: false,
        canEditGroupInfo: false,
        canDeleteMessages: false,
        canPinMessages: false
      };
    
    default:
      return {
        canSendMessages: false,
        canSendMedia: false,
        canInviteUsers: false,
        canEditGroupInfo: false,
        canDeleteMessages: false,
        canPinMessages: false
      };
  }
}