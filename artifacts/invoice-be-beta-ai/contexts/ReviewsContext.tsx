import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Review } from '../utils/types';
import { useAuth } from './AuthContext';

type ReviewsContextType = {
  reviews: Review[];
  loading: boolean;
  addReview: (review: Review) => Promise<void>;
  averageRating: number;
};

const ReviewsContext = createContext<ReviewsContextType | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const existing = (await storage.get<Review[]>(`reviews_${userId}`)) ?? [];
      setReviews(existing);
      setLoading(false);
    })();
  }, [userId]);

  const addReview = async (review: Review) => {
    if (!userId) return;
    const next = [review, ...reviews];
    setReviews(next);
    await storage.set(`reviews_${userId}`, next);
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  return (
    <ReviewsContext.Provider value={{ reviews, loading, addReview, averageRating }}>
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used within ReviewsProvider');
  return ctx;
}
