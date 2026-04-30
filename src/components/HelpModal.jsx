import { X, LayoutDashboard, ArrowRightLeft, Target, Users, Shield, Sparkles, PieChart } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const sections = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: 'View your total balance, recent transactions, and spending insights. See how your spending compares to last week.'
    },
    {
      icon: ArrowRightLeft,
      title: 'Transactions',
      desc: 'Log your daily income and expenses. Categorize them to track where your money goes. Use the "Other" category for unique expenses.'
    },
    {
      icon: Target,
      title: 'Budgets',
      desc: 'Set monthly spending limits for different categories. We will notify you when you are close to your limit.'
    },
    {
      icon: Users,
      title: 'Groups & Splitting',
      desc: 'Create or join groups to track shared expenses with roommates or friends. When adding a group expense, use the "Split" option to divide the cost among specific members.'
    },
    {
      icon: Shield,
      title: 'Admin Panel',
      desc: 'If you are an admin, you can manage groups, invite new members via email or link, and oversee all group activities.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="glass w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/20">
              <PieChart size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">How to use SpendSmart</h2>
              <p className="text-muted text-sm font-medium">Your guide to financial clarity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-full hover:bg-white/10 text-muted hover:text-text transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-start gap-4">
            <div className="p-2 bg-primary/20 rounded-xl text-primary mt-1">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Welcome! Let's get started.</h3>
              <p className="text-sm text-muted leading-relaxed">
                SpendSmart is designed to be simple but powerful. Start by adding your first transaction or creating a group to track expenses with others.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {sections.map((s, i) => (
              <div key={i} className="group p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <s.icon size={24} />
                </div>
                <h4 className="text-lg font-bold mb-2">{s.title}</h4>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="font-bold mb-4">Quick Tips:</h4>
            <ul className="space-y-3">
              {[
                'Use the search bar in Transactions to find specific items.',
                'Invite roommates via the Group Room to start sharing costs.',
                'Check your Dashboard daily for personalized spending insights.',
                'Set up budgets for your biggest spending categories first.'
              ].map((tip, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-primary hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
