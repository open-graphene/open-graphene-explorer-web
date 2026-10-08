import { useEffect, useState } from "react";
import { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { CHAIN } from "@open-graphene/chain-swaplock-bindings";
import { nodeUrl } from "./config";

type Connection =
  | { status: "connecting" }
  | { status: "connected"; client: SwaplockClient }
  | { status: "error"; error: Error };

export function useChainConnection() {
  const [connection, setConnection] = useState<Connection>({
    status: "connecting",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let ownedClient: SwaplockClient | undefined;
    setConnection({ status: "connecting" });

    async function connect() {
      try {
        const client = await SwaplockClient.connect(nodeUrl, {
          expectedChainId: CHAIN.chainId,
          timeoutMs: 8000,
        });
        if (disposed) {
          client.close();
          return;
        }
        ownedClient = client;
        setConnection({ status: "connected", client });
      } catch (error) {
        if (!disposed)
          setConnection({
            status: "error",
            error:
              error instanceof Error
                ? error
                : new Error("Node connection failed"),
          });
      }
    }
    void connect();
    return () => {
      disposed = true;
      ownedClient?.close();
    };
  }, [attempt]);

  return { connection, reconnect: () => setAttempt((value) => value + 1) };
}
