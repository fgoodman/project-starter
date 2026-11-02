# Durable Objects

A stateful Worker that holds WebSocket connections, for live updates between users.

**Use it when** the app is real-time, such as multiplayer games or live rooms.

**Source:** `rummy-dummy/server/src/game-server.ts`, `rummy-dummy/server/src/index.ts`, and `rummy-dummy/shared/hub/`.

## Steps

1. Add the object to `server/wrangler.jsonc`. Durable Objects need a paid Workers plan unless they use SQLite storage, and the `new_sqlite_classes` migration below does:

   ```jsonc
   "durable_objects": {
     "bindings": [{ "name": "GAME_SERVER", "class_name": "GameServer" }]
   },
   "migrations": [{ "tag": "v1", "new_sqlite_classes": ["GameServer"] }]
   ```

2. Route WebSocket upgrades to it from `server/src/index.ts`, and export the class:

   ```ts
   export { GameServer } from './game-server.ts';

   // Inside fetch:
   if (url.pathname === '/ws') {
     if (request.headers.get('Upgrade') !== 'websocket') {
       return new Response('Expected a WebSocket upgrade', { status: 426 });
     }
     const stub = env.GAME_SERVER.get(env.GAME_SERVER.idFromName('main'));
     return stub.fetch(request);
   }
   ```

   One object for everything lets a lobby see every room, which is plenty for small traffic. Use `idFromName(roomId)` to give each room its own object once traffic needs it.

3. Use the WebSocket Hibernation API: `this.ctx.acceptWebSocket(ws)`, with `webSocketMessage` and `webSocketClose` methods. A hibernating object doesn't bill for idle connections.

4. Keep the logic transport-agnostic in `shared/`, as `rummy-dummy/shared/hub/game-hub.ts` does. It can then be tested in Node with no Worker running.

5. **Handle silent disconnects.** Phones that sleep or switch networks often never send a close, so a player can stay "connected" forever. Have the client send a ping every 15 seconds, and check for missed ones with the object's alarm. Rummy Dummy uses a 90-second timeout, checked every 30 seconds. See `setWebSocketAutoResponse` and `alarm` in `game-server.ts`.

6. Save state to Durable Object storage on every change, so it survives restarts and deploys. See [Stored data versioning](stored-data-versioning.md).

7. Set `limits` so a stuck loop can't freeze every room. Rummy Dummy uses `cpu_ms: 5000`.

8. Put the WebSocket protocol in `shared/types.ts`, and document its messages in the README.

**On the client:** send the full state again after a reconnect, so nothing missed while offline is lost.

## Check it works

- Two browsers see each other's updates live.
- Turning off a phone's network marks that user away within the timeout.
- State survives restarting `npm run dev`.
- `npm test` covers the shared logic.
