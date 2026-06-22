# Paddle Billing Setup Guide

This guide will help you set up Paddle Billing for the Echo application.

## Prerequisites

- A Paddle account (sign up at [paddle.com](https://www.paddle.com))
- Access to the Paddle Dashboard
- Your application deployed or running locally with ngrok for webhook testing

---

## Step 1: Create Products in Paddle Dashboard

1. **Navigate to Catalog > Products** in your Paddle Dashboard

2. **Create your subscription products:**

### Monthly Plan
- Click **"+ Add Product"**
- Product name: `Echo Premium Monthly`
- Description: Monthly subscription to Echo Premium features
- Click **"Continue"**

### Add Pricing
- Click **"+ Add Price"**
- Billing cycle: `Monthly`
- Price: `€4.99` (or your desired amount)
- Click **"Save"**
- **Copy the Price ID** (format: `pri_xxx`) - you'll need this later

### Yearly Plan
- Click **"+ Add Product"**
- Product name: `Echo Premium Yearly`
- Description: Yearly subscription to Echo Premium features
- Click **"Continue"**

### Add Pricing
- Click **"+ Add Price"**
- Billing cycle: `Yearly`
- Price: `€49.99` (or your desired amount)
- Click **"Save"**
- **Copy the Price ID** (format: `pri_xxx`)

### Lifetime Plan (Optional)
- Click **"+ Add Product"**
- Product name: `Echo Premium Lifetime`
- Description: Lifetime access to Echo Premium features
- Click **"Continue"**

### Add Pricing
- Click **"+ Add Price"**
- Billing cycle: `One-time`
- Price: `€199.99` (or your desired amount)
- Click **"Save"**
- **Copy the Price ID** (format: `pri_xxx`)

---

## Step 2: Update Database with Paddle Price IDs

After creating your products and getting the Price IDs, update your database:

```sql
-- Connect to your database and run these commands

-- For Monthly Plan
UPDATE subscription_plans
SET paddle_price_id = 'pri_01jb...'
WHERE name = 'Premium Monthly';

-- For Yearly Plan
UPDATE subscription_plans
SET paddle_price_id = 'pri_01jc...'
WHERE name = 'Premium Yearly';

-- For Lifetime Plan (if applicable)
UPDATE subscription_plans
SET paddle_price_id = 'pri_01jd...'
WHERE name = 'Premium Lifetime';
```

Replace `pri_01jb...` with your actual Paddle Price IDs.

---

## Step 3: Configure Webhooks

1. **Go to Developer Tools > Notifications** in Paddle Dashboard

2. **Click "Add Notification Destination"**

3. **Configure the webhook:**
   - Destination Type: `Webhook`
   - Webhook URL: `https://yourdomain.com/api/webhooks/paddle`
   - For local testing: Use ngrok URL (e.g., `https://abc123.ngrok.io/api/webhooks/paddle`)
   - Description: `Echo Production Webhooks` (or `Echo Development Webhooks`)

4. **Select the following events:**
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
   - ✅ `transaction.completed`
   - ✅ `transaction.payment_failed`

5. **Click "Save"**

6. **Copy the Webhook Secret Key**
   - Format: `pdl_ntfset_xxx`
   - Add this to your `.env` file as `PADDLE_WEBHOOK_SECRET`

---

## Step 4: Get API Credentials

### Get API Key (Server-side)

1. **Go to Developer Tools > Authentication**
2. **Click "+ Create API Key"**
3. **Configure:**
   - Name: `Echo Server API Key`
   - Permissions: Select all relevant permissions (at minimum: `subscription:read`, `subscription:write`, `transaction:read`, `customer:read`, `customer:write`)
4. **Click "Create"**
5. **Copy the API Key** (format: `live_xxx` for production or `test_xxx` for sandbox)
6. Add to `.env` as `PADDLE_API_KEY`

### Get Client-side Token

1. **Still in Developer Tools > Authentication**
2. **Look for "Client-side Tokens"** section
3. **Click "+ Create Client Token"** (or use the default one)
4. **Copy the token** (format: `test_xxx` for sandbox or `live_xxx` for production)
5. Add to `.env` as `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

---

## Step 5: Environment Configuration

Update your `.env` file with all Paddle credentials:

```env
# Paddle Billing (use Sandbox values for development)
PADDLE_API_KEY=test_xxx
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxx
PADDLE_ENVIRONMENT=sandbox

# For production, use:
# PADDLE_API_KEY=live_xxx
# PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
# NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxx
# PADDLE_ENVIRONMENT=production
```

---

## Step 6: Database Migration

Run the database migration to add Paddle fields:

```bash
# Push the schema changes to your database
pnpm db:push

# Or if you're using migrations in production
pnpm db:migrate
```

This will add the following columns:
- `subscription_plans.paddle_price_id`
- `subscription_plans.paddle_product_id`
- `user_subscriptions.paddle_subscription_id`
- `user_subscriptions.paddle_customer_id`
- `user_subscriptions.paddle_transaction_id`

---

## Step 7: Testing with Sandbox

### Setup ngrok for Local Testing

1. **Install ngrok** (if not installed):
   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com
   ```

2. **Start your dev server:**
   ```bash
   pnpm dev
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Update webhook endpoint in Paddle:**
   - Go to Developer Tools > Notifications
   - Edit your webhook
   - Update URL to: `https://abc123.ngrok.io/api/webhooks/paddle`

### Test Card Details (Sandbox)

Use these test card details in Paddle Sandbox:

- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVC:** Any 3 digits
- **Name:** Any name

### Testing Checklist

- [ ] Create a test subscription through your app
- [ ] Verify `subscription.created` webhook is received
- [ ] Check database - new record should appear in `user_subscriptions`
- [ ] Verify welcome email is sent
- [ ] Test cancellation flow
- [ ] Verify `subscription.canceled` webhook downgrades user to free plan
- [ ] Test payment failure scenario (use declined test card if available)

---

## Step 8: Production Deployment

### Before Going Live

1. **Switch to Production Mode in Paddle:**
   - Go to your Paddle Dashboard settings
   - Enable "Go Live" mode
   - Complete any required verification steps

2. **Get Production Credentials:**
   - Create new API keys for production (starting with `live_`)
   - Get production client token
   - Create new webhook with production URL

3. **Update Environment Variables:**
   ```env
   PADDLE_API_KEY=live_xxx
   PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxx
   PADDLE_ENVIRONMENT=production
   ```

4. **Update webhook endpoint:**
   - Change from ngrok URL to your production URL
   - Example: `https://echo.yourdomain.com/api/webhooks/paddle`

5. **Deploy your application** with the new environment variables

### Monitor Webhooks

1. **Go to Developer Tools > Event Logs** in Paddle Dashboard
2. Monitor incoming webhook deliveries
3. Check for any failed webhooks and debug as needed

---

## Troubleshooting

### Webhooks Not Received

1. **Check webhook signature verification:**
   - Ensure `PADDLE_WEBHOOK_SECRET` is correct
   - Check server logs for signature verification errors

2. **Verify webhook endpoint is accessible:**
   - Test the URL in a browser (should return 404 or 405 for GET requests)
   - Check firewall/security rules

3. **Check Paddle Event Logs:**
   - Go to Developer Tools > Event Logs
   - Look for delivery attempts and error messages

### Invalid Price ID Errors

1. **Verify Price IDs are correct:**
   - Check they match format `pri_xxx`
   - Ensure they're from the correct environment (sandbox vs production)

2. **Check database updates:**
   ```sql
   SELECT name, paddle_price_id FROM subscription_plans;
   ```

### Transaction Failures

1. **Check API credentials:**
   - Ensure `PADDLE_API_KEY` is valid and not expired
   - Verify it has the correct permissions

2. **Check environment:**
   - Ensure `PADDLE_ENVIRONMENT` matches your credentials
   - Don't use sandbox credentials in production mode

---

## Additional Resources

- [Paddle Documentation](https://developer.paddle.com/)
- [Paddle Webhooks Guide](https://developer.paddle.com/webhooks/overview)
- [Paddle Node.js SDK](https://github.com/PaddleHQ/paddle-node-sdk)
- [Paddle API Reference](https://developer.paddle.com/api-reference/overview)

---

## Support

If you encounter issues:

1. Check the Paddle Dashboard Event Logs
2. Review server logs for error messages
3. Contact Paddle support through the dashboard
4. Check webhook delivery status in Paddle Dashboard
