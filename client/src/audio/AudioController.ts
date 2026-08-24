import { sounds } from './soundEffects';

export type InputMode = 'voice_activity' | 'push_to_talk';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface AudioSettings {
  selectedInputDevice: string;
  selectedOutputDevice: string;
  inputMode: InputMode;
  pttKey: string; // e.g. 'KeyV', 'Space', 'CapsLock'
  pttKeyLabel: string; // e.g. 'V', 'Space', 'Caps Lock'
  voiceThreshold: number; // 0 - 100
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  masterVolume: number; // 0 - 100
  micGain: number; // 0 - 200 (%)
  soundEffectsEnabled: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  selectedInputDevice: 'default',
  selectedOutputDevice: 'default',
  inputMode: 'voice_activity',
  pttKey: 'KeyV',
  pttKeyLabel: 'V',
  voiceThreshold: 25, // default sensitivity
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  masterVolume: 100,
  micGain: 100,
  soundEffectsEnabled: true
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class AudioController {
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private localSourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private localGainNode: GainNode | null = null;

  // Loopback Mikrofon Testi
  private testAudioElement: HTMLAudioElement | null = null;
  private isTestingMic: boolean = false;

  // WebRTC Eşler (Peers)
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private peerGainNodes: Map<string, GainNode> = new Map();
  private peerAudioElements: Map<string, HTMLAudioElement> = new Map();
  private userVolumes: Map<string, number> = new Map(); // userId -> 0.0 to 2.0 (default 1.0)

  // Durum
  public settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private isPttActive: boolean = false;
  private isSpeaking: boolean = false;
  private vadSilenceTimer: any = null;

  // Dinleyiciler
  private onLevelChange?: (level: number) => void;
  private onSpeakingChange?: (isSpeaking: boolean, level: number) => void;
  private onTrackReceived?: (userId: string, stream: MediaStream) => void;

  constructor() {
    this.loadSettings();
  }

  public loadSettings() {
    try {
      const saved = localStorage.getItem('nexus_audio_settings');
      if (saved) {
        this.settings = { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {}
  }

  public saveSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('nexus_audio_settings', JSON.stringify(this.settings));
    } catch (e) {}
    this.applySettingsChanges();
  }

  public setCallbacks(callbacks: {
    onLevelChange?: (level: number) => void;
    onSpeakingChange?: (isSpeaking: boolean, level: number) => void;
    onTrackReceived?: (userId: string, stream: MediaStream) => void;
  }) {
    this.onLevelChange = callbacks.onLevelChange;
    this.onSpeakingChange = callbacks.onSpeakingChange;
    this.onTrackReceived = callbacks.onTrackReceived;
  }

  // --- MİKROFON VE CİHAZ BAŞLATMA ---

  public async getAvailableDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];

      for (const d of devices) {
        if (d.kind === 'audioinput') {
          inputs.push({
            deviceId: d.deviceId,
            label: d.label || `Mikrofon (${inputs.length + 1})`,
            kind: 'audioinput'
          });
        } else if (d.kind === 'audiooutput') {
          outputs.push({
            deviceId: d.deviceId,
            label: d.label || `Hoparlör/Kulaklık (${outputs.length + 1})`,
            kind: 'audiooutput'
          });
        }
      }
      return { inputs, outputs };
    } catch (e) {
      console.error('Error enumerating audio devices:', e);
      return { inputs: [], outputs: [] };
    }
  }

  public async initLocalAudio(): Promise<MediaStream | null> {
    try {
      if (this.localStream) {
        this.stopLocalAudio();
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.settings.selectedInputDevice !== 'default' ? { exact: this.settings.selectedInputDevice } : undefined,
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: this.settings.autoGainControl,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.localSourceNode = this.audioCtx.createMediaStreamSource(stream);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.2;

      this.localGainNode = this.audioCtx.createGain();
      this.localGainNode.gain.value = this.settings.micGain / 100;

      this.localSourceNode.connect(this.analyserNode);
      this.localSourceNode.connect(this.localGainNode);

      this.startVADLoop();
      this.updateMicTransmissionState();

      return stream;
    } catch (err) {
      console.error('Could not initialize local audio:', err);
      return null;
    }
  }

  public stopLocalAudio() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // --- VAD (SES SEVİYESİ VE ALGILAMA DÖNGÜSÜ) ---

  private startVADLoop() {
    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 256);

    const checkAudio = () => {
      if (!this.analyserNode || !this.localStream) return;

      this.analyserNode.getByteFrequencyData(dataArray);

      // RMS Hesaplama (0 - 100)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(100, Math.round((rms / 128) * 100));

      if (this.onLevelChange) {
        this.onLevelChange(normalizedLevel);
      }

      // Voice Activity Modunda konuşma algılama
      if (!this.isMuted && !this.isDeafened) {
        if (this.settings.inputMode === 'voice_activity') {
          const threshold = this.settings.voiceThreshold;
          if (normalizedLevel >= threshold) {
            if (!this.isSpeaking) {
              this.isSpeaking = true;
              this.updateMicTransmissionState();
              if (this.onSpeakingChange) this.onSpeakingChange(true, normalizedLevel);
            }
            if (this.vadSilenceTimer) {
              clearTimeout(this.vadSilenceTimer);
              this.vadSilenceTimer = null;
            }
          } else if (this.isSpeaking && !this.vadSilenceTimer) {
            // 300ms hold time (hemen kesilmesin)
            this.vadSilenceTimer = setTimeout(() => {
              this.isSpeaking = false;
              this.updateMicTransmissionState();
              if (this.onSpeakingChange) this.onSpeakingChange(false, 0);
              this.vadSilenceTimer = null;
            }, 300);
          }
        } else if (this.settings.inputMode === 'push_to_talk') {
          const shouldSpeak = this.isPttActive;
          if (this.isSpeaking !== shouldSpeak) {
            this.isSpeaking = shouldSpeak;
            if (this.onSpeakingChange) this.onSpeakingChange(this.isSpeaking, normalizedLevel);
          }
        }
      }

      requestAnimationFrame(checkAudio);
    };

    requestAnimationFrame(checkAudio);
  }

  // --- BAS-KONUŞ (PUSH-TO-TALK) KONTROLÜ ---

  public setPttActive(pressed: boolean) {
    if (this.settings.inputMode !== 'push_to_talk') return;
    if (this.isPttActive === pressed) return;

    this.isPttActive = pressed;
    if (pressed) {
      if (this.settings.soundEffectsEnabled) sounds.playPttStartSound();
    } else {
      if (this.settings.soundEffectsEnabled) sounds.playPttStopSound();
    }
    this.updateMicTransmissionState();
  }

  // --- SUSTUR / SAĞIRLAŞTIR KONTROLÜ ---

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.settings.soundEffectsEnabled) {
      if (this.isMuted) sounds.playMuteSound();
      else sounds.playUnmuteSound();
    }
    this.updateMicTransmissionState();
    return this.isMuted;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.updateMicTransmissionState();
  }

  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    if (this.isDeafened) {
      this.isMuted = true;
    }
    if (this.settings.soundEffectsEnabled) {
      if (this.isDeafened) sounds.playMuteSound();
      else sounds.playUnmuteSound();
    }
    this.updateMicTransmissionState();
    this.updatePeerAudioElementsDeafen();
    return this.isDeafened;
  }

  public getVoiceState() {
    return {
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: this.isSpeaking,
      isPttActive: this.isPttActive
    };
  }

  private updateMicTransmissionState() {
    if (!this.localStream) return;

    let canTransmit = false;
    if (!this.isMuted && !this.isDeafened) {
      if (this.settings.inputMode === 'voice_activity') {
        canTransmit = this.isSpeaking;
      } else if (this.settings.inputMode === 'push_to_talk') {
        canTransmit = this.isPttActive;
      }
    }

    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = canTransmit;
    });

    if (this.localGainNode) {
      this.localGainNode.gain.value = canTransmit ? (this.settings.micGain / 100) : 0;
    }
  }

  // --- MİKROFON TESTİ (LOOPBACK) ---

  public toggleMicTest(): boolean {
    this.isTestingMic = !this.isTestingMic;
    if (this.isTestingMic) {
      if (this.localStream) {
        if (!this.testAudioElement) {
          this.testAudioElement = new Audio();
        }
        this.testAudioElement.srcObject = this.localStream;
        this.testAudioElement.volume = 1.0;
        this.testAudioElement.play().catch(console.warn);
      }
    } else {
      if (this.testAudioElement) {
        this.testAudioElement.pause();
        this.testAudioElement.srcObject = null;
      }
    }
    return this.isTestingMic;
  }

  public isMicTesting(): boolean {
    return this.isTestingMic;
  }

  // --- KULLANICI BAZLI SES AYARI (0% - 200%) ---

  public setUserVolume(userId: string, volumePercent: number) {
    const volume = Math.max(0, Math.min(2, volumePercent / 100));
    this.userVolumes.set(userId, volume);

    const gainNode = this.peerGainNodes.get(userId);
    if (gainNode) {
      gainNode.gain.value = volume * (this.settings.masterVolume / 100);
    }
    const audioEl = this.peerAudioElements.get(userId);
    if (audioEl && !gainNode) {
      audioEl.volume = Math.min(1, volume * (this.settings.masterVolume / 100));
    }
  }

  public getUserVolume(userId: string): number {
    const v = this.userVolumes.get(userId);
    return v !== undefined ? Math.round(v * 100) : 100;
  }

  private updatePeerAudioElementsDeafen() {
    this.peerAudioElements.forEach(el => {
      el.muted = this.isDeafened;
    });
  }

  private applySettingsChanges() {
    if (this.localGainNode) {
      this.localGainNode.gain.value = this.settings.micGain / 100;
    }
    // Tüm gelen seslerin master volume'unu güncelle
    this.peerGainNodes.forEach((gainNode, userId) => {
      const userVol = this.userVolumes.get(userId) ?? 1.0;
      gainNode.gain.value = userVol * (this.settings.masterVolume / 100);
    });
  }

  // --- WEBRTC PEER CONNECTION PIPELINE ---

  public createPeerConnection(
    userId: string,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
  ): RTCPeerConnection {
    // Varsa eskisini kapat
    this.closePeerConnection(userId);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(userId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Uzak ses akışı geldiğinde
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);

      let audioEl = this.peerAudioElements.get(userId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        this.peerAudioElements.set(userId, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.muted = this.isDeafened;
      audioEl.play().catch(e => console.warn('Autoplay error:', e));

      // Web Audio API ile Gain Node bağla (Ses yükseltme %200 için)
      try {
        if (this.audioCtx) {
          const source = this.audioCtx.createMediaStreamSource(remoteStream);
          const gainNode = this.audioCtx.createGain();
          const userVol = this.userVolumes.get(userId) ?? 1.0;
          gainNode.gain.value = userVol * (this.settings.masterVolume / 100);
          source.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          this.peerGainNodes.set(userId, gainNode);
          audioEl.muted = true; // Duplicate sesi engelle
        }
      } catch (e) {}

      if (onTrack) onTrack(remoteStream);
      if (this.onTrackReceived) this.onTrackReceived(userId, remoteStream);
    };

    // Yerel mikrofon track'ini ekle
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    return pc;
  }

  public getPeerConnection(userId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(userId);
  }

  public async createOffer(userId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(userId);
    if (!pc) return null;

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    // Düşük gecikmeli Opus SDP tweak
    offer.sdp = this.optimizeOpusSdp(offer.sdp || '');
    await pc.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(userId);
    if (!pc) return null;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    answer.sdp = this.optimizeOpusSdp(answer.sdp || '');
    await pc.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public async addIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }

  public closePeerConnection(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }

    const audioEl = this.peerAudioElements.get(userId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      this.peerAudioElements.delete(userId);
    }

    this.peerGainNodes.delete(userId);
  }

  public closeAllPeers() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    this.peerAudioElements.forEach(el => {
      el.pause();
      el.srcObject = null;
    });
    this.peerAudioElements.clear();
    this.peerGainNodes.clear();
  }

  // Ultra-Low Latency Opus Codec Parametreleri
  private optimizeOpusSdp(sdp: string): string {
    return sdp.replace(/a=fmtp:111 ((?:(?!minptime).)*)/g, (match, p1) => {
      return `a=fmtp:111 ${p1};minptime=10;useinbandfec=1;stereo=1;maxaveragebitrate=128000;cbr=1`;
    });
  }
}

export const audioController = new AudioController();
