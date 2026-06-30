import { io, type Socket } from 'socket.io-client';
import { API_URL, tokenStore } from './api';

let socket: Socket | null = null;

/** مبدأ سرور (بدون /api) برای اتصال WebSocket */
const WS_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(WS_ORIGIN, {
      auth: { token: tokenStore.access },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
