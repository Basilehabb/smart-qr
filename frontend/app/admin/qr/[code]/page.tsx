"use client";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";


export default function SmartCodePage({ params }: any) {
  const qrCode = params.code;
  const targetURL = `https://loly-for-accessories.vercel.app/qr/${qrCode}`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, targetURL, {
        width: 300,
        margin: 2,
        color: {
          dark: "#4F46E5",
          light: "#FFFFFF",
        },
      }).then(() => setQrGenerated(true));
    }
  }, [targetURL]);

  const publicQRURL = `/qr/${qrCode}`;

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement("a");
      link.download = `QR-${qrCode}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const openNFCTools = () => {
    // محاولة فتح التطبيق مباشرة
    window.location.href = `nfctools://write?url=${encodeURIComponent(targetURL)}`;
    
    // لو التطبيق مش مثبت، فتح Play Store بعد 1.5 ثانية
    setTimeout(() => {
      window.open('https://play.google.com/store/apps/details?id=com.wakdev.wdnfc', '_blank');
    }, 1500);
  };

  const copyURL = () => {
    navigator.clipboard.writeText(targetURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQR = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            📱 Smart Code Generator
          </h1>
          <p className="text-gray-600">QR Code: <code className="bg-white px-3 py-1 rounded text-indigo-600 font-mono">{qrCode}</code></p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* QR Code Section */}
          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-2xl font-bold text-gray-800">QR Code</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              امسح الكود من أي موبايل - يشتغل على iOS و Android
            </p>

            {/* QR Canvas */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl mb-4 flex justify-center items-center min-h-[320px]">
              {!qrGenerated && (
                <div className="text-center">
                  <div className="animate-spin text-4xl mb-2">⏳</div>
                  <p className="text-gray-600">جاري إنشاء QR Code...</p>
                </div>
              )}
              <canvas 
                ref={canvasRef} 
                className={qrGenerated ? "opacity-100 transition-opacity duration-500" : "opacity-0"}
              />
            </div>

            {/* QR Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={downloadQR}
                disabled={!qrGenerated}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">💾</span>
                تحميل
              </button>
              <button
                onClick={printQR}
                disabled={!qrGenerated}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">🖨️</span>
                طباعة
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 نصيحة:</p>
              <p className="text-xs">اطبع QR Code على استيكر أو ورق ولزقه - أسهل وأرخص من NFC!</p>
            </div>
          </div>

          {/* NFC Section */}
          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📱</span>
              <h2 className="text-2xl font-bold text-gray-800">NFC Tag</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              اكتب الرابط على بطاقة NFC باستخدام تطبيق مجاني
            </p>

            {/* NFC Illustration */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl mb-4 text-center min-h-[320px] flex flex-col justify-center">
              <div className="text-6xl mb-4 animate-pulse">📲</div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">NFC Tools App</h3>
              <p className="text-sm text-gray-600 mb-4">تطبيق مجاني لكتابة بطاقات NFC</p>
              
              <div className="space-y-2 text-xs text-left bg-white/80 p-4 rounded-lg">
                <p className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>مجاني بالكامل</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>سهل الاستخدام</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>يدعم كل أنواع بطاقات NFC</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>أكثر من 10 مليون تحميل</span>
                </p>
              </div>
            </div>

            {/* NFC Action */}
            <button
              onClick={openNFCTools}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg"
            >
              <span className="text-2xl">📲</span>
              فتح NFC Tools
            </button>

            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
              <p className="font-semibold mb-2">📝 الخطوات:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>اضغط على زر "فتح NFC Tools"</li>
                <li>لو التطبيق مش مثبت، هيفتح Play Store</li>
                <li>في التطبيق: Write → Add Record → URL</li>
                <li>الصق الرابط من الأسفل</li>
                <li>قرّب بطاقة NFC واكتب</li>
              </ol>
            </div>
          </div>
        </div>

        {/* URL Section */}
        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔗</span>
            <h2 className="text-2xl font-bold text-gray-800">الرابط</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={targetURL}
            readOnly
            className="flex-1 border-2 border-gray-200 px-4 py-3 rounded-xl bg-gray-50 text-sm font-mono focus:outline-none focus:border-indigo-400"
          />

          <button
            onClick={copyURL}
            className={`px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
              copied
                ? "bg-green-500 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {copied ? "✓ تم النسخ" : "📋 نسخ"}
          </button>

          <a
            href={`/qr/${qrCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🌍 فتح صفحة QR
          </a>
        </div>


          <p className="text-xs text-gray-500 mt-3 text-center">
            انسخ هذا الرابط والصقه في تطبيق NFC Tools
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-xl text-white">
          <h3 className="text-2xl font-bold mb-4 text-center">⚖️ المقارنة</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <span>📊</span> QR Code
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>يشتغل على أي موبايل</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>مجاني - اطبعه على ورق</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>يدعم iOS و Android</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300">⚠</span>
                  <span>محتاج يفتح الكاميرا</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur p-4 rounded-xl">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <span>📱</span> NFC Tag
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>سريع جداً - لمسة واحدة</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>أنيق ومحترف</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300">⚠</span>
                  <span>محتاج بطاقات NFC (~$0.50)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300">⚠</span>
                  <span>Android فقط (غالباً)</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center mt-4 text-sm opacity-90">
            💡 <strong>نصيحة:</strong> استخدم QR Code للبداية - أسهل وأرخص!
          </p>
        </div>

      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          canvas, canvas * {
            visibility: visible;
          }
          canvas {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}