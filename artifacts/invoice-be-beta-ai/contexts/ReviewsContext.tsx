import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Review } from '../utils/types';
import { useAuth } from './AuthContext';
import { fetchReviews, submitReview, RemoteReview } from '../utils/reviewApi';

type ReviewsContextType = {
  reviews: Review[];
  loading: boolean;
  addReview: (params: { invoiceId: string; customerName?: string; invoiceRef?: string; rating: number; text: string }) => Promise<{ ok: boolean; error?: string }>;
  refreshReviews: () => Promise<void>;
  averageRating: number;
};

const ReviewsContext = createContext<ReviewsContextType | null>(null);

function remoteToReview(r: RemoteReview): Review {
  return {
    id: r.id,
    invoiceId: r.invoice_ref ?? '',
    userId: r.user_id,
    rating: r.rating,
    text: r.text,
    createdAt: r.created_at,
    customerName: r.customer_name ?? undefined,
  };
}

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const remote = await fetchReviews(userId);
    setReviews(remote.map(remoteToReview));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addReview = async (params: {
    invoiceId: string;
    customerName?: string;
    invoiceRef?: string;
    rating: number;
    text: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Not signed in' };
    const result = await submitReview(
      userId,
      params.customerName ?? null,
      params.invoiceRef ?? null,
      params.rating,
      params.text
    );
    if (result.ok) {
      await load();
    }
    return result;
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  return (
    <ReviewsContext.Provider value={{ reviews, loading, addReview, refreshReviews: load, averageRating }}>
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used within ReviewsProvider');
  return ctx;
}
