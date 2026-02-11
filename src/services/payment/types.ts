/**
 * Payment Abstraction Layer - Types & Interfaces
 * 
 * Generic interfaces for payment processing.
 * Currently using ManualPaymentProvider (admin-managed, no payment gateway).
 * When a payment gateway is connected, implement the PaymentProvider interface
 * with the specific provider (Stripe, Tranzilla, PayPlus, etc.).
 */

export type PaymentProviderType = 'manual' | 'stripe' | 'tranzilla' | 'payplus';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';
export type BillingPeriod = 'monthly' | 'yearly';

export interface CustomerInfo {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface WebhookEvent {
  type: 'subscription.created' | 'subscription.updated' | 'subscription.canceled' | 'payment.succeeded' | 'payment.failed';
  subscriptionId?: string;
  customerId?: string;
  status?: SubscriptionStatus;
  data: Record<string, unknown>;
}

export interface PaymentProvider {
  /** Provider name */
  readonly name: PaymentProviderType;

  /** Create a customer in the payment system */
  createCustomer(info: CustomerInfo): Promise<string>;

  /** Create a subscription for a customer */
  createSubscription(
    customerId: string,
    planSlug: string,
    billingPeriod: BillingPeriod,
    couponId?: string
  ): Promise<SubscriptionResult>;

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<void>;

  /** Handle incoming webhook from payment provider */
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;

  /** Get customer portal URL for managing subscription */
  getPortalUrl(customerId: string): Promise<string>;

  /** Get subscription details */
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;
}
