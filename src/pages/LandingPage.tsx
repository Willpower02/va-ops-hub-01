import { useState } from 'react';
import { Users, Clock, CheckCircle, Zap, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
}

function AnimatedDashboardPreview() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow backdrop */}
      <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />

      <div className="relative glass-card rounded-2xl p-4 border border-border/30 space-y-3 animate-fade-in">
        {/* Header bar */}
        <div className="flex items-center gap-2 pb-2 border-b border-border/30">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-[10px]">VA</span>
          </div>
          <span className="text-xs font-semibold text-foreground">Live Dashboard</span>
          <div className="ml-auto flex gap-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-muted-foreground">3 active</span>
          </div>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Active', value: '3', color: 'text-success', dot: 'status-dot-active' },
            { label: 'Tasks', value: '12', color: 'text-primary', dot: '' },
            { label: 'Tracked', value: '6h 42m', color: 'text-primary', dot: '' },
          ].map((s, i) => (
            <div key={s.label} className="bg-secondary/40 rounded-xl p-2.5 animate-fade-in" style={{ animationDelay: `${(i + 1) * 150}ms`, animationFillMode: 'both' }}>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold ${s.color} ${s.label === 'Tracked' ? 'timer-digits' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Team member rows */}
        <div className="space-y-2">
          {[
            { name: 'Sarah K.', task: 'Client onboarding flow', time: '1:23:45', status: 'active' },
            { name: 'Mike R.', task: 'Email campaign draft', time: '0:45:12', status: 'active' },
            { name: 'Ana L.', task: 'Social media posts', time: '—', status: 'paused' },
          ].map((m, i) => (
            <div
              key={m.name}
              className="flex items-center gap-2.5 bg-secondary/30 rounded-xl px-3 py-2 border border-border/20 animate-fade-in"
              style={{ animationDelay: `${(i + 3) * 150}ms`, animationFillMode: 'both' }}
            >
              <span className={`status-dot-${m.status}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{m.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.task}</p>
              </div>
              <span className={`text-xs font-bold ${m.status === 'active' ? 'timer-glow text-success' : 'text-muted-foreground timer-digits'}`}>
                {m.time}
              </span>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div className="flex items-end gap-1 h-10 px-1 animate-fade-in" style={{ animationDelay: '900ms', animationFillMode: 'both' }}>
          {[35, 55, 40, 70, 60, 85, 50].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-all ${i === 5 ? 'bg-primary glow-border' : 'bg-primary/20'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, hsl(216 55% 6%) 0%, hsl(215 50% 12%) 40%, hsl(217 45% 10%) 100%)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
            <span className="text-primary font-bold text-sm">VA</span>
          </div>
          <span className="font-bold text-foreground text-xl tracking-tight">VA Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onGetStarted} className="text-muted-foreground hover:text-foreground">
            Sign In
          </Button>
          <Button onClick={onGetStarted} className="bg-primary hover:bg-primary/90 glow-border transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            Start Free Trial
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-12 md:pt-20 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Real-time team tracking</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
              Track Your Team's{' '}
              <span className="gradient-text">Productivity</span>{' '}
              in Real Time
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Monitor virtual assistants, track time on tasks, and get actionable insights — all from one{' '}
              <span className="text-foreground font-medium">beautiful dashboard</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base glow-border transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] group"
              >
                Start 7-Day Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/50 text-foreground hover:bg-secondary hover:border-border font-semibold px-8 h-12 text-base transition-all duration-300 hover:scale-[1.02]"
              >
                See Pricing
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> SOC 2 ready</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Unlimited VAs</span>
            </div>
          </div>

          {/* Right: Dashboard preview */}
          <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <AnimatedDashboardPreview />
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-t border-border/20 px-6 md:px-12 py-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-10 uppercase tracking-widest font-medium">Everything you need</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Clock, title: 'Live Time Tracking', desc: 'Real-time timers with idle detection and automatic status updates.' },
              { icon: Users, title: 'Team Management', desc: 'Organize VAs by role, monitor workloads, and assign tasks instantly.' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Weekly productivity charts, leaderboards, and CSV exports.' },
              { icon: Zap, title: 'Instant Alerts', desc: 'Get notified when team members go idle or tasks are completed.' },
            ].map((f, i) => (
              <div
                key={f.title}
                className="glass-card rounded-2xl p-5 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
                style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: 'both' }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
