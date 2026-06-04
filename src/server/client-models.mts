/**
 * A message sent from a WebSocket client to the server.
 * The `type` field determines which server action is triggered.
 * Additional fields (e.g. `row`) are action-specific and passed via the
 * index signature.
 */
export type ClientRequestOld = {
  /** The action the client wishes to perform. */
  type:
    | "INSERT_COIN"
    | "GET_HISTORY"
    | "GET_COLOR"
    | "GET_CONTEXT"
    | "START_GAME";
  /** Optional client-generated ID echoed back in the response for async request matching. */
  requestId?: string; // echoed back in the response for async matching
  [keys: string]: string | number | undefined;
};

export type ClientRequest = ClientRequestBasic | ClientRequestInsertCoin;

interface ClientRequestBase {
  type:
    | "INSERT_COIN"
    | "GET_HISTORY"
    | "GET_COLOR"
    | "GET_CONTEXT"
    | "START_GAME";
  requestId?: string;
  payload?: unknown;
}

interface ClientRequestBasic extends ClientRequestBase {
  type: "GET_HISTORY" | "GET_COLOR" | "GET_CONTEXT" | "START_GAME";
}

interface ClientRequestInsertCoin extends ClientRequestBase {
  type: "INSERT_COIN";
  payload: {
    row: number;
  };
}
