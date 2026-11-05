// The notes a sender can pick from in the builder. Edit freely; existing cats keep their own copy.

export const STARTER_NOTES: { group: string; notes: string[] }[] = [
  {
    group: "Love",
    notes: [
      "I love you",
      "I love you forever",
      "I would choose you again every time",
      "Every day with you is worth it",
      "You are my favorite person",
      "Hours of talking with you and I always want more",
      "Let's keep yapping forever",
    ],
  },
  {
    group: "Appreciation",
    notes: [
      "You are beloved",
      "Grateful for you",
      "Thank you for everything you do",
      "I'm so glad you exist",
      "Thinking about you right now",
      "You make ordinary days better",
    ],
  },
  {
    group: "Support",
    notes: [
      "You are doing better than you think",
      "I'm proud of you",
      "We are going to get through this together",
      "I see how much you're carrying and I want to share the weight",
      "Drink some water",
    ],
  },
  {
    group: "Silly",
    notes: [
      "The cat and I agree: you are our favorite person",
      "Meow (translation: you're wonderful)",
      "You have excellent taste in cats",
    ],
  },
];

// What the demo cat on the home page says: light, general messages, since whoever sees it
// hasn't been sent anything yet.
export const DEMO_NOTES: string[] = [
  "Meow (translation: you're the best)",
  "You have excellent taste in cats",
  "Drink some water",
  "You are doing better than you think",
  "You make ordinary days better",
  "Thanks for everything you do",
  "Have a lovely day",
];
