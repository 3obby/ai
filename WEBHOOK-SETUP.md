# Stripe Webhook Setup Guide

This guide covers how to properly set up Stripe webhooks for your Vercel deployment.

## 1. Configure Webhook in Stripe Dashboard

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/) and navigate to **Developers > Webhooks**.
2. Click **Add endpoint**.
3. Enter your webhook URL:
   ```
   https://your-domain.vercel.app/api/webhook
   ```
4. Select the following events to listen for:

   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `usage_record.created`

5. After creating, reveal and copy the **Signing Secret** - you'll need this for your environment variables.

## 2. Set Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

- `STRIPE_API_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: The signing secret from step 1
- `STRIPE_STANDARD_PRICE_ID`: Your product's price ID
- `NEXT_PUBLIC_APP_URL`: Your production URL

## 3. Test Your Webhook Locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```bash
# Login to Stripe
stripe login

# Forward events to your local server
stripe listen --forward-to localhost:3000/api/webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

## 4. Test in Production

After deploying to Vercel, you can use the Stripe Dashboard to manually send test webhooks:

1. Go to **Developers > Webhooks**
2. Select your endpoint
3. Click **Send test webhook**
4. Select an event type (e.g., `checkout.session.completed`)
5. Click **Send test webhook**

## 5. Debugging Webhook Issues

If webhooks aren't working:

1. Check Vercel logs for any errors
2. Verify all environment variables are correctly set
3. Ensure your webhook URL is publicly accessible
4. Check that your webhook endpoint is correctly processing events

## Common Issues

- **Incorrect Webhook Secret**: Double-check it matches exactly with Stripe dashboard
- **Missing Environment Variables**: Ensure all required variables are set
- **Endpoint Not Accessible**: Verify your Vercel deployment is public
- **Code Errors**: Check Vercel logs for execution errors

By following these steps, you should have a properly functioning webhook integration between Stripe and your Vercel deployment.
