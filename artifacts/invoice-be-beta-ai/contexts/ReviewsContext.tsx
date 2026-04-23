import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { Review } from '../utils/types';

type ReviewsContextType = {
  reviews: Review[];
  loading: boolean;
  addReview: (review: Review) => Promise<void>;
  averageRating: number;
};

const ReviewsContext = createContext<ReviewsContextType | null>(null);
const KEY = 'reviews';

const seed: Review[] = [
  {
    id: 'rv_seed_1',
    invoiceId: 'inv_4',
    userId: 'mock_user_1',
    rating: 5,
    text: 'Outstanding work — clear communication and delivered ahead of schedule.',
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rv_seed_2',
    invoiceId: 'inv_old',
    userId: 'mock_user_1',
    rating: 4,
    text: 'Great experience overall. Would hire again.',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const existing = await storage.get<Review[]>(KEY);
      if (!existing) {
        await storage.set(KEY, seed);
        setReviews(seed);
      } else {
        setReviews(existing);
      }
      setLoading(false);
    })();
  }, []);

  const addReview = async (review: Review) => {
    const next = [review, ...reviews];
    setReviews(next);
    await storage.set(KEY, next);
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
