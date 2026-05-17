import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('⚡ Conectado al servidor WebSocket');
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠ Error de conexión WebSocket:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
