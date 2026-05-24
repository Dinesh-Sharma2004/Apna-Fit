import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, Plus } from "lucide-react";
import { Product } from "../types";

interface GeminiStylistProps {
  products: Product[];
  onAddToCart: (product: Product, size: string) => void;
}

export default function GeminiStylist({ products, onAddToCart }: GeminiStylistProps) {
  const [personality, setPersonality] = useState("Minimalist Scholar");
  const [vibe, setVibe] = useState("Architectural streetwear with zero noise");
  const [colorPref, setColorPref] = useState("Neutrals, Bone, or Sand Sage");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [addedMessage, setAddedMessage] = useState("");

  const personalities = [
    {
      name: "Minimalist Scholar",
      desc: "Appreciates classic silhouettes, structural cotton, and bone white shades with zero branding footprint.",
      vibe: "Sophisticated quiet luxury"
    },
    {
      name: "Cyber Street Rebel",
      desc: "Loves tactical details, heavy-gauge fabrics, double-faced cuts, and dark aesthetic obsidian with gold insignia.",
      vibe: "Futuristic conceptual streetwear"
    },
    {
      name: "Editorial Purist",
      desc: "High fashion collector, loves dramatic drapes, heavy terry fabrics, drop shoulders, and organic sage dyes.",
      vibe: "Avant-garde runway drape aesthetic"
    }
  ];

  const handleConsultStylist = async () => {
    setLoading(true);
    setAdvice(null);
    setRecommendedIds([]);

    try {
      const res = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality,
          vibe,
          colorPreference: colorPref
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAdvice(data.stylistReply);
        setRecommendedIds(data.recommendedProductIds || []);
      } else {
        setAdvice("Our AI Fashion Director is managing severe traffic. They recommend sticking to the Bone Minimalist; its 400GSM cotton commands respect anywhere.");
      }
    } catch {
      setAdvice("Could not request the luxury director servers. Have you initialized your secret API keys in the AI Studio panel?");
    } finally {
      setLoading(false);
    }
  };

  const matchedProducts = products.filter((p) => recommendedIds.includes(p.id));

  return (
    <div className="w-full max-w-4xl mx-auto glass-card p-6 sm:p-10 text-on-surface font-body-md rounded overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Sparkles className="w-32 h-32 text-secondary" style={{ filter: "blur(20px)" }} />
      </div>

      <div className="text-center space-y-4 max-w-xl mx-auto mb-10">
        <span className="font-label-caps text-[10px] text-secondary tracking-[0.4em] uppercase flex items-center justify-center gap-1.5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          AI Styled Narrative
        </span>
        <h2 className="font-display-lg text-3xl sm:text-4xl text-on-surface uppercase tracking-tight">
          Consult the Director
        </h2>
        <p className="text-sm text-on-surface-variant">
          Discover a custom apparel recommendation aligned with your design persona and physical preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Side: Persona Selection Grid */}
        <div className="md:col-span-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase font-semibold">
              1. Choose your custom streetwear persona
            </label>
            <div className="space-y-3">
              {personalities.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setPersonality(item.name);
                    setVibe(item.vibe);
                  }}
                  className={`w-full text-left p-4 rounded border transition-all duration-300 ${
                    personality === item.name
                      ? "border-secondary bg-secondary/5 text-on-surface"
                      : "border-outline-variant/20 hover:border-outline/40 bg-background/20 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold tracking-wide uppercase font-label-caps text-secondary">
                      {item.name}
                    </span>
                    {personality === item.name && (
                      <span className="w-2 h-2 bg-secondary rounded-full animate-ping" />
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-label-caps text-outline tracking-wider uppercase font-semibold">
                2. Design Preferences or Aesthetic search
              </label>
              <input
                type="text"
                value={colorPref}
                onChange={(e) => setColorPref(e.target.value)}
                placeholder="e.g. Earthy Sage-green shades, dropped shoulders"
                className="w-full bg-background/50 border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <button
            onClick={handleConsultStylist}
            disabled={loading}
            className="w-full py-4 bg-secondary text-on-secondary font-label-caps uppercase tracking-widest text-xs font-bold hover:bg-secondary/95 active:scale-95 duration-200 transition-all rounded shimmer-trigger flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-on-secondary" />
                Curating Fabric Matrices...
              </>
            ) : (
              <>
                Consult Fashion Director
                <ArrowRight className="w-4 h-4 text-on-secondary" />
              </>
            )}
            <div className="shimmer-layer" />
          </button>
        </div>

        {/* Right Side: Narrative Display Output from Gemini */}
        <div className="md:col-span-6 flex flex-col justify-between p-6 bg-background/40 border border-outline-variant/10 rounded min-h-[300px]">
          <div className="space-y-4">
            <h4 className="text-[10px] font-label-caps text-outline tracking-widest uppercase pb-2 border-b border-outline-variant/10">
              DIRECTOR'S EDITORIAL MEMORANDUM
            </h4>

            {advice ? (
              <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant font-body-md animate-[fadeIn_0.5s_ease-out]">
                {advice.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col justify-center items-center text-center text-outline/50 space-y-3">
                <Sparkles className="w-10 h-10 stroke-[1]" />
                <p className="text-xs uppercase tracking-widest">Awaiting curation parameters...</p>
              </div>
            )}
          </div>

          {/* Matches suggestions products directly */}
          {matchedProducts.length > 0 && (
            <div className="pt-6 border-t border-outline-variant/10 mt-6 animate-[fadeIn_0.5s_ease-out]">
              <p className="text-[10px] font-label-caps text-secondary tracking-wider uppercase mb-3 font-semibold">
                Director's Curation choices:
              </p>
              <div className="space-y-3">
                {matchedProducts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 rounded bg-background/60 border border-outline-variant/5">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-12 object-cover rounded" />
                      <div>
                        <p className="text-xs font-semibold text-on-surface uppercase">{p.name}</p>
                        <p className="text-[10px] text-outline">{p.gsm}GSM | ₹{p.price.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const suggestedSize = p.sizes.includes("M") ? "M" : p.sizes[0];
                        onAddToCart(p, suggestedSize);
                        setAddedMessage(`Successfully added ${p.name} (Size ${suggestedSize}) to Active Bag!`);
                        setTimeout(() => setAddedMessage(""), 3000);
                      }}
                      disabled={p.stock <= 0 || p.sizes.length === 0}
                      className="p-2 border border-outline-variant hover:border-secondary text-outline hover:text-secondary rounded transition-all active:scale-95 duration-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {addedMessage && (
                <p className="text-xs text-secondary mt-2 text-center">{addedMessage}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
