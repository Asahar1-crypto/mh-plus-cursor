/**
 * Payment Service - Entry Point
 * 
 * Usage:
 *   import { paymentProvider } from '@/services/payment';
 *   const customerId = await paymentProvider.createCustomer({ ... });
 * 
 * To switch to a different provider:
 *   1. Create a new class implementing PaymentProvider
 *   2. Change the export below
 */

export type { PaymentProvider, PaymentProviderType, CustomerInfo, SubscriptionResult, WebhookEvent, BillingPeriod, SubscriptionStatus } from './types';
export { ManualPaymentProvider } from './ManualPaymentProvider';

import { ManualPaymentProvider } from './ManualPaymentProvider';

// Current payment provider - change this when connecting a payment gateway
export const paymentProvider = new ManualPaymentProvider();
