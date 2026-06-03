/**
 * Consolidated Teams Tools Export
 * 
 * This module exports the consolidated Teams tools:
 * - teams_meeting: All meeting operations
 * - teams_channel: All channel operations
 * - teams_chat: All chat operations
 * 
 * Each tool is operation-based, providing a unified interface
 * for all Teams functionality.
 */

const handleTeamsMeeting = require('./teams_meeting');
const handleTeamsChannel = require('./teams_channel');
const handleTeamsChat = require('./teams_chat');
const { safeTool } = require('../../utils/errors');

// Define the tool schemas
// Note: additionalProperties: true is set so the MCP client forwards any
// future params without requiring a schema bump. The enumerated properties
// below cover everything the handlers currently destructure.
const meetingToolSchema = {
  type: 'object',
  required: ['operation'],
  additionalProperties: true,
  properties: {
    operation: {
      type: 'string',
      description: 'The operation to perform',
      enum: [
        'create', 'update', 'cancel', 'get', 'find_by_url',
        'list_transcripts', 'get_transcript', 'list_recordings',
        'get_recording', 'get_participants', 'get_insights'
      ]
    },
    meetingId: { type: 'string', description: 'Meeting ID (for get/update/cancel/transcripts/recordings/participants/insights)' },
    subject: { type: 'string', description: 'Meeting subject (for create/update)' },
    startDateTime: { type: 'string', description: 'Start date/time in ISO format (for create/update)' },
    endDateTime: { type: 'string', description: 'End date/time in ISO format (for create/update)' },
    description: { type: 'string', description: 'Meeting body/description (for create/update)' },
    participants: {
      type: 'array',
      items: { type: 'string' },
      description: 'Attendee email addresses (for create)'
    },
    comment: { type: 'string', description: 'Cancellation comment (for cancel)' },
    joinUrl: { type: 'string', description: 'Teams meeting join URL (for find_by_url)' },
    transcriptId: { type: 'string', description: 'Transcript ID (for get_transcript)' },
    format: { type: 'string', description: 'Transcript format, e.g. text/vtt (for get_transcript)' },
    recordingId: { type: 'string', description: 'Recording ID (for get_recording)' }
  }
};

const channelToolSchema = {
  type: 'object',
  required: ['operation'],
  additionalProperties: true,
  properties: {
    operation: {
      type: 'string',
      description: 'The operation to perform',
      enum: [
        'list', 'create', 'get', 'update', 'delete',
        'list_messages', 'get_message', 'create_message', 'reply_to_message',
        'list_members', 'add_member', 'remove_member', 'list_tabs'
      ]
    },
    teamId: { type: 'string', description: 'Team ID (required for most channel operations)' },
    channelId: { type: 'string', description: 'Channel ID (required for channel-scoped operations)' },
    displayName: { type: 'string', description: 'Channel display name (for create/update) or member display name (for add_member)' },
    description: { type: 'string', description: 'Channel description (for create/update)' },
    membershipType: { type: 'string', description: 'Channel membership type: standard | private | shared (for create)' },
    maxResults: { type: 'number', description: 'Max items returned (for list_messages)' },
    messageId: { type: 'string', description: 'Message ID (for get_message / reply_to_message)' },
    content: { type: 'string', description: 'Message body (for create_message / reply_to_message)' },
    attachments: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
      description: 'Attachments (for create_message / reply_to_message)'
    },
    userId: { type: 'string', description: 'User ID (for add_member)' },
    email: { type: 'string', description: 'User email — resolved to userId if userId not provided (for add_member)' },
    roles: {
      type: 'array',
      items: { type: 'string' },
      description: 'Member roles array (for add_member)'
    },
    memberId: { type: 'string', description: 'Conversation member ID (for remove_member)' }
  }
};

const chatToolSchema = {
  type: 'object',
  required: ['operation'],
  additionalProperties: true,
  properties: {
    operation: {
      type: 'string',
      description: 'The operation to perform',
      enum: [
        'list', 'create', 'get', 'update', 'delete',
        'list_messages', 'get_message', 'send_message', 'update_message', 'delete_message',
        'list_members', 'add_member', 'remove_member'
      ]
    },
    chatId: { type: 'string', description: 'Chat ID (required for chat-scoped operations)' },
    messageId: { type: 'string', description: 'Message ID (for get_message / update_message / delete_message)' },
    maxResults: { type: 'number', description: 'Max items returned (for list / list_messages)' },
    topic: { type: 'string', description: 'Chat topic (for create group chat / update)' },
    members: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of member user IDs or emails (for create)'
    },
    userId: { type: 'string', description: 'User ID (for add_member)' },
    email: { type: 'string', description: 'User email — resolved to userId if userId not provided (for add_member)' },
    roles: {
      type: 'array',
      items: { type: 'string' },
      description: 'Member roles array, defaults to ["member"] (for add_member)'
    },
    memberId: { type: 'string', description: 'Conversation member ID (for remove_member)' },
    content: { type: 'string', description: 'Message body, HTML or text (for send_message / update_message)' },
    replyToId: { type: 'string', description: 'Reply-to message ID (for send_message)' },
    attachments: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
      description: 'Attachments array of { name, contentUrl, contentType } (for send_message)'
    }
  }
};

// Export the tools
module.exports = [
  {
    name: 'teams_meeting',
    description: 'Teams meeting operations: create, update, cancel, find, list transcripts, get recordings, and more',
    inputSchema: meetingToolSchema,
    handler: safeTool('teams_meeting', handleTeamsMeeting)
  },
  {
    name: 'teams_channel',
    description: 'Teams channel operations: list, create, get, update, delete channels and manage messages, members, and tabs',
    inputSchema: channelToolSchema,
    handler: safeTool('teams_channel', handleTeamsChannel)
  },
  {
    name: 'teams_chat',
    description: 'Teams chat operations: list, create, get, update, delete chats and manage messages and members',
    inputSchema: chatToolSchema,
    handler: safeTool('teams_chat', handleTeamsChat)
  }
];