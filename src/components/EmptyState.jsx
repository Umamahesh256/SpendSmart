export default function EmptyState({ 
  icon: Icon, 
  title, 
  message, 
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5 relative group">
        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-xl group-hover:bg-primary/20 transition-all"></div>
        <Icon size={40} className="text-primary relative z-10" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-xl font-bold text-text mb-2">{title}</h3>
      <p className="text-muted text-sm max-w-[280px] leading-relaxed mb-8">
        {message}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
