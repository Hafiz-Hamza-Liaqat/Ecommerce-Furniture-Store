/**
 * Generic streaming abstractions — no business streaming.
 */

export type StreamChunk = string | Uint8Array;

export type StreamSink = {
  write(chunk: StreamChunk): Promise<void> | void;
  end(): Promise<void> | void;
  abort(reason?: unknown): void;
};

export type StreamSource = {
  readonly contentType: string | null;
  read(): AsyncIterable<StreamChunk>;
};

export type StreamingHook = {
  /**
   * Optional hook invoked when a route opts into streaming.
   * Transport owns plumbing; domains own payloads.
   */
  onStream?(input: {
    readonly path: string;
    readonly sink: StreamSink;
  }): Promise<void>;
};

export async function pipeSourceToSink(
  source: StreamSource,
  sink: StreamSink,
): Promise<void> {
  try {
    for await (const chunk of source.read()) {
      await sink.write(chunk);
    }
    await sink.end();
  } catch (error) {
    sink.abort(error);
    throw error;
  }
}
