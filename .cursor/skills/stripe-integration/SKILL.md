# Stripe Integration Skill

Guide for working with Stripe payments and subscriptions in BMe.

## When to Use

Use this skill when:
- Implementing payment features
- Debugging subscription issues
- Adding new Stripe webhooks
- Testing payment flows

## Key Files

- `backend/src/routes/subscription.ts` - Subscription endpoints
- `backend/src/services/subscription.ts` - Subscription business logic
- `backend/src/models/subscription.ts` - Database operations (if exists)
- `frontend/src/features/subscription/` - Frontend subscription UI

## Stripe Flow Overview

```
User clicks "Upgrade" → Create Checkout Session → Redirect to Stripe
                                                        ↓
                                              User completes payment
                                                        ↓
Stripe sends webhook → Verify signature → Update user subscription
                                                        ↓
                                              User redirected back
```

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...      # API key
STRIPE_WEBHOOK_SECRET=whsec_...    # Webhook signature verification
STRIPE_PRICE_ID=price_...          # Pro subscription price ID
```

## Creating a Checkout Session

```typescript
// backend/src/routes/subscription.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/api/subscription/checkout', requireAuth, async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    customer_email: req.user.email,
    mode: 'subscription',
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    }],
    success_url: `${FRONTEND_URL}/settings?success=true`,
    cancel_url: `${FRONTEND_URL}/settings?canceled=true`,
    metadata: {
      userId: req.user.id,
    },
  });
  
  res.json({ url: session.url });
});
```

## Handling Webhooks

```typescript
// backend/src/routes/subscription.ts
router.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await activateSubscription(session.metadata.userId);
      break;
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await cancelSubscription(subscription.metadata.userId);
      break;
  }
  
  res.json({ received: true });
});
```

## Customer Portal

Allow users to manage their subscription:

```typescript
router.post('/api/subscription/portal', requireAuth, async (req, res) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${FRONTEND_URL}/settings`,
  });
  
  res.json({ url: session.url });
});
```

## Checking Subscription Status

```typescript
router.get('/api/subscription/status', requireAuth, async (req, res) => {
  const user = await getUser(req.user.id);
  
  res.json({
    status: user.subscriptionStatus, // 'free' | 'pro' | 'cancelled'
    expiresAt: user.subscriptionExpiresAt,
    canAccessPro: user.subscriptionStatus === 'pro',
  });
});
```

## Frontend Integration

```tsx
// frontend/src/features/subscription/UpgradeButton.tsx
export function UpgradeButton() {
  const { mutate: createCheckout, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/subscription/checkout');
      window.location.href = res.data.url;
    },
  });
  
  return (
    <Button onClick={() => createCheckout()} disabled={isPending}>
      {isPending ? 'Loading...' : 'Upgrade to Pro'}
    </Button>
  );
}
```

## Testing with Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli

2. Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Use test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

4. Trigger test events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

## Database Schema

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
```

## Common Issues

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
- Use `express.raw()` middleware for webhook route (not `express.json()`)

### Customer not found
- Create customer on first checkout or user registration
- Store `stripeCustomerId` in user record

### Subscription not updating
- Check webhook logs in Stripe Dashboard
- Verify webhook endpoint is accessible (not blocked by auth)

## Security Considerations

1. Always verify webhook signatures
2. Never expose `STRIPE_SECRET_KEY` to frontend
3. Use `metadata` to link Stripe objects to your users
4. Validate subscription status server-side for protected routes
