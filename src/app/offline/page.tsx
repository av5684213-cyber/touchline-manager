"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center text-white p-8 text-center">
      <div className="text-6xl mb-4">⚽</div>
      <h1 className="text-2xl font-bold mb-2">İnternet Bağlantısı Yok</h1>
      <p className="text-white/60 text-sm">
        Touchline Manager çevrimiçi bir oyundur.<br />
        Bağlantın tekrar sağlandığında devam edebilirsin.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-3 bg-emerald-600 rounded-xl text-sm font-medium"
      >
        Yeniden Dene
      </button>
    </div>
  );
}
