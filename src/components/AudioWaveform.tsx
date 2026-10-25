import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream | null;
  color?: string;
  height?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  audioStream,
  color = '#00F5D4',
  height = 64,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    if (isRecording && audioStream) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source = audioContext.createMediaStreamSource(audioStream);
        source.connect(analyser);
      } catch (err) {
        console.warn('AudioContext init error:', err);
      }
    }

    let step = 0;

    const render = () => {
      step += 0.08;
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (!isRecording) {
        // Idle flat-line with subtle rhythmic glow
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 2;
        ctx.moveTo(0, h / 2);
        ctx.lineTo(width, h / 2);
        ctx.stroke();
        return;
      }

      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
      } else {
        // High-tech procedural harmonic waveform
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
        ctx.beginPath();

        const points = 48;
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const normalX = (i / points) * Math.PI * 4;
          const amp1 = Math.sin(normalX + step) * (h * 0.28);
          const amp2 = Math.cos(normalX * 1.5 - step * 1.2) * (h * 0.14);
          const envelope = Math.sin((i / points) * Math.PI); // Pinches ends
          const y = h / 2 + (amp1 + amp2) * envelope;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Second subtle accent wave
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 56, 92, 0.6)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#FF385C';
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const normalX = (i / points) * Math.PI * 3;
          const amp = Math.sin(normalX - step * 1.6) * (h * 0.18);
          const envelope = Math.sin((i / points) * Math.PI);
          const y = h / 2 + amp * envelope;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [isRecording, audioStream, color]);

  return (
    <div className="w-full relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-[#070D1E]/80 border border-slate-800/80 p-2 shadow-inner">
      <canvas
        ref={canvasRef}
        width={420}
        height={height}
        className="w-full max-w-md h-[64px]"
      />
      {isRecording && (
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-ping" />
          <span className="text-[11px] font-mono tracking-wider uppercase text-[#00F5D4] font-semibold">
            Streaming Multilingual Audio Intake...
          </span>
        </div>
      )}
    </div>
  );
};
