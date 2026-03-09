import { request } from './client';

export interface VapidKeyResponse {
  publicKey: string;
}

export const pushApi = {
  getVapidKey: () => request<VapidKeyResponse>('/api/push/vapid-key'),

  subscribe: (subscription: PushSubscription) => {
    const json = subscription.toJSON();
    return request<{ id: string }>('/api/push/subscribe', {
      method: 'POST',
      body: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      },
    });
  },

  unsubscribe: (endpoint: string) =>
    request<void>('/api/push/unsubscribe', {
      method: 'POST',
      body: { endpoint },
    }),
};
