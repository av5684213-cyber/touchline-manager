"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, ArrowLeft, Send, Loader2, Trash2, WifiOff, Flag, Pencil, Check, X } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";
import { useI18n } from "@/lib/i18n/locale-provider";

type ForumTopic = {
  id: string;
  author_id: string;
  author_team_name: string;
  author_team_short: string;
  author_team_color: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  reply_count: number;
};

type ForumReply = {
  id: string;
  topic_id: string;
  author_id: string;
  author_team_name: string;
  author_team_short: string;
  author_team_color: string;
  body: string;
  created_at: string;
};

// v2.9.66: Etiketler artık i18n üzerinden geliyor (labelKey → t())
const CATEGORIES = [
  { id: "general", labelKey: "forum.category_general", icon: "💬" },
  { id: "transfer", labelKey: "forum.category_transfer", icon: "🔄" },
  { id: "tactics", labelKey: "forum.category_tactics", icon: "📋" },
  { id: "match", labelKey: "forum.category_match", icon: "⚽" },
  { id: "trade", labelKey: "forum.category_trade", icon: "🤝" },
  { id: "trash", labelKey: "forum.category_chat", icon: "🎤" },
];

export function ForumScreen() {
  const { t } = useI18n();
  const { user } = useSupabaseAuth();
  const myTeam = useMyTeam();
  // v2.9.48: Forum'da takım logosu göstermek için clubs
  const clubs = useAppStore((s) => s.clubs);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // v2.9.47 Faz 2: Geliştirici Modu kontrolü — Supabase bağlı mı?
  const supabaseReady = isSupabaseConfigured();

  const loadTopics = useCallback(async () => {
    // Geliştirici Modu: Supabase yoksa boş liste dön, loading'i kapat
    if (!supabaseReady) {
      setTopics([]);
      setLoading(false);
      return;
    }
    try {
      let query = supabase
        .from("forum_topics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("[forum] load error:", error.message);
        setTopics([]);
        return;
      }
      setTopics(data ?? []);
    } catch (e) {
      console.warn("[forum] load exception:", e);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Realtime: yeni başlık gelirse yenile (sadece Supabase bağlıysa)
  useEffect(() => {
    if (!supabaseReady) return; // Geliştirici Modu: realtime'i atla
    const channel = supabase
      .channel("forum_topics_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_topics" }, () => {
        loadTopics();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "forum_topics" }, () => {
        loadTopics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadTopics, supabaseReady]);

  if (selectedTopic) {
    return (
      <TopicDetail
        topic={selectedTopic}
        userId={user?.id ?? null}
        myTeam={myTeam}
        onBack={() => { setSelectedTopic(null); loadTopics(); }}
      />
    );
  }

  if (showNewTopic) {
    return (
      <NewTopicForm
        userId={user?.id ?? null}
        myTeam={myTeam}
        onClose={() => setShowNewTopic(false)}
        onCreated={() => { setShowNewTopic(false); loadTopics(); }}
      />
    );
  }

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-indigo-900/20 to-purple-900/10 border-indigo-500/30">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={18} className="text-indigo-400" />
          <h1 className="text-base font-bold">{t("forum.title")}</h1>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {/* v2.9.74 FIX D11: "0 title" yerine "0 başlık" — i18n key düzelt */}
            {topics.length} {topics.length === 1 ? t("forum.topic") : t("forum.topics")}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Diğer menajerlerle sohbet et, başlık aç, cevap ver.
        </p>
      </div>

      {/* v2.9.47 Faz 2: Geliştirici Modu uyarısı
          v2.9.88 FIX (Madde 5): Production'da env var isimleri ifşa edilmiyor.
          Eski kod: "Supabase bağlanmadığı için forum kullanılamaz. .env dosyasına
          NEXT_PUBLIC_SUPABASE_URL ve ANON_KEY ekleyince aktif olur."
          Bu mesaj son kullanıcıya teknik detay sızdırıyordu + güvenlik açısından riskli.
          Yeni: NODE_ENV === 'development' ise detaylı mesaj, production'da generic "yakında". */}
      {!supabaseReady && (
        <div className="tm-card p-3 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-2">
            <WifiOff size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-amber-400 mb-0.5">
                {process.env.NODE_ENV === "development"
                  ? "Forum Geliştirici Modu'nda devre dışı"
                  : "Forum yakında aktif olacak"}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {process.env.NODE_ENV === "development"
                  ? "Supabase bağlanmadığı için forum kullanılamaz. .env dosyasına NEXT_PUBLIC_SUPABASE_URL ve ANON_KEY ekleyince aktif olur."
                  : "Forum özelliği şu anda bakımda. En kısa sürede tekrar hizmetinizde olacak."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Yeni başlık butonu — sadece Supabase bağlı + kullanıcı giriş yapmışsa */}
      {supabaseReady && (
        <button
          onClick={() => { haptic("light"); setShowNewTopic(true); }}
          disabled={!user || !myTeam}
          className="tm-tap w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Plus size={14} /> {t("forum.new_topic")}
        </button>
      )}

      {/* Kategori filtre — sadece Supabase bağlıysa göster */}
      {supabaseReady && (
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        <button
          onClick={() => { haptic("light"); setFilterCategory("all"); }}
          className={cn(
            "tm-tap px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border",
            filterCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
          )}
        >
          {t("forum.all")}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { haptic("light"); setFilterCategory(cat.id); }}
            className={cn(
              "tm-tap px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border",
              filterCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
            )}
          >
            {cat.icon} {t(cat.labelKey)}
          </button>
        ))}
      </div>
      )}

      {/* Başlık listesi — sadece Supabase bağlıysa göster */}
      {supabaseReady && (
      <>
      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : topics.length === 0 ? (
        <div className="tm-card p-8 text-center">
          <MessageSquare size={32} className="text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-bold text-muted-foreground mb-1">{t("forum.no_topics")}</p>
          <p className="text-[11px] text-muted-foreground">{t("forum.be_first")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => {
            const cat = CATEGORIES.find(c => c.id === topic.category);
            // v2.9.48: Forum'da takım logosu göster — clubs'tan bul
            const authorTeam = clubs.find(c => c.id === topic.author_id || c.name === topic.author_team_name);
            return (
              <button
                key={topic.id}
                onClick={() => { haptic("light"); setSelectedTopic(topic); }}
                className="tm-tap w-full text-left tm-card p-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden"
                    style={{ background: topic.author_team_color || "#1a3a2a" }}
                  >
                    {authorTeam?.logoUrl ? (
                      <img src={authorTeam.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      topic.author_team_short?.slice(0, 3) ?? "???"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {cat && <span className="text-[10px]">{cat.icon}</span>}
                      <span className="text-xs font-bold truncate">{topic.title}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{topic.body}</div>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                      <span>{topic.author_team_name ?? "Anonim"}</span>
                      <span>·</span>
                      <span>{timeAgo(topic.created_at, t)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare size={9} /> {topic.reply_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!user && supabaseReady && (
        <div className="tm-card p-3 text-center text-[10px] text-amber-400 bg-amber-500/10 border-amber-500/30">
          Forum kullanmak için giriş yapmalısın.
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ============================================================================
// Yeni Başlık Formu
// ============================================================================

function NewTopicForm({
  userId,
  myTeam,
  onClose,
  onCreated,
}: {
  userId: string | null;
  myTeam: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId || !myTeam) return;
    if (title.trim().length < 3) {
      setError(t("forum.title_min"));
      return;
    }
    if (body.trim().length < 5) {
      setError(t("forum.message_min"));
      return;
    }
    // v2.9.65: Küfür/spam filtresi
    const { validateForumContent } = await import("@/lib/name-validator");
    const titleCheck = validateForumContent(title);
    if (!titleCheck.valid) {
      setError(titleCheck.message ?? "Başlık reddedildi.");
      return;
    }
    const bodyCheck = validateForumContent(body);
    if (!bodyCheck.valid) {
      setError(bodyCheck.message ?? "Mesaj reddedildi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from("forum_topics")
        .insert({
          author_id: userId,
          author_team_name: myTeam.name,
          author_team_short: myTeam.shortName,
          author_team_color: myTeam.primaryColor,
          title: title.trim().slice(0, 120),
          body: body.trim().slice(0, 500),
          category,
        });
      if (insertErr) {
        // v2.9.53: Rate-limit hatasını kullanıcı dostu mesaja çevir
        if (insertErr.message?.includes("Rate limit exceeded")) {
          setError("Çok hızlı gönderiyorsun, biraz bekle (30 saniye).");
        } else {
          setError(insertErr.message);
        }
        return;
      }
      haptic("success");
      onCreated();
    } catch (e: any) {
      setError(e?.message ?? "Başlık oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => { haptic("light"); onClose(); }} className="tm-tap p-1">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold">{t("forum.new_topic")}</h1>
      </div>

      {/* Kategori seçimi */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Kategori</label>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { haptic("light"); setCategory(cat.id); }}
              className={cn(
                "tm-tap px-2.5 py-1 rounded-full text-[10px] font-bold border",
                category === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
              )}
            >
              {cat.icon} {t(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Başlık */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">{t("forum.topic_title")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Başlığın ne olacak?"
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm"
        />
      </div>

      {/* Mesaj */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">{t("forum.message")}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Düşüncelerini yaz..."
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm resize-none"
        />
        <div className="text-[9px] text-muted-foreground text-right">{body.length}/500</div>
      </div>

      {error && <div className="text-[11px] text-red-400 text-center">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !title.trim() || !body.trim()}
        className="tm-tap w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {t("forum.create_topic")}
      </button>
    </div>
  );
}

// ============================================================================
// Başlık Detayı + Cevaplar
// ============================================================================

function TopicDetail({
  topic,
  userId,
  myTeam,
  onBack,
}: {
  topic: ForumTopic;
  userId: string | null;
  myTeam: any;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  // v2.9.74 FIX Y6: Topic edit state
  const [editingTopic, setEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState(topic.title);
  const [editBody, setEditBody] = useState(topic.body);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const cat = CATEGORIES.find(c => c.id === topic.category);

  const loadReplies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", topic.id)
        .order("created_at", { ascending: true })
        .limit(100); // v2.9.65: Cap — üstsüz büyümeyi önle
      if (error) {
        console.warn("[forum] replies error:", error.message);
        return;
      }
      setReplies(data ?? []);
    } catch (e) {
      console.warn("[forum] replies exception:", e);
    } finally {
      setLoading(false);
    }
  }, [topic.id]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  // Realtime: yeni cevap gelirse yenile
  useEffect(() => {
    const channel = supabase
      .channel(`forum_replies_${topic.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "forum_replies", filter: `topic_id=eq.${topic.id}` }, () => {
        loadReplies();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [topic.id, loadReplies]);

  const handleReply = async () => {
    if (!userId || !myTeam) return;
    if (replyText.trim().length < 2) return;
    // v2.9.65: Küfür/spam filtresi
    const { validateForumContent } = await import("@/lib/name-validator");
    const replyCheck = validateForumContent(replyText);
    if (!replyCheck.valid) {
      setReplyError(replyCheck.message ?? "Cevap reddedildi.");
      return;
    }
    setSubmitting(true);
    setReplyError(null);
    try {
      const { error } = await supabase
        .from("forum_replies")
        .insert({
          topic_id: topic.id,
          author_id: userId,
          author_team_name: myTeam.name,
          author_team_short: myTeam.shortName,
          author_team_color: myTeam.primaryColor,
          body: replyText.trim().slice(0, 500),
        });
      if (error) {
        // v2.9.53: Rate-limit hatasını kullanıcı dostu mesaja çevir
        if (error.message?.includes("Rate limit exceeded")) {
          setReplyError("Çok hızlı gönderiyorsun, biraz bekle (10 saniye).");
        } else {
          setReplyError(error.message);
        }
        console.warn("[forum] reply error:", error.message);
        return;
      }
      setReplyText("");
      haptic("success");
      loadReplies();
    } catch (e) {
      console.warn("[forum] reply exception:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (topic.author_id !== userId) return;
    if (!confirm(t("forum.delete_confirm"))) return;
    try {
      // v2.9.70: forum_replies zaten ON DELETE CASCADE — sadece topic'i sil
      await supabase.from("forum_topics").delete().eq("id", topic.id);
      haptic("success");
      onBack();
    } catch (e) {
      console.warn("[forum] delete exception:", e);
    }
  };

  // v2.9.74 FIX Y6: canEditTopic — 10 dakika içinde mi?
  const canEditTopic = (createdAt: string): boolean => {
    const created = new Date(createdAt).getTime();
    const tenMin = 10 * 60 * 1000;
    return Date.now() - created < tenMin;
  };

  // v2.9.74 FIX Y6: handleEditTopic — topic başlığı + body güncelle
  const handleEditTopic = async () => {
    if (topic.author_id !== userId) return;
    if (!editTitle.trim() || !editBody.trim()) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase
        .from("forum_topics")
        .update({ title: editTitle.trim(), body: editBody.trim() })
        .eq("id", topic.id);
      if (error) throw error;
      haptic("success");
      setEditingTopic(false);
      // Topic'i yeniden yükle (parent component yapacak)
      onBack();
    } catch (e: any) {
      console.warn("[forum] edit exception:", e);
      alert("Düzenleme hatası: " + (e?.message ?? e));
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <button onClick={() => { haptic("light"); onBack(); }} className="tm-tap p-1">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold truncate flex-1">{topic.title}</h1>
        {topic.author_id === userId && (
          <>
            {/* v2.9.74 FIX Y6: Edit butonu (10 dk pencere ile) */}
            {canEditTopic(topic.created_at) && (
              <button
                onClick={() => { haptic("light"); setEditingTopic(true); }}
                className="tm-tap p-1 text-sky-400"
                aria-label="Düzenle"
                title="Düzenle (10 dk içinde)"
              >
                <Pencil size={14} />
              </button>
            )}
            <button onClick={handleDeleteTopic} className="tm-tap p-1 text-red-400">
              <Trash2 size={14} />
            </button>
          </>
        )}
        {/* v2.9.70: Bildir butonu — başlık */}
        {topic.author_id !== userId && userId && (
          <button
            onClick={async () => {
              haptic("light");
              try {
                const { supabase } = await import("@/lib/supabase/client");
                await supabase().from("forum_reports").insert({
                  reporter_id: userId,
                  topic_id: topic.id,
                  reason: "inappropriate",
                });
                alert("Bildirildi. İnceleme yapılacak.");
              } catch (e: any) {
                if (e?.code === "23505") alert("Bu içeriği zaten bildirdiniz.");
                else alert("Bildirme hatası: " + (e?.message ?? "bilinmeyen"));
              }
            }}
            className="tm-tap p-1 text-amber-400/60"
            aria-label="Bildir"
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {/* Başlık içeriği */}
      <div className="tm-card p-3">
        <div className="flex items-start gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: topic.author_team_color || "#1a3a2a" }}
          >
            {topic.author_team_short?.slice(0, 3) ?? "???"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {cat && <span className="text-[10px]">{cat.icon}</span>}
              <span className="text-xs font-bold">{topic.author_team_name ?? "Anonim"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{timeAgo(topic.created_at, t)}</div>
            {/* v2.9.74 FIX Y6: Edit mode — input'lar görünsün */}
            {editingTopic ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={120}
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditTopic}
                    disabled={editSubmitting || !editTitle.trim() || !editBody.trim()}
                    className="tm-tap flex-1 py-1.5 rounded-md bg-sky-600 text-white text-[10px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Check size={12} /> Kaydet
                  </button>
                  <button
                    onClick={() => { setEditingTopic(false); setEditTitle(topic.title); setEditBody(topic.body); }}
                    className="tm-tap flex-1 py-1.5 rounded-md border border-border text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <X size={12} /> İptal
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs mt-1.5 leading-relaxed">{topic.body}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cevaplar */}
      <div className="text-[10px] text-muted-foreground uppercase font-bold">{t("forum.replies")} ({replies.length})</div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : replies.length === 0 ? (
        <div className="tm-card p-6 text-center text-[11px] text-muted-foreground">
          {t("forum.no_replies")}
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="tm-card p-2.5">
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ background: reply.author_team_color || "#1a3a2a" }}
                >
                  {reply.author_team_short?.slice(0, 3) ?? "???"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold">{reply.author_team_name ?? "Anonim"}</span>
                    <span className="text-[9px] text-muted-foreground">{timeAgo(reply.created_at, t)}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{reply.body}</p>
                </div>
                {reply.author_id === userId && (
                  <button
                    onClick={async () => {
                      await supabase.from("forum_replies").delete().eq("id", reply.id);
                      loadReplies();
                    }}
                    className="tm-tap p-1 text-red-400/60"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
                {/* v2.9.70: Bildir butonu — cevap */}
                {reply.author_id !== userId && userId && (
                  <button
                    onClick={async () => {
                      haptic("light");
                      try {
                        const { supabase } = await import("@/lib/supabase/client");
                        await supabase().from("forum_reports").insert({
                          reporter_id: userId,
                          reply_id: reply.id,
                          reason: "inappropriate",
                        });
                        alert("Bildirildi. İnceleme yapılacak.");
                      } catch (e: any) {
                        if (e?.code === "23505") alert("Bu içeriği zaten bildirdiniz.");
                        else alert("Bildirme hatası: " + (e?.message ?? "bilinmeyen"));
                      }
                    }}
                    className="tm-tap p-1 text-amber-400/60"
                    aria-label="Bildir"
                  >
                    <Flag size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cevap yazma */}
      {userId && myTeam ? (
        <>
        <div className="tm-card p-2.5 flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            maxLength={500}
            placeholder={t("forum.reply_placeholder")}
            onKeyDown={(e) => { if (e.key === "Enter" && !submitting) handleReply(); }}
            className="flex-1 px-2.5 py-2 rounded-lg bg-muted/30 border border-border text-xs"
          />
          <button
            onClick={handleReply}
            disabled={submitting || replyText.trim().length < 2}
            className="tm-tap px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
        {/* v2.9.53: Rate-limit / hata mesajı */}
        {replyError && (
          <div className="text-[10px] text-amber-400 text-center -mt-1">
            {replyError}
          </div>
        )}
        </>
      ) : (
        <div className="tm-card p-3 text-center text-[10px] text-amber-400 bg-amber-500/10">
          Cevap yazmak için giriş yapmalısın.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper: zaman formatı
// ============================================================================

// v2.9.66: timeAgo artık i18n üzerinden çeviri yapıyor (t parametresi)
function timeAgo(
  isoString: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return t("forum.now");
  if (diffMin < 60) return t("forum.min_ago", { n: diffMin });
  if (diffHour < 24) return t("forum.hour_ago", { n: diffHour });
  if (diffDay < 7) return t("forum.day_ago", { n: diffDay });
  return new Date(isoString).toLocaleDateString("tr-TR");
}
