export default function ChickenLoader() {
  return (
    <div className="flex flex-col items-center gap-3">
      <style>{`
        @keyframes chicken-walk {
          0%   { transform: translateY(0px) rotate(-4deg); }
          25%  { transform: translateY(-10px) rotate(0deg); }
          50%  { transform: translateY(0px) rotate(4deg); }
          75%  { transform: translateY(-6px) rotate(0deg); }
          100% { transform: translateY(0px) rotate(-4deg); }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .chicken-walk { animation: chicken-walk 0.8s ease-in-out infinite; }
        .dot1 { animation: dot-pulse 1.2s ease-in-out infinite 0s; }
        .dot2 { animation: dot-pulse 1.2s ease-in-out infinite 0.2s; }
        .dot3 { animation: dot-pulse 1.2s ease-in-out infinite 0.4s; }
      `}</style>
      <img src="/logo.png" alt="loading" className="chicken-walk" style={{ width: 80, height: 80, objectFit: 'contain' }} />
      <div className="flex gap-1.5">
        <div className="dot1 w-2 h-2 rounded-full" style={{ background: '#4a2728' }} />
        <div className="dot2 w-2 h-2 rounded-full" style={{ background: '#4a2728' }} />
        <div className="dot3 w-2 h-2 rounded-full" style={{ background: '#4a2728' }} />
      </div>
    </div>
  )
}
