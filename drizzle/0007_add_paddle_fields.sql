-- Add Paddle fields to subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN paddle_price_id TEXT UNIQUE,
  ADD COLUMN paddle_product_id TEXT;

-- Add Paddle fields to user_subscriptions
ALTER TABLE user_subscriptions
  ADD COLUMN paddle_subscription_id TEXT UNIQUE,
  ADD COLUMN paddle_customer_id TEXT,
  ADD COLUMN paddle_transaction_id TEXT;

-- Add indexes for performance
CREATE INDEX subscription_plans_paddle_price_idx ON subscription_plans(paddle_price_id);
CREATE INDEX user_subscriptions_paddle_sub_idx ON user_subscriptions(paddle_subscription_id);
CREATE INDEX user_subscriptions_paddle_customer_idx ON user_subscriptions(paddle_customer_id);
