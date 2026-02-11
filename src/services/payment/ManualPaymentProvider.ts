/**
 * Manual Payment Provider
 * 
 * Used when no payment gateway is connected.
 * Subscriptions are managed manually by the super admin via the admin dashboard.
 * 
 * When a payment gateway is connected, replace this with:
 * - StripeProvider
 * - TranzillaProvider
 * - PayPlusProvider
 */

import type {
  PaymentProvider,
  PaymentProviderType,
  CustomerInfo,
  SubscriptionResult,
  WebhookEvent,
  BillingPeriod,
} from './types';

export class ManualPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'manual';

  async createCustomer(_info: CustomerInfo): Promise<string> {
    // In manual mode, customer ID = account ID (no external customer)
    return `manual_${Date.now()}`;
  }

  async createSubscription(
    _customerId: string,
    _planSlug: string,
    billingPeriod: BillingPeriod,
    _couponId?: string
  ): Promise<SubscriptionResult> {
    const now = new Date();
    const periodEnd = new Date(now);

    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return {
      subscriptionId: `manual_sub_${Date.now()}`,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    };
  }

  async cancelSubscription(_subscriptionId: string, _immediate?: boolean): Promise<void> {
    // In manual mode, cancellation is done via admin dashboard
    console.log('Manual subscription cancellation - update via admin dashboard');
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<WebhookEvent> {
    // Manual provider doesn't receive webhooks
    throw new Error('Manual provider does not support webhooks');
  }

  async getPortalUrl(_customerId: string): Promise<string> {
    // No external portal - redirect to internal settings
    return '/account-settings';
  }

  async getSubscription(_subscriptionId: string): Promise<SubscriptionResult | null> {
    // In manual mode, subscription data is read directly from DB
    return null;
  }
}
