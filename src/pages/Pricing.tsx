import { Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STARTER_CHECKOUT_URL = 'https://whop.com/va-tracker/starter-88';
const PRO_CHECKOUT_URL = 'https://whop.com/va-tracker/pro-e1-9109';

const plans = [
  {
    name: 'Starter',
    price: 15,
    popular: false,
    checkoutUrl: STARTER_CHECKOUT_URL,
    features: [
      'Up to 3 VAs',
      'Task management + timers',
      'Basic reports',
    ],
  },
  {
    name: 'Pro',
    price: 45,
    popular: true,
    checkoutUrl: PRO_CHECKOUT_URL,
    features: [
      'Unlimited VAs',
      'All Starter features',
      'Daily Journal',
      'Advanced reports',
      'Priority support',
    ],
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('reason') === 'expired';

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">VA</span>
          </div>
          <span className="font-bold text-foreground text-xl tracking-tight">VA Tracker</span>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          ← Back
        </Button>
      </nav>

      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        {isExpired && (
          <div className="max-w-3xl mx-auto mb-8 flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-foreground">Your subscription has expired. Choose a plan to continue.</p>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground">Start with a 7-day free trial. No credit card required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.popular
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/50 bg-card'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h2 className="text-xl font-bold text-foreground mb-1">{plan.name}</h2>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => window.open(plan.checkoutUrl, '_blank')}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
