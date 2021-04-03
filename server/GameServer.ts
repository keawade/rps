import {
  acceptable,
  acceptWebSocket,
  config,
  isWebSocketCloseEvent,
  log,
  serve,
  WebSocket,
} from "./deps.ts";

interface IClient {
  hostname?: string;
  userAgent?: string;
}

export class GameServer {
  // TODO: Move sockets list to something like Redis so server can scale horizontally
  private sockets: WebSocket[] = [];
  private MAX_SOCKETS = 50;
  private PORT: string = Deno.env.get("PORT") ?? "8080";

  constructor() {
    config({ export: true, safe: true });
  }

  public async start() {
    log.info(`server is running on :${this.PORT}`);
    for await (const req of serve(`:${this.PORT}`)) {
      const client: IClient = {};
      try {
        if (!this.isNetAddr(req.conn.remoteAddr)) {
          throw new Error("Connection not from a net address!");
        }
        client.hostname = req.conn.remoteAddr.hostname;

        const userAgent = req.headers.get("user-agent");
        if (userAgent === null) {
          throw new Error("No user agent!");
        }
        client.userAgent = userAgent;

        log.info(
          `Connection from ${req.conn.remoteAddr.hostname} ${new Date()}`,
        );
      } catch (err) {
        log.error({
          message: "Failed to get client IP and user-agent",
          Error: err,
        });
      }

      if (acceptable(req)) {
        const { conn, r: bufReader, w: bufWriter, headers } = req;

        acceptWebSocket({ conn, bufReader, bufWriter, headers })
          .then((socket) => (
            this.handleNewWebSocket(socket, client)
          ))
          .catch(async (err) => {
            log.error(err);
            await req.respond({ status: 400 });
          });
      } else {
        await req.respond({ status: 400 });
      }
    }
  }

  private isNetAddr(addr: Deno.Addr): addr is Deno.NetAddr {
    return addr.transport === "tcp" || addr.transport === "udp";
  }

  private async handleNewWebSocket(
    socket: WebSocket,
    client: IClient,
  ) {
    this.sockets.push(socket);

    if (this.sockets.length > this.MAX_SOCKETS) {
      await socket.close(1000, "Exceeded max sockets limit!").catch(log.error);
      log.error("Exceeded max sockets limit!");
      return;
    }

    log.info(`Socket connected! #${this.sockets.length}`);

    try {
      for await (const event of socket) {
        if (typeof event === "string") {
          await this.processMessage(socket, client, event);
        } else if (isWebSocketCloseEvent(event)) {
          await this.closeSocket(socket);
        } else {
          log.info("Invalid socket event received. Closing socket...");
          await this.closeSocket(socket);
        }
      }
    } catch (err) {
      log.error({ message: "Failed to receive frame", Error: err });
      await this.closeSocket(socket);
    }
  }

  private async processMessage(
    socket: WebSocket,
    client: IClient,
    message: string,
  ) {}

  private async closeSocket(socket: WebSocket, user?: string) {
    if (!socket.isClosed) {
      await socket.close(1000).catch(log.error);
      log.info(`Socket closed. Remaining sockets: ${this.sockets.length}`);
    }
  }
}
