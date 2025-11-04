export const CHIPS = [
    1, // WHITE
    5, // RED
    25, // GREEN
    100, // BLACK
    500 // BLUE
];

export type Card = {
    rank: string;
    suit: string;
    imageUrl: string;
    alt: string;
};

export type HandValue = {
    value: { low: number; high: number } | number;
    status: "Blackjack!" | "Bust!" | null;
}

export const DECK: Card[] = [
    { rank: "A", suit: "spades", imageUrl: "/images/ace_of_spades.png", alt: "Ace of Spades playing card" },
    { rank: "2", suit: "spades", imageUrl: "/images/2_of_spades.png", alt: "Two of Spades playing card" },
    { rank: "3", suit: "spades", imageUrl: "/images/3_of_spades.png", alt: "Three of Spades playing card" },
    { rank: "4", suit: "spades", imageUrl: "/images/4_of_spades.png", alt: "Four of Spades playing card" },
    { rank: "5", suit: "spades", imageUrl: "/images/5_of_spades.png", alt: "Five of Spades playing card" },
    { rank: "6", suit: "spades", imageUrl: "/images/6_of_spades.png", alt: "Six of Spades playing card" },
    { rank: "7", suit: "spades", imageUrl: "/images/7_of_spades.png", alt: "Seven of Spades playing card" },
    { rank: "8", suit: "spades", imageUrl: "/images/8_of_spades.png", alt: "Eight of Spades playing card" },
    { rank: "9", suit: "spades", imageUrl: "/images/9_of_spades.png", alt: "Nine of Spades playing card" },
    { rank: "10", suit: "spades", imageUrl: "/images/10_of_spades.png", alt: "Ten of Spades playing card" },
    { rank: "J", suit: "spades", imageUrl: "/images/jack_of_spades2.png", alt: "Jack of Spades playing card" },
    { rank: "Q", suit: "spades", imageUrl: "/images/queen_of_spades2.png", alt: "Queen of Spades playing card" },
    { rank: "K", suit: "spades", imageUrl: "/images/king_of_spades2.png", alt: "King of Spades playing card" },

    { rank: "A", suit: "hearts", imageUrl: "/images/ace_of_hearts.png", alt: "Ace of Hearts playing card" },
    { rank: "2", suit: "hearts", imageUrl: "/images/2_of_hearts.png", alt: "Two of Hearts playing card" },
    { rank: "3", suit: "hearts", imageUrl: "/images/3_of_hearts.png", alt: "Three of Hearts playing card" },
    { rank: "4", suit: "hearts", imageUrl: "/images/4_of_hearts.png", alt: "Four of Hearts playing card" },
    { rank: "5", suit: "hearts", imageUrl: "/images/5_of_hearts.png", alt: "Five of Hearts playing card" },
    { rank: "6", suit: "hearts", imageUrl: "/images/6_of_hearts.png", alt: "Six of Hearts playing card" },
    { rank: "7", suit: "hearts", imageUrl: "/images/7_of_hearts.png", alt: "Seven of Hearts playing card" },
    { rank: "8", suit: "hearts", imageUrl: "/images/8_of_hearts.png", alt: "Eight of Hearts playing card" },
    { rank: "9", suit: "hearts", imageUrl: "/images/9_of_hearts.png", alt: "Nine of Hearts playing card" },
    { rank: "10", suit: "hearts", imageUrl: "/images/10_of_hearts.png", alt: "Ten of Hearts playing card" },
    { rank: "J", suit: "hearts", imageUrl: "/images/jack_of_hearts2.png", alt: "Jack of Hearts playing card" },
    { rank: "Q", suit: "hearts", imageUrl: "/images/queen_of_hearts2.png", alt: "Queen of Hearts playing card" },
    { rank: "K", suit: "hearts", imageUrl: "/images/king_of_hearts2.png", alt: "King of Hearts playing card" },

    { rank: "A", suit: "clubs", imageUrl: "/images/ace_of_clubs.png", alt: "Ace of Clubs playing card" },
    { rank: "2", suit: "clubs", imageUrl: "/images/2_of_clubs.png", alt: "Two of Clubs playing card" },
    { rank: "3", suit: "clubs", imageUrl: "/images/3_of_clubs.png", alt: "Three of Clubs playing card" },
    { rank: "4", suit: "clubs", imageUrl: "/images/4_of_clubs.png", alt: "Four of Clubs playing card" },
    { rank: "5", suit: "clubs", imageUrl: "/images/5_of_clubs.png", alt: "Five of Clubs playing card" },
    { rank: "6", suit: "clubs", imageUrl: "/images/6_of_clubs.png", alt: "Six of Clubs playing card" },
    { rank: "7", suit: "clubs", imageUrl: "/images/7_of_clubs.png", alt: "Seven of Clubs playing card" },
    { rank: "8", suit: "clubs", imageUrl: "/images/8_of_clubs.png", alt: "Eight of Clubs playing card" },
    { rank: "9", suit: "clubs", imageUrl: "/images/9_of_clubs.png", alt: "Nine of Clubs playing card" },
    { rank: "10", suit: "clubs", imageUrl: "/images/10_of_clubs.png", alt: "Ten of Clubs playing card" },
    { rank: "J", suit: "clubs", imageUrl: "/images/jack_of_clubs2.png", alt: "Jack of Clubs playing card" },
    { rank: "Q", suit: "clubs", imageUrl: "/images/queen_of_clubs2.png", alt: "Queen of Clubs playing card" },
    { rank: "K", suit: "clubs", imageUrl: "/images/king_of_clubs2.png", alt: "King of Clubs playing card" },

    { rank: "A", suit: "diamonds", imageUrl: "/images/ace_of_diamonds.png", alt: "Ace of Diamonds playing card" },
    { rank: "2", suit: "diamonds", imageUrl: "/images/2_of_diamonds.png", alt: "Two of Diamonds playing card" },
    { rank: "3", suit: "diamonds", imageUrl: "/images/3_of_diamonds.png", alt: "Three of Diamonds playing card" },
    { rank: "4", suit: "diamonds", imageUrl: "/images/4_of_diamonds.png", alt: "Four of Diamonds playing card" },
    { rank: "5", suit: "diamonds", imageUrl: "/images/5_of_diamonds.png", alt: "Five of Diamonds playing card" },
    { rank: "6", suit: "diamonds", imageUrl: "/images/6_of_diamonds.png", alt: "Six of Diamonds playing card" },
    { rank: "7", suit: "diamonds", imageUrl: "/images/7_of_diamonds.png", alt: "Seven of Diamonds playing card" },
    { rank: "8", suit: "diamonds", imageUrl: "/images/8_of_diamonds.png", alt: "Eight of Diamonds playing card" },
    { rank: "9", suit: "diamonds", imageUrl: "/images/9_of_diamonds.png", alt: "Nine of Diamonds playing card" },
    { rank: "10", suit: "diamonds", imageUrl: "/images/10_of_diamonds.png", alt: "Ten of Diamonds playing card" },
    { rank: "J", suit: "diamonds", imageUrl: "/images/jack_of_diamonds2.png", alt: "Jack of Diamonds playing card" },
    { rank: "Q", suit: "diamonds", imageUrl: "/images/queen_of_diamonds2.png", alt: "Queen of Diamonds playing card" },
    { rank: "K", suit: "diamonds", imageUrl: "/images/king_of_diamonds2.png", alt: "King of Diamonds playing card" },
];
