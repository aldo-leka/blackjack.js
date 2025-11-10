export const CHIPS = [
    1, // WHITE
    5, // RED
    25, // GREEN
    100, // BLACK
    500 // BLUE
];

export const REFILL_INTERVAL = 900;

export type Card = {
    rank: string;
    suit: string;
    value: number[];
    imageUrl: string;
    alt: string;
};

export type HandValue = {
    value: { low: number; high: number } | number;
    status: "Blackjack!" | "Bust!" | null;
}

export type HandResult = {
    winnings: number;
    result: string;
}

export const DECK: Card[] = [
    { rank: "A", suit: "spades", value: [1, 11], imageUrl: "/images/ace_of_spades.png", alt: "Ace of Spades playing card" },
    { rank: "2", suit: "spades", value: [2], imageUrl: "/images/2_of_spades.png", alt: "Two of Spades playing card" },
    { rank: "3", suit: "spades", value: [3], imageUrl: "/images/3_of_spades.png", alt: "Three of Spades playing card" },
    { rank: "4", suit: "spades", value: [4], imageUrl: "/images/4_of_spades.png", alt: "Four of Spades playing card" },
    { rank: "5", suit: "spades", value: [5], imageUrl: "/images/5_of_spades.png", alt: "Five of Spades playing card" },
    { rank: "6", suit: "spades", value: [6], imageUrl: "/images/6_of_spades.png", alt: "Six of Spades playing card" },
    { rank: "7", suit: "spades", value: [7], imageUrl: "/images/7_of_spades.png", alt: "Seven of Spades playing card" },
    { rank: "8", suit: "spades", value: [8], imageUrl: "/images/8_of_spades.png", alt: "Eight of Spades playing card" },
    { rank: "9", suit: "spades", value: [9], imageUrl: "/images/9_of_spades.png", alt: "Nine of Spades playing card" },
    { rank: "10", suit: "spades", value: [10], imageUrl: "/images/10_of_spades.png", alt: "Ten of Spades playing card" },
    { rank: "J", suit: "spades", value: [10], imageUrl: "/images/jack_of_spades2.png", alt: "Jack of Spades playing card" },
    { rank: "Q", suit: "spades", value: [10], imageUrl: "/images/queen_of_spades2.png", alt: "Queen of Spades playing card" },
    { rank: "K", suit: "spades", value: [10], imageUrl: "/images/king_of_spades2.png", alt: "King of Spades playing card" },

    { rank: "A", suit: "hearts", value: [1, 11], imageUrl: "/images/ace_of_hearts.png", alt: "Ace of Hearts playing card" },
    { rank: "2", suit: "hearts", value: [2], imageUrl: "/images/2_of_hearts.png", alt: "Two of Hearts playing card" },
    { rank: "3", suit: "hearts", value: [3], imageUrl: "/images/3_of_hearts.png", alt: "Three of Hearts playing card" },
    { rank: "4", suit: "hearts", value: [4], imageUrl: "/images/4_of_hearts.png", alt: "Four of Hearts playing card" },
    { rank: "5", suit: "hearts", value: [5], imageUrl: "/images/5_of_hearts.png", alt: "Five of Hearts playing card" },
    { rank: "6", suit: "hearts", value: [6], imageUrl: "/images/6_of_hearts.png", alt: "Six of Hearts playing card" },
    { rank: "7", suit: "hearts", value: [7], imageUrl: "/images/7_of_hearts.png", alt: "Seven of Hearts playing card" },
    { rank: "8", suit: "hearts", value: [8], imageUrl: "/images/8_of_hearts.png", alt: "Eight of Hearts playing card" },
    { rank: "9", suit: "hearts", value: [9], imageUrl: "/images/9_of_hearts.png", alt: "Nine of Hearts playing card" },
    { rank: "10", suit: "hearts", value: [10], imageUrl: "/images/10_of_hearts.png", alt: "Ten of Hearts playing card" },
    { rank: "J", suit: "hearts", value: [10], imageUrl: "/images/jack_of_hearts2.png", alt: "Jack of Hearts playing card" },
    { rank: "Q", suit: "hearts", value: [10], imageUrl: "/images/queen_of_hearts2.png", alt: "Queen of Hearts playing card" },
    { rank: "K", suit: "hearts", value: [10], imageUrl: "/images/king_of_hearts2.png", alt: "King of Hearts playing card" },

    { rank: "A", suit: "clubs", value: [1, 11], imageUrl: "/images/ace_of_clubs.png", alt: "Ace of Clubs playing card" },
    { rank: "2", suit: "clubs", value: [2], imageUrl: "/images/2_of_clubs.png", alt: "Two of Clubs playing card" },
    { rank: "3", suit: "clubs", value: [3], imageUrl: "/images/3_of_clubs.png", alt: "Three of Clubs playing card" },
    { rank: "4", suit: "clubs", value: [4], imageUrl: "/images/4_of_clubs.png", alt: "Four of Clubs playing card" },
    { rank: "5", suit: "clubs", value: [5], imageUrl: "/images/5_of_clubs.png", alt: "Five of Clubs playing card" },
    { rank: "6", suit: "clubs", value: [6], imageUrl: "/images/6_of_clubs.png", alt: "Six of Clubs playing card" },
    { rank: "7", suit: "clubs", value: [7], imageUrl: "/images/7_of_clubs.png", alt: "Seven of Clubs playing card" },
    { rank: "8", suit: "clubs", value: [8], imageUrl: "/images/8_of_clubs.png", alt: "Eight of Clubs playing card" },
    { rank: "9", suit: "clubs", value: [9], imageUrl: "/images/9_of_clubs.png", alt: "Nine of Clubs playing card" },
    { rank: "10", suit: "clubs", value: [10], imageUrl: "/images/10_of_clubs.png", alt: "Ten of Clubs playing card" },
    { rank: "J", suit: "clubs", value: [10], imageUrl: "/images/jack_of_clubs2.png", alt: "Jack of Clubs playing card" },
    { rank: "Q", suit: "clubs", value: [10], imageUrl: "/images/queen_of_clubs2.png", alt: "Queen of Clubs playing card" },
    { rank: "K", suit: "clubs", value: [10], imageUrl: "/images/king_of_clubs2.png", alt: "King of Clubs playing card" },

    { rank: "A", suit: "diamonds", value: [1, 11], imageUrl: "/images/ace_of_diamonds.png", alt: "Ace of Diamonds playing card" },
    { rank: "2", suit: "diamonds", value: [2], imageUrl: "/images/2_of_diamonds.png", alt: "Two of Diamonds playing card" },
    { rank: "3", suit: "diamonds", value: [3], imageUrl: "/images/3_of_diamonds.png", alt: "Three of Diamonds playing card" },
    { rank: "4", suit: "diamonds", value: [4], imageUrl: "/images/4_of_diamonds.png", alt: "Four of Diamonds playing card" },
    { rank: "5", suit: "diamonds", value: [5], imageUrl: "/images/5_of_diamonds.png", alt: "Five of Diamonds playing card" },
    { rank: "6", suit: "diamonds", value: [6], imageUrl: "/images/6_of_diamonds.png", alt: "Six of Diamonds playing card" },
    { rank: "7", suit: "diamonds", value: [7], imageUrl: "/images/7_of_diamonds.png", alt: "Seven of Diamonds playing card" },
    { rank: "8", suit: "diamonds", value: [8], imageUrl: "/images/8_of_diamonds.png", alt: "Eight of Diamonds playing card" },
    { rank: "9", suit: "diamonds", value: [9], imageUrl: "/images/9_of_diamonds.png", alt: "Nine of Diamonds playing card" },
    { rank: "10", suit: "diamonds", value: [10], imageUrl: "/images/10_of_diamonds.png", alt: "Ten of Diamonds playing card" },
    { rank: "J", suit: "diamonds", value: [10], imageUrl: "/images/jack_of_diamonds2.png", alt: "Jack of Diamonds playing card" },
    { rank: "Q", suit: "diamonds", value: [10], imageUrl: "/images/queen_of_diamonds2.png", alt: "Queen of Diamonds playing card" },
    { rank: "K", suit: "diamonds", value: [10], imageUrl: "/images/king_of_diamonds2.png", alt: "King of Diamonds playing card" },
];
