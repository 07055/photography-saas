"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How do I upload photos?",
    a: "Go to the Upload page, select your photos (up to 50 at a time), optionally set a title and price per photo, then click 'Upload & Get Share Link'. Photos are uploaded directly to Cloudinary.",
  },
  {
    q: "How do I share photos with clients?",
    a: "After uploading, you'll get a share link. Send it to your client. The link expires in 7 days. Clients can view watermarked previews and purchase individual photos.",
  },
  {
    q: "How do clients purchase photos?",
    a: "Clients open the share link, select the photos they want, and pay via card or M-Pesa through Paystack. Once paid, they can download the original high-res files.",
  },
  {
    q: "How do I get paid?",
    a: "Set up your M-Pesa number in Settings. After each sale, your earnings are automatically sent to your M-Pesa — no minimum threshold, no waiting for manual payouts.",
  },
  {
    q: "What are the fees?",
    a: "A 2% service fee is added to the client's total. A 0.5% fee is deducted from your payout to cover Paystack processing. You receive your price minus 0.5%.",
  },
  {
    q: "How do I set up M-Pesa for payouts?",
    a: "Go to Settings and enter your M-Pesa phone number and the name on the account. Once saved, your storage limit is unlocked and earnings are auto-sent after each sale.",
  },
  {
    q: "How does the Marketplace work?",
    a: "The Marketplace is for buying and selling photography gear and services. Post an ad with photos, price, and contact info. It's free to post.",
  },
  {
    q: "How do I create an album?",
    a: "Go to 'New Album' from the dashboard, give it a name and optional description. You can make it public so clients can browse and purchase without a share link.",
  },
  {
    q: "What file types are supported?",
    a: "JPEG, PNG, WebP, GIF, TIFF, and AVIF images are supported. Video support is coming soon.",
  },
  {
    q: "How do I download purchased photos?",
    a: "After a client completes payment, they're redirected to a download page where they can download each original high-res photo they purchased.",
  },
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-80 sm:w-96 max-h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">LinkLense Help</p>
              <p className="text-blue-100 text-xs">Frequently asked questions</p>
            </div>
            <button
              onClick={() => { setOpen(false); setSelected(null); }}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selected === null ? (
              <div className="divide-y divide-card-border">
                {faqs.map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className="w-full text-left px-5 py-3 text-sm text-card-foreground hover:bg-surface-muted transition-colors"
                  >
                    {faq.q}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 mb-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to questions
                </button>
                <p className="font-medium text-card-foreground mb-2">{faqs[selected].q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faqs[selected].a}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
