// Study Buddy — demo data (one tutor kept for booking flow testing)

export const CLASSES = [
  { code: 'CHEM 200', title: 'General Chemistry', dept: 'Chemistry', enrolled: 842, tutors: 1, avgRate: 38, difficulty: 'Hard' },
];

export const TUTORS = [
  {
    id: 't3', name: 'Priya Rangan', initials: 'PR', major: 'Chemistry', year: 'Senior',
    classes: ['CHEM 200', 'CHEM 201', 'CHEM 365'], grades: { 'CHEM 200': 'A', 'CHEM 201': 'A' },
    bio: 'TA for Dr. Nakamura two semesters running. I know the exact exam patterns and how to prep without wasting time.',
    rate: 38, rating: 5.0, reviews: 28, sessions: 54, responseTime: '< 30m',
    availability: 'This week', nextSlot: 'Wed 2:00 PM', verified: true, topRated: true,
    tags: ['Top tutor', 'Former TA', 'Exam prep'], color: 'oklch(0.72 0.1 100)',
  },
];

export const REVIEWS = [];
