import { useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { setAudio } from '../../commands';
import { audioEngine } from '../../engine/audioEngine';
import { usePlaybackStore } from '../../stores/playbackStore';
import { saveAudioBlob, clearAudioBlob } from '../../persistence/audioStorage';
import { computePeaksFromBuffer } from '../../utils/waveform';
import { Icon } from '../common/Icon';
import { IconButton } from '../common/IconButton';

export function AudioImportControl() {
  const audio = useProjectStore((s) => s.project.audio);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const handleFile = async (file: File) => {
    setIsDecoding(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Decodes once here (Web Audio API buffer used for actual sample-
      // accurate playback); peaks are derived from that same buffer instead
      // of decoding the file a second time just for the waveform.
      const buffer = await audioEngine.loadFromArrayBuffer(arrayBuffer, () => usePlaybackStore.getState().stop());
      const peaks = computePeaksFromBuffer(buffer);
      await saveAudioBlob(file.name, file);
      setAudio({
        sourceUrl: null,
        fileName: file.name,
        duration: buffer.duration,
        offset: 0,
        waveformPeaks: peaks,
        trimStart: 0,
        trimEnd: null,
      });
    } catch {
      window.alert('Could not read this audio file. Try a standard MP3 or WAV.');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleRemove = () => {
    audioEngine.clear();
    void clearAudioBlob();
    setAudio({
      sourceUrl: null,
      fileName: null,
      duration: null,
      offset: 0,
      waveformPeaks: null,
      trimStart: 0,
      trimEnd: null,
    });
  };

  return (
    <div className="audio-import">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      {audio.fileName ? (
        <>
          <Icon name="music" size={12} />
          <span className="audio-import__name" title={audio.fileName}>
            {audio.fileName}
          </span>
          <IconButton icon="trash" label="Remove Audio" onClick={handleRemove} />
        </>
      ) : (
        <button
          type="button"
          className="audio-import__button"
          disabled={isDecoding}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="music" size={12} />
          {isDecoding ? 'Decoding…' : 'Import Audio'}
        </button>
      )}
    </div>
  );
}
