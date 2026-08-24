import React, { useState, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';
import { audioController, AudioDevice } from '../audio/AudioController';
import { X, Mic, Volume2, KeyRound, Radio, Sliders, ShieldCheck, RefreshCw, VolumeX } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { audioSettings, updateAudioSettings, myMicLevel } = useVoice();
  const [devices, setDevices] = useState<{ inputs: AudioDevice[]; outputs: AudioDevice[] }>({ inputs: [], outputs: [] });
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      setIsTestingMic(audioController.isMicTesting());
    } else {
      if (audioController.isMicTesting()) {
        audioController.toggleMicTest();
        setIsTestingMic(false);
      }
    }
  }, [isOpen]);

  const loadDevices = async () => {
    const list = await audioController.getAvailableDevices();
    setDevices(list);
  };

  // Bas-Konuş Tuşu Kaydetme Dinleyicisi
  useEffect(() => {
    if (!isRecordingKey) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let keyLabel = e.code;
      if (e.code.startsWith('Key')) keyLabel = e.code.replace('Key', '');
      else if (e.code.startsWith('Digit')) keyLabel = e.code.replace('Digit', '');
      else if (e.code === 'Space') keyLabel = 'Space (Boşluk)';
      else if (e.code === 'CapsLock') keyLabel = 'Caps Lock';
      else if (e.code.startsWith('Control')) keyLabel = 'Ctrl';
      else if (e.code.startsWith('Shift')) keyLabel = 'Shift';
      else if (e.code.startsWith('Alt')) keyLabel = 'Alt';

      updateAudioSettings({
        pttKey: e.code,
        pttKeyLabel: keyLabel
      });
      setIsRecordingKey(false);
    };

    window.addEventListener('keydown', handleKey, { once: true });
    return () => window.removeEventListener('keydown', handleKey);
  }, [isRecordingKey]);

  if (!isOpen) return null;

  const toggleMicTest = () => {
    const state = audioController.toggleMicTest();
    setIsTestingMic(state);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#111622] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#171f30]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ses ve Mikrofon Ayarları</h2>
              <p className="text-xs text-slate-400">Kristal netliğinde ve sıfır gecikmeli ses iletişimi yapılandırması</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Cihaz Seçimleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Giriş Cihazı (Mikrofon) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-indigo-400" /> Giriş Cihazı (Mikrofon)
                </label>
                <button onClick={loadDevices} className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Yenile
                </button>
              </div>
              <select
                value={audioSettings.selectedInputDevice}
                onChange={(e) => {
                  updateAudioSettings({ selectedInputDevice: e.target.value });
                  audioController.initLocalAudio();
                }}
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="default">Varsayılan Mikrofon</option>
                {devices.inputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Çıkış Cihazı (Hoparlör) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-indigo-400" /> Çıkış Cihazı (Kulaklık/Hoparlör)
              </label>
              <select
                value={audioSettings.selectedOutputDevice}
                onChange={(e) => updateAudioSettings({ selectedOutputDevice: e.target.value })}
                className="w-full bg-[#171f30] border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="default">Varsayılan Çıkış Aygıtı</option>
                {devices.outputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ses Seviyeleri Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#171f30]/60 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Mikrofon Kazancı (Mic Boost)</span>
                <span className="text-indigo-400 font-bold">%{audioSettings.micGain}</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={audioSettings.micGain}
                onChange={(e) => updateAudioSettings({ micGain: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Genel Çıkış Sesi (Master Volume)</span>
                <span className="text-indigo-400 font-bold">%{audioSettings.masterVolume}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioSettings.masterVolume}
                onChange={(e) => updateAudioSettings({ masterVolume: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* İletim Modu (Ses Algılama vs Bas-Konuş) */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Mikrofon İletim Modu
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Ses Algılama Butonu */}
              <button
                type="button"
                onClick={() => updateAudioSettings({ inputMode: 'voice_activity' })}
                className={`p-3.5 rounded-xl border flex flex-col items-start text-left transition ${
                  audioSettings.inputMode === 'voice_activity'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-[#171f30] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Radio className={`w-4 h-4 ${audioSettings.inputMode === 'voice_activity' ? 'text-indigo-400' : ''}`} />
                  Ses Algılama (Otomatik)
                </div>
                <span className="text-xs text-slate-400 mt-1">Konuştuğunuz an otomatik iletilir</span>
              </button>

              {/* Bas-Konuş Butonu */}
              <button
                type="button"
                onClick={() => updateAudioSettings({ inputMode: 'push_to_talk' })}
                className={`p-3.5 rounded-xl border flex flex-col items-start text-left transition ${
                  audioSettings.inputMode === 'push_to_talk'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-[#171f30] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <KeyRound className={`w-4 h-4 ${audioSettings.inputMode === 'push_to_talk' ? 'text-indigo-400' : ''}`} />
                  Bas-Konuş (Push-to-Talk)
                </div>
                <span className="text-xs text-slate-400 mt-1">Sadece tuşa basılıyken ses gider</span>
              </button>
            </div>

            {/* Bas-Konuş Tuş Atayıcı */}
            {audioSettings.inputMode === 'push_to_talk' && (
              <div className="p-4 bg-[#171f30] border border-slate-700/80 rounded-xl flex items-center justify-between animate-fade-in">
                <div>
                  <div className="font-semibold text-slate-200">Kısayol Tuşu</div>
                  <div className="text-xs text-slate-400">Oyun oynarken basılı tutacağınız tuş</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecordingKey(true)}
                  className={`px-4 py-2 rounded-lg font-mono text-sm font-bold border transition ${
                    isRecordingKey
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse'
                      : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isRecordingKey ? 'Klavyede Bir Tuşa Basın...' : audioSettings.pttKeyLabel}
                </button>
              </div>
            )}

            {/* Canlı Mikrofon VU Metresi & Ses Algılama Eşik Barı */}
            <div className="space-y-2 bg-[#171f30] p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" /> Canlı Mikrofon Seviyesi & Hassasiyet
                </span>
                <span className="text-slate-400">
                  Eşik: <strong className="text-indigo-400">%{audioSettings.voiceThreshold}</strong> | Seviye: <strong className="text-emerald-400">%{myMicLevel}</strong>
                </span>
              </div>

              {/* VU Meter & Threshold Overlay */}
              <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                {/* Eşik Çizgisi */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 shadow-sm"
                  style={{ left: `${audioSettings.voiceThreshold}%` }}
                />

                {/* Dinamik VU Çubuğu */}
                <div
                  className={`h-full transition-all duration-75 ${
                    myMicLevel >= audioSettings.voiceThreshold
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : 'bg-gradient-to-r from-slate-600 to-slate-500'
                  }`}
                  style={{ width: `${Math.min(100, myMicLevel)}%` }}
                />
              </div>

              {/* Hassasiyet Ayarı Slider */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Çok Hassas (%0)</span>
                  <span>Normal (%25-%35)</span>
                  <span>Gürültülü Oda (%70+)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={audioSettings.voiceThreshold}
                  onChange={(e) => updateAudioSettings({ voiceThreshold: Number(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Mikrofon Test Butonu */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Mikrofonunu Canlı Test Et</div>
              <div className="text-xs text-slate-400">Kendi sesini kulaklığında gecikmesiz duyup mikrofon kalitesini test et</div>
            </div>
            <button
              type="button"
              onClick={toggleMicTest}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
                isTestingMic
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              }`}
            >
              {isTestingMic ? (
                <>
                  <VolumeX className="w-4 h-4" /> Testi Durdur
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Test Etmeye Başla
                </>
              )}
            </button>
          </div>

          {/* Donanım & Akustik İyileştirmeler */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Donanım & Akustik Filtreler
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Yankı Engelleme */}
              <label className="flex items-center justify-between p-3 bg-[#171f30] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-200">Yankı Engelleme (AEC)</span>
                <input
                  type="checkbox"
                  checked={audioSettings.echoCancellation}
                  onChange={(e) => {
                    updateAudioSettings({ echoCancellation: e.target.checked });
                    audioController.initLocalAudio();
                  }}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              {/* Gürültü Filtreleme */}
              <label className="flex items-center justify-between p-3 bg-[#171f30] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-200">Gürültü Engelleme</span>
                <input
                  type="checkbox"
                  checked={audioSettings.noiseSuppression}
                  onChange={(e) => {
                    updateAudioSettings({ noiseSuppression: e.target.checked });
                    audioController.initLocalAudio();
                  }}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              {/* Otomatik Kazanç */}
              <label className="flex items-center justify-between p-3 bg-[#171f30] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-200">Otomatik Kazanç (AGC)</span>
                <input
                  type="checkbox"
                  checked={audioSettings.autoGainControl}
                  onChange={(e) => {
                    updateAudioSettings({ autoGainControl: e.target.checked });
                    audioController.initLocalAudio();
                  }}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Modal Alt Çubuğu */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#171f30] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Tamam & Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
