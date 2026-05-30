/**
 * AudioWorklet processor: captures mono Float32 audio frames and forwards
 * them to the main thread via postMessage so the transcript hook can encode
 * them as pcm_s16le and send to the backend.
 *
 * Runs in the AudioWorkletGlobalScope (dedicated audio thread).
 */
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel?.length) {
      // Slice to copy — the underlying buffer is recycled after process() returns.
      this.port.postMessage(channel.slice());
    }
    return true; // keep alive
  }
}

registerProcessor("pcm-processor", PcmProcessor);
