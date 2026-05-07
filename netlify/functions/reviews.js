import { getStore } from '@netlify/blobs';
import { verifyToken } from '@clerk/backend';

const STORE_NAME = 'rate-your-bed';
const KEY = 'reviews_v1';

const SEED = [
  {
    id: "s1",
    userId: "seed",
    reviewerName: "M.K.",
    hotelName: "The Carlyle",
    location: "New York, NY",
    roomType: "King",
    dateStayed: "Aug 2024",
    overall: 5,
    mattress: { rating: 5, firmness: 5 },
    sheets:   { rating: 5, feel: 8 },
    pillows:  { rating: 4, loft: 6 },
    comment: "Pillowtop king. The kind of bed where you wake up an hour late and don't apologize. Crisp linens, no springs, supportive without ever being stiff.",
    createdAt: "2024-09-01T00:00:00Z",
  },
  {
    id: "s2",
    userId: "seed",
    reviewerName: "R.P.",
    hotelName: "Ace Hotel",
    location: "Brooklyn, NY",
    roomType: "Queen",
    dateStayed: "Mar 2024",
    overall: 2,
    mattress: { rating: 2, firmness: 8 },
    sheets:   { rating: 3, feel: 4 },
    pillows:  { rating: 2, loft: 3 },
    comment: "Way too firm. Felt like sleeping on dressed plywood. Pillows tried to compensate and lost. Sheets were thin and pilled along the edges.",
    createdAt: "2024-04-12T00:00:00Z",
  },
  {
    id: "s3",
    userId: "seed",
    reviewerName: "A.C.",
    hotelName: "Hotel Saint Cecilia",
    location: "Austin, TX",
    roomType: "Bungalow",
    dateStayed: "Oct 2024",
    overall: 5,
    mattress: { rating: 5, firmness: 6 },
    sheets:   { rating: 5, feel: 9 },
    pillows:  { rating: 5, loft: 7 },
    comment: "Four-poster bed, mattress was that perfect medium. Sheets felt like an absurd thread count. Pillows had real loft. Slept twelve hours and missed brunch.",
    createdAt: "2024-10-30T00:00:00Z",
  },
  {
    id: "s4",
    userId: "seed",
    reviewerName: "J.L.",
    hotelName: "Marriott Marquis",
    location: "Times Square, NY",
    roomType: "Double Queen",
    dateStayed: "Feb 2025",
    overall: 2,
    mattress: { rating: 2, firmness: 7 },
    sheets:   { rating: 3, feel: 5 },
    pillows:  { rating: 2, loft: 4 },
    comment: "Sagged in the middle despite firm edges. Sheets were the polyester kind that never feels cold. Pillows were the four-flat-pancakes situation.",
    createdAt: "2025-02-20T00:00:00Z",
  },
  {
    id: "s5",
    userId: "seed",
    reviewerName: "D.T.",
    hotelName: "Soho Grand",
    location: "New York, NY",
    roomType: "King",
    dateStayed: "Jun 2025",
    overall: 4,
    mattress: { rating: 4, firmness: 4 },
    sheets:   { rating: 4, feel: 7 },
    pillows:  { rating: 3, loft: 8 },
    comment: "Plush mattress with bones. Sheets crisp and cool. Pillows a touch too tall — woke up with a stiff neck. Otherwise great.",
    createdAt: "2025-07-02T00:00:00Z",
  },
  {
    id: "s6",
    userId: "seed",
    reviewerName: "S.V.",
    hotelName: "The Hoxton",
    location: "Portland, OR",
    roomType: "Roomy King",
    dateStayed: "Jan 2025",
    overall: 4,
    mattress: { rating: 4, firmness: 5 },
    sheets:   { rating: 5, feel: 8 },
    pillows:  { rating: 4, loft: 6 },
    comment: "Genuinely good bed. Linens were the highlight — heavy, cool. Mattress had real support. Pillows had options.",
    createdAt: "2025-02-04T00:00:00Z",
  },
  {
    id: "s7",
    userId: "seed",
    reviewerName: "B.H.",
    hotelName: "Hampton Inn Downtown",
    location: "Nashville, TN",
    roomType: "Queen",
    dateStayed: "Sep 2024",
    overall: 3,
    mattress: { rating: 3, firmness: 6 },
    sheets:   { rating: 3, feel: 5 },
    pillows:  { rating: 3, loft: 5 },
    comment: "Perfectly average across the board. Did the job. Will be forgotten by the time I unpack.",
    createdAt: "2024-10-01T00:00:00Z",
  },
];

