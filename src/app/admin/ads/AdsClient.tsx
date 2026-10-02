"use client";

import { useState } from "react";
import { toggleAd, deleteAd, createAd } from "./actions";
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, Link as LinkIcon, Video } from "lucide-react";

export default function AdsClient({ ads }: { ads: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle(id: string, currentState: boolean) {
    setIsLoading(true);
    await toggleAd(id, !currentState);
    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this ad?")) {
      setIsLoading(true);
      await deleteAd(id);
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)] text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-300 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Advertisement
        </button>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 p-5 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <h2 className="text-2xl font-extrabold text-navy dark:text-white mb-6 tracking-tight">Create Advertisement</h2>
          <form
            action={async (formData) => {
              setIsLoading(true);
              await createAd(formData);
              setIsCreating(false);
              setIsLoading(false);
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-bold text-navy dark:text-white mb-2">Title (Internal Reference)</label>
              <input name="title" required className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-navy dark:text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors shadow-sm" placeholder="e.g. Summer Law Prep Ad" />
            </div>

            <div>
              <label className="block text-sm font-bold text-navy dark:text-white mb-1">Media URL</label>
              <p className="text-xs text-text-muted mb-3 font-medium">Provide a direct link to an image, gif, or video. You can upload media to any hosting service and paste the link here.</p>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
                <input name="mediaUrl" required type="url" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-navy dark:text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors shadow-sm" placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy dark:text-white mb-1">Destination Link URL (Optional)</label>
              <p className="text-xs text-text-muted mb-3 font-medium">Where should the user go when they click the ad?</p>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
                <input name="linkUrl" type="url" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-navy dark:text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors shadow-sm" placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy dark:text-white mb-2">Media Type</label>
              <select name="mediaType" className="w-full bg-slate-50 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-navy dark:text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors shadow-sm">
                <option value="IMAGE">Image</option>
                <option value="GIF">GIF</option>
                <option value="VIDEO">Video (MP4)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-6 py-2.5 rounded-xl text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-accent text-white font-bold hover:bg-accent/90 transition-all duration-300 disabled:opacity-50 shadow-[0_4px_14px_0_rgba(var(--color-accent),0.39)]"
              >
                {isLoading ? "Saving..." : "Save Advertisement"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 mt-8">
        {ads.map(ad => (
          <div key={ad.id} className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg gap-4 sm:gap-0 ${ad.isActive ? 'border-green-500/30 bg-green-50/50 dark:bg-green-900/10 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full sm:w-auto">
              <div className="w-20 h-14 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {ad.mediaType === "VIDEO" ? (
                  <Video className="w-6 h-6 text-text-muted" />
                ) : (
                  <img src={ad.mediaUrl} alt="ad thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-navy dark:text-white flex items-center gap-3 text-lg tracking-tight">
                  {ad.title}
                  {ad.isActive && <span className="bg-green-500 text-white text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold shadow-sm flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Active</span>}
                </h3>
                <div className="text-xs text-text-secondary mt-1.5 flex items-center gap-3 font-medium">
                  <span className="bg-slate-100 dark:bg-zinc-800 text-text-muted px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">{ad.mediaType}</span>
                  {ad.linkUrl ? <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent truncate max-w-[200px] flex items-center gap-1 transition-colors"><LinkIcon className="w-3 h-3"/> {ad.linkUrl}</a> : <span className="flex items-center gap-1 opacity-50"><LinkIcon className="w-3 h-3"/> No Link</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-black/5 dark:border-white/5">
              <button
                onClick={() => handleToggle(ad.id, ad.isActive)}
                disabled={isLoading}
                className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all duration-300 ${ad.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} hover:scale-105 active:scale-95`}
                title={ad.isActive ? "Deactivate Ad" : "Set as Active Ad"}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(ad.id)}
                disabled={isLoading}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Delete Ad"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {ads.length === 0 && !isCreating && (
          <div className="text-center py-20 px-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-black/5 dark:border-white/5 rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-10 h-10 text-accent/50" />
            </div>
            <h3 className="text-xl font-extrabold text-navy dark:text-white tracking-tight mb-2">No Advertisements</h3>
            <p className="text-text-secondary font-medium">Click "Add New Advertisement" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
