import {
  LocalParticipant,
  LogLevel,
  Participant,
  RemoteParticipant,
  Room,
  RoomOptions,
  setLogLevel,
  TrackPublishOptions,
  AudioCaptureOptions,
  AudioPreset,
} from 'livekit-client';
import { Socket } from 'socket.io-client';

export const VOICE_API_URL =
  process.env.EXPO_PUBLIC_VOICE_API_URL || 'http://192.168.1.4:3002';

const LIVEKIT_WS_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'ws://192.168.1.4:7880';

setLogLevel(LogLevel.warn);

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMicEnabled: boolean;
  role: 'host' | 'speaker' | 'listener';
}

/**
 * Emit "join_room" via Socket.IO and wait for the callback response
 * containing livekitToken, participant info, chat history, etc.
 */
export const joinRoomViaSocket = (
  socket: Socket,
  roomId: string,
): Promise<{
  room: any;
  participant: any;
  livekitToken: string;
  livekitUrl?: string;
  participants: any[];
  messages: any[];
}> => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('Socket is not connected.'));
      return;
    }

    socket.emit('join_room', { roomId }, (response: any) => {
      if (!response.success) {
        reject(new Error(response.error || 'Failed to join room'));
      } else {
        resolve(response.data);
      }
    });
  });
};

/**
 * Emit "create_room" via Socket.IO and wait for the callback response.
 */
export const createRoomViaSocket = (
  socket: Socket,
  title: string,
  type: 'public' | 'private',
): Promise<{
  room: any;
  participant: any;
  livekitToken: string;
  livekitUrl?: string;
}> => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('Socket is not connected.'));
      return;
    }

    socket.emit('create_room', { title, type }, (response: any) => {
      if (!response.success) {
        reject(new Error(response.error || 'Failed to create room'));
      } else {
        resolve(response.data);
      }
    });
  });
};

/**
 * Audio capture options for better microphone quality
 * - autoGainControl: Automatically adjusts microphone gain
 * - echoCancellation: Removes echo from speakers
 * - noiseSuppression: Reduces background noise
 */
export const audioCaptureOptions: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Audio preset for high quality voice (32kbps)
 */
export const voiceHighQuality: AudioPreset = {
  maxBitrate: 32000,
};

/**
 * Audio publish options for high quality audio
 * - dtx: Disable discontinuous transmission for consistent quality
 * - audioPreset: Use high quality voice preset
 */
export const audioPublishOptions: TrackPublishOptions = {
  dtx: false,
  audioPreset: voiceHighQuality,
};

/**
 * Connect to a LiveKit room using the provided token.
 */
export const connectToLiveKitRoom = async (
  token: string,
  livekitUrl?: string,
  options?: RoomOptions,
): Promise<Room> => {
  const roomOptions: RoomOptions = {
    ...options,
    // Enable audio auto gain control at room level
    audioCaptureDefaults: audioCaptureOptions,
    // Set default publish options for audio
    publishDefaults: audioPublishOptions,
  };
  
  const room = new Room(roomOptions);
  const url = livekitUrl || LIVEKIT_WS_URL;

  try {
    await room.connect(url, token);
    console.log('Connected to LiveKit room:', room.name);
    return room;
  } catch (error) {
    console.error('Failed to connect to LiveKit room:', error);
    room.disconnect();
    throw error;
  }
};

/**
 * Extract participant info from a LiveKit Participant object.
 */
export const getParticipantInfo = (participant: Participant): ParticipantInfo => {
  let role: 'host' | 'speaker' | 'listener' = 'listener';
  try {
    const metadata = JSON.parse(participant.metadata || '{}');
    if (metadata.role) role = metadata.role;
  } catch {
    // ignore parse errors
  }

  return {
    identity: participant.identity,
    name: participant.name || participant.identity,
    isSpeaking: participant.isSpeaking,
    isMicEnabled: participant.isMicrophoneEnabled,
    role,
  };
};

/**
 * Toggle the local participant's microphone on/off with optimized audio settings.
 */
export const toggleMic = async (localParticipant: LocalParticipant, enabled: boolean) => {
  try {
    if (enabled) {
      // Enable mic with audio capture options for better quality
      await localParticipant.setMicrophoneEnabled(true, audioCaptureOptions);
    } else {
      await localParticipant.setMicrophoneEnabled(false);
    }
  } catch (error) {
    console.error('Failed to toggle microphone:', error);
  }
};
