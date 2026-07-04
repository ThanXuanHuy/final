let io;

const lockedSlots = {};

function cleanExpiredLocks() {
  const now = Date.now();
  let changed = false;
  for (const key in lockedSlots) {
    if (lockedSlots[key].expiresAt < now) {
      delete lockedSlots[key];
      changed = true;
    }
  }
  if (changed && io) {
    io.emit('slotsLockedUpdate', lockedSlots);
  }
}
setInterval(cleanExpiredLocks, 30000);

function initSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('getLockedSlots', () => {
      socket.emit('slotsLockedUpdate', lockedSlots);
    });

    socket.on('syncLockedSlots', ({ chargerId, date, hours }) => {
      const now = Date.now();
      let changed = false;
      
      // Remove existing locks by this socket for this charger and date
      for (const key in lockedSlots) {
        if (lockedSlots[key].socketId === socket.id && key.startsWith(`${chargerId}_${date}_`)) {
          delete lockedSlots[key];
          changed = true;
        }
      }

      // Add new locks
      if (hours && hours.length > 0) {
        hours.forEach(hour => {
          const key = `${chargerId}_${date}_${hour}`;
          // Only lock if not locked by someone else (or if expired)
          if (!lockedSlots[key] || lockedSlots[key].expiresAt < now || lockedSlots[key].socketId === socket.id) {
            lockedSlots[key] = {
              socketId: socket.id,
              expiresAt: now + 5 * 60 * 1000 // 5 minutes
            };
            changed = true;
          }
        });
      }

      if (changed) {
        io.emit('slotsLockedUpdate', lockedSlots);
      }
    });

    socket.on('disconnect', () => {
      let changed = false;
      for (const key in lockedSlots) {
        if (lockedSlots[key].socketId === socket.id) {
          delete lockedSlots[key];
          changed = true;
        }
      }
      if (changed) {
        io.emit('slotsLockedUpdate', lockedSlots);
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

module.exports = { initSocket, getIO };