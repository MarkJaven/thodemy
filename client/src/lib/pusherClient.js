import Pusher from "pusher-js";

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || "82106f489fd492b9cd65";
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || "ap1";

let client = null;

export const getPusher = () => {
  if (!PUSHER_KEY) return null;
  if (client) return client;
  client = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
  });
  return client;
};

export const waitForPusherConnection = (pusher, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (!pusher) {
      reject(new Error("Pusher not initialized"));
      return;
    }
    const state = pusher.connection.state;
    if (state === "connected") {
      resolve(pusher);
      return;
    }
    const timer = setTimeout(() => {
      pusher.connection.unbind("connected", onConnected);
      pusher.connection.unbind("failed", onFailed);
      reject(new Error("Pusher connection timeout"));
    }, timeout);
    const onConnected = () => {
      clearTimeout(timer);
      pusher.connection.unbind("failed", onFailed);
      resolve(pusher);
    };
    const onFailed = () => {
      clearTimeout(timer);
      pusher.connection.unbind("connected", onConnected);
      reject(new Error("Pusher connection failed"));
    };
    pusher.connection.bind("connected", onConnected);
    pusher.connection.bind("failed", onFailed);
  });
};