async function authenticate(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return { userId: payload.sub };
  } catch (e) {
    console.warn('token verify failed:', e.message);
    return null;
  }
}

function validate(r) {
  if (!r || typeof r !== 'object') return 'Invalid review';
  if (typeof r.hotelName !== 'string' || !r.hotelName.trim()) return 'Missing hotel name';
  if (typeof r.location !== 'string' || !r.location.trim()) return 'Missing location';
  if (typeof r.comment !== 'string' || !r.comment.trim()) return 'Missing comment';
  if (typeof r.reviewerName !== 'string' || !r.reviewerName.trim()) return 'Missing display name';

  const num = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max;
  };
  if (!num(r.overall, 1, 5)) return 'Invalid overall';
  if (!r.mattress || !num(r.mattress.rating, 1, 5) || !num(r.mattress.firmness, 1, 10)) return 'Invalid mattress';
  if (!r.sheets || !num(r.sheets.rating, 1, 5) || !num(r.sheets.feel, 1, 10)) return 'Invalid sheets';
  if (!r.pillows || !num(r.pillows.rating, 1, 5) || !num(r.pillows.loft, 1, 10)) return 'Invalid pillows';

  if (r.hotelName.length > 200 || r.location.length > 200 || r.comment.length > 2000 || r.reviewerName.length > 60) {
    return 'Field too long';
  }
  return null;
}

function sanitize(review, userId) {
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    reviewerName: review.reviewerName.trim().slice(0, 60),
    hotelName: review.hotelName.trim().slice(0, 200),
    location: review.location.trim().slice(0, 200),
    roomType: (review.roomType || 'Standard').toString().trim().slice(0, 100),
    dateStayed: (review.dateStayed || 'Recent').toString().trim().slice(0, 50),
    overall: Number(review.overall),
    mattress: {
      rating: Number(review.mattress.rating),
      firmness: Number(review.mattress.firmness),
    },
    sheets: {
      rating: Number(review.sheets.rating),
      feel: Number(review.sheets.feel),
    },
    pillows: {
      rating: Number(review.pillows.rating),
      loft: Number(review.pillows.loft),
    },
    comment: review.comment.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
}

async function loadReviews(store) {
  let reviews = await store.get(KEY, { type: 'json' });
  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviews = SEED;
    await store.setJSON(KEY, reviews);
  }
  return reviews;
}

export default async (req) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      const mine = url.searchParams.get('mine') === 'true';
      const all = await loadReviews(store);

      if (mine) {
        const auth = await authenticate(req);
        if (!auth) return new Response('Unauthorized', { status: 401 });
        const filtered = all.filter((r) => r.userId === auth.userId);
        return Response.json({ reviews: filtered }, {
          headers: { 'Cache-Control': 'no-store' },
        });
      }

      return Response.json({ reviews: all }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (req.method === 'POST') {
      const auth = await authenticate(req);
      if (!auth) return new Response('Sign in to post a rating.', { status: 401 });

      const body = await req.json();
      const err = validate(body?.review);
      if (err) return new Response(err, { status: 400 });

      const newReview = sanitize(body.review, auth.userId);
      const existing = await loadReviews(store);
      const updated = [newReview, ...existing];
      await store.setJSON(KEY, updated);

      return Response.json({ review: newReview, reviews: updated });
    }

    if (req.method === 'DELETE') {
      const auth = await authenticate(req);
      if (!auth) return new Response('Unauthorized', { status: 401 });

      const id = url.searchParams.get('id');
      if (!id) return new Response('Missing id', { status: 400 });

      const existing = await loadReviews(store);
      const target = existing.find((r) => r.id === id);
      if (!target) return new Response('Not found', { status: 404 });
      if (target.userId !== auth.userId) return new Response('Forbidden', { status: 403 });

      const updated = existing.filter((r) => r.id !== id);
      await store.setJSON(KEY, updated);
      return Response.json({ reviews: updated });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (e) {
    console.error('reviews function error:', e);
    return new Response('Server error', { status: 500 });
  }
};

export const config = {
  path: '/api/reviews',
};
