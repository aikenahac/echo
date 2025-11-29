export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  category: "Books" | "Reviews" | "Social" | "Profile";
  description: string;
  requiresAuth: boolean;
  requestBody?: {
    contentType: "application/json";
    schema: Record<string, any>;
    example: any;
  };
  queryParams?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  responses: Array<{
    status: number;
    description: string;
    example: any;
  }>;
}

export const apiEndpoints: ApiEndpoint[] = [
  // Books API
  {
    method: "POST",
    path: "/api/v1/books",
    category: "Books",
    description: "Add a book to your library",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        bookData: {
          title: "string (required)",
          author: "string (required)",
          isbn: "string (optional)",
          coverUrl: "string (optional)",
          pages: "number (optional)",
          publishedYear: "number (optional)",
        },
        status: '"want" | "reading" | "finished" (required)',
      },
      example: {
        bookData: {
          title: "The Goldfinch",
          author: "Donna Tartt",
          isbn: "9780143127741",
          pages: 771,
          publishedYear: 2013,
        },
        status: "want",
      },
    },
    responses: [
      {
        status: 201,
        description: "Book added successfully",
        example: { success: true, userBook: { id: "uuid..." } },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Book already in your library" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/books",
    category: "Books",
    description: "Get your books from library",
    requiresAuth: true,
    queryParams: [
      {
        name: "status",
        type: "string",
        required: false,
        description: 'Filter by status: "want", "reading", or "finished"',
      },
    ],
    responses: [
      {
        status: 200,
        description: "List of books",
        example: [
          {
            id: "uuid...",
            userId: "user_123",
            bookId: "uuid...",
            status: "reading",
            currentPage: 100,
            pageCount: 300,
            book: {
              id: "uuid...",
              title: "Example Book",
              author: "Author Name",
            },
          },
        ],
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/books/search",
    category: "Books",
    description: "Search for books (hybrid: database + Open Library API)",
    requiresAuth: true,
    queryParams: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "Search query",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Search results",
        example: [
          {
            id: "uuid...",
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "9780743273565",
            coverUrl: "https://...",
            source: "database",
          },
        ],
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/books/{id}/status",
    category: "Books",
    description: "Update reading status of a book",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        status: '"want" | "reading" | "finished" (required)',
      },
      example: {
        status: "reading",
      },
    },
    responses: [
      {
        status: 200,
        description: "Status updated",
        example: { success: true },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/books/{id}/progress",
    category: "Books",
    description: "Update reading progress",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        currentPage: "number (optional)",
        pageCount: "number (optional)",
      },
      example: {
        currentPage: 150,
      },
    },
    responses: [
      {
        status: 200,
        description: "Progress updated",
        example: { success: true },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/books/{id}/rating",
    category: "Books",
    description: "Rate a book (1-5 stars)",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        rating: "number (1-5, required)",
      },
      example: {
        rating: 5,
      },
    },
    responses: [
      {
        status: 200,
        description: "Rating updated",
        example: { success: true },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/books/{id}/favorite",
    category: "Books",
    description: "Toggle favorite status",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        isFavorite: "boolean (required)",
      },
      example: {
        isFavorite: true,
      },
    },
    responses: [
      {
        status: 200,
        description: "Favorite status updated",
        example: { success: true },
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/books/{id}",
    category: "Books",
    description: "Remove a book from your library",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Book removed",
        example: { success: true },
      },
    ],
  },

  // Reviews API
  {
    method: "POST",
    path: "/api/v1/reviews",
    category: "Reviews",
    description: "Create or update a review",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        bookId: "string (required)",
        content: "string (required)",
        isPrivate: "boolean (optional, default: false)",
      },
      example: {
        bookId: "uuid...",
        content: "This book was amazing! Highly recommended.",
        isPrivate: false,
      },
    },
    responses: [
      {
        status: 201,
        description: "Review created",
        example: { success: true },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/reviews",
    category: "Reviews",
    description: "Get your reviews or reviews for a book",
    requiresAuth: true,
    queryParams: [
      {
        name: "bookId",
        type: "string",
        required: false,
        description: "Filter reviews by book ID",
      },
    ],
    responses: [
      {
        status: 200,
        description: "List of reviews",
        example: [
          {
            id: "uuid...",
            userId: "user_123",
            bookId: "uuid...",
            content: "Great book!",
            isPrivate: false,
            createdAt: "2025-01-15T10:00:00Z",
          },
        ],
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/reviews/{id}",
    category: "Reviews",
    description: "Delete a review",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Review deleted",
        example: { success: true },
      },
    ],
  },

  // Social API
  {
    method: "POST",
    path: "/api/v1/social/follow",
    category: "Social",
    description: "Follow a user",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        userId: "string (required)",
      },
      example: {
        userId: "user_456",
      },
    },
    responses: [
      {
        status: 201,
        description: "User followed",
        example: { success: true },
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/social/follow/{userId}",
    category: "Social",
    description: "Unfollow a user",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "User unfollowed",
        example: { success: true },
      },
    ],
  },

  // Profile API
  {
    method: "GET",
    path: "/api/v1/profile",
    category: "Profile",
    description: "Get your profile",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "User profile",
        example: {
          id: "user_123",
          email: "user@example.com",
          username: "bookworm",
          bio: "I love reading!",
          role: "user",
        },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/profile",
    category: "Profile",
    description: "Update your profile",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        username: "string (required, 3-30 chars, alphanumeric + _ .)",
        bio: "string (optional)",
      },
      example: {
        username: "bookworm_2025",
        bio: "Avid reader and book reviewer",
      },
    },
    responses: [
      {
        status: 200,
        description: "Profile updated",
        example: { success: true },
      },
    ],
  },
];
