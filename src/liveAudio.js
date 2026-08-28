export function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export class LiveMicrophone {
  constructor(onAudio) {
    this.onAudio = onAudio;
    this.context = null;
    this.stream = null;
    this.source = null;
    this.worklet = null;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.context = new AudioContext({ sampleRate: 16000 });
    await this.context.audioWorklet.addModule('/pcm-recorder.worklet.js');
    this.source = this.context.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.context, 'pcm-recorder');
    this.worklet.port.onmessage = event => this.onAudio(event.data, this.context.sampleRate);
    const silent = this.context.createGain();
    silent.gain.value = 0;
    this.source.connect(this.worklet);
    this.worklet.connect(silent).connect(this.context.destination);
    await this.context.resume();
  }

  async stop() {
    this.worklet?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}

export class LiveAudioPlayer {
  constructor() {
    this.context = null;
    this.nextStart = 0;
    this.sources = new Set();
  }

  async ensureContext() {
    if (!this.context || this.context.state === 'closed') this.context = new AudioContext({ sampleRate: 24000 });
    if (this.context.state === 'suspended') await this.context.resume();
  }

  async play(base64Pcm) {
    await this.ensureContext();
    const bytes = base64ToBytes(base64Pcm);
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const floats = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) floats[i] = pcm[i] / 32768;
    const buffer = this.context.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const start = Math.max(this.context.currentTime + 0.025, this.nextStart);
    source.start(start);
    this.nextStart = start + buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  interrupt() {
    this.sources.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
    this.sources.clear();
    this.nextStart = this.context?.currentTime || 0;
  }

  async close() {
    this.interrupt();
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
}
