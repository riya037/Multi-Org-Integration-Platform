import io from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
  }

  // Connect to Socket.IO server
  async connect() {
    try {
      const serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 
        process.env.NODE_ENV === 'production' 
          ? 'https://multi-org-integration-platform-645l.onrender.com'
          : 'http://localhost:3000';

      console.log('Connecting to socket server:', serverUrl);

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        autoConnect: true
      });

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Socket connected successfully');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('Socket connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to establish socket connection:', error);
      throw error;
    }
  }

  // Set up socket event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Socket connected:', this.socket.id);
      
      // Show success toast only after reconnection
      if (this.reconnectAttempts > 0) {
        toast.success('Connection restored');
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Socket disconnected:', reason);
      
      if (reason !== 'io client disconnect') {
        toast.error('Connection lost - attempting to reconnect...');
      }
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.reconnectAttempts++;
      
      console.error(`Socket connection error (attempt ${this.reconnectAttempts}):`, error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to server. Please check your connection.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      toast.success('Connection restored');
    });

    this.socket.on('reconnect_failed', () => {
      this.isConnected = false;
      console.error('Socket reconnection failed');
      toast.error('Failed to reconnect to server');
    });

    // Handle server messages
    this.socket.on('message', (data) => {
      console.log('Server message:', data);
      if (data.type === 'notification') {
        toast(data.message, { 
          icon: data.icon || '📡',
          duration: 4000 
        });
      }
    });

    // Handle integration events
    this.socket.on('integration-created', (data) => {
      console.log('Integration created:', data);
      toast.success(`Integration "${data.integration?.name}" created`);
    });

    this.socket.on('integration-updated', (data) => {
      console.log('Integration updated:', data);
      toast.success(`Integration "${data.integration?.name}" updated`);
    });

    this.socket.on('sync-started', (data) => {
      console.log('Sync started:', data);
      toast(`Sync started for integration`, { icon: '🔄' });
    });

    this.socket.on('sync-completed', (data) => {
      console.log('Sync completed:', data);
      toast.success(`Sync completed successfully`);
    });

    this.socket.on('sync-failed', (data) => {
      console.log('Sync failed:', data);
      toast.error(`Sync failed: ${data.error}`);
    });

    this.socket.on('webhook-received', (data) => {
      console.log('Webhook received:', data);
      toast(`Webhook received from ${data.sobjectType}`, { icon: '📨' });
    });
  }

  // Subscribe to specific events
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not connected. Event listener will be added when connected.');
      // Store the listener to add it when socket connects
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
      return;
    }

    this.socket.on(event, callback);
  }

  // Unsubscribe from events
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    // Also remove from stored listeners
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit events to server
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Join a room (for targeted updates)
  joinRoom(roomName) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', roomName);
      console.log(`Joined room: ${roomName}`);
    } else {
      console.warn('Socket not connected. Cannot join room:', roomName);
    }
  }

  // Leave a room
  leaveRoom(roomName) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-room', roomName);
      console.log(`Left room: ${roomName}`);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      transport: this.socket?.io?.engine?.transport?.name || null
    };
  }

  // Manually reconnect
  reconnect() {
    if (this.socket) {
      console.log('Manually reconnecting socket...');
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Test connection with ping
  async ping() {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const startTime = Date.now();
      
      this.socket.emit('ping', startTime);
      
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.once('pong', (timestamp) => {
        clearTimeout(timeout);
        const latency = Date.now() - timestamp;
        resolve({ latency, timestamp });
      });
    });
  }

  // Get socket statistics
  getStats() {
    if (!this.socket) {
      return null;
    }

    return {
      connected: this.isConnected,
      id: this.socket.id,
      transport: this.socket.io.engine.transport.name,
      upgraded: this.socket.io.engine.upgraded,
      readyState: this.socket.io.engine.readyState,
      reconnectAttempts: this.reconnectAttempts,
      listeners: Object.keys(this.socket._callbacks || {}).length
    };
  }

  // Enable debug mode
  enableDebug() {
    if (this.socket) {
      this.socket.on('*', (event, ...args) => {
        console.log(`Socket Event [${event}]:`, args);
      });
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  window.socketService = socketService;
  socketService.enableDebug();
}

export { socketService };
export default socketService;