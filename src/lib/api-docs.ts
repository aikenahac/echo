export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  category: "Books" | "Reviews" | "Social" | "Profile" | "Collections" | "Subscriptions" | "Feed";
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

export const integrationGuide = {
  title: "Mobile App Integration Guide",
  sections: [
    {
      title: "Authentication with Clerk",
      content: `All API endpoints require authentication via Clerk. The API uses session-based authentication where Clerk manages the JWT tokens automatically.`,
      steps: [
        {
          title: "Setup Clerk in Your Mobile App",
          code: `// React Native
import { ClerkProvider } from '@clerk/clerk-expo';

export default function App() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {/* Your app */}
    </ClerkProvider>
  );
}

// iOS (Swift)
// Add Clerk SDK via SPM: https://github.com/clerk/clerk-ios
import Clerk

@main
struct MyApp: App {
  init() {
    Clerk.configure(publishableKey: "pk_...")
  }
}

// Android (Kotlin)
// Add Clerk SDK via Gradle
// implementation 'com.clerk:clerk-android:latest.version'
import com.clerk.android.Clerk

class MyApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    Clerk.init(this, publishableKey = "pk_...")
  }
}`,
        },
        {
          title: "Making Authenticated Requests",
          code: `// React Native with fetch
import { useAuth } from '@clerk/clerk-expo';

function useApi() {
  const { getToken } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();

    const response = await fetch(\`https://your-domain.com\${endpoint}\`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(\`API Error: \${response.status}\`);
    }

    return response.json();
  };

  return { apiCall };
}

// Example usage
const { apiCall } = useApi();
const books = await apiCall('/api/v1/books?status=reading');`,
        },
        {
          title: "Error Handling",
          code: `// All API errors return this format:
{
  "error": "Error message here",
  "status": 400
}

// Success responses are wrapped in:
{
  "success": true,
  "data": { /* your data */ }
}

// Example error handler
try {
  const result = await apiCall('/api/v1/books', {
    method: 'POST',
    body: JSON.stringify({ bookData, status }),
  });
  console.log('Success:', result.data);
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - redirect to login
  } else if (error.status === 400) {
    // Validation error - show to user
  }
}`,
        },
      ],
    },
    {
      title: "Important Notes",
      content: `
• **Session Management**: Clerk automatically handles token refresh. The session token is valid for the duration of the user's session.
• **CORS**: API routes accept requests from any origin. Ensure you're using HTTPS in production.
• **Rate Limiting**: Currently no rate limiting is enforced, but this may change in the future.
• **Pagination**: Endpoints that return lists (feed, user search) support \`limit\` and \`offset\` query parameters.
• **Date Formats**: All dates are returned in ISO 8601 format (e.g., "2025-01-15T10:00:00Z").
      `.trim(),
    },
  ],
};

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
      {
        name: "favorite",
        type: "string",
        required: false,
        description: 'Filter by favorite status: "true" to show only favorites',
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
            isFavorite: false,
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

  // Collections API
  {
    method: "GET",
    path: "/api/v1/collections",
    category: "Collections",
    description: "Get all your collections",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "List of collections",
        example: [
          {
            id: "uuid...",
            userId: "user_123",
            name: "Summer Reading",
            description: "Books to read this summer",
            isPublic: false,
            colorTag: "#3B82F6",
            iconName: "sun",
            bookCount: 5,
            createdAt: "2025-01-15T10:00:00Z",
            updatedAt: "2025-01-20T15:30:00Z",
            books: [
              {
                id: "uuid...",
                status: "want",
                book: {
                  title: "The Great Gatsby",
                  author: "F. Scott Fitzgerald",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/collections",
    category: "Collections",
    description: "Create a new collection",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        name: "string (required)",
        description: "string (optional)",
        isPublic: "boolean (optional, default: false)",
        colorTag: "string (optional, hex color)",
        iconName: "string (optional)",
      },
      example: {
        name: "Sci-Fi Favorites",
        description: "My favorite science fiction novels",
        isPublic: true,
        colorTag: "#10B981",
        iconName: "rocket",
      },
    },
    responses: [
      {
        status: 201,
        description: "Collection created",
        example: {
          id: "uuid...",
          userId: "user_123",
          name: "Sci-Fi Favorites",
          description: "My favorite science fiction novels",
          isPublic: true,
          colorTag: "#10B981",
          iconName: "rocket",
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-15T10:00:00Z",
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Collection name is required" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/collections/{id}",
    category: "Collections",
    description: "Get a specific collection",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Collection details",
        example: {
          id: "uuid...",
          userId: "user_123",
          name: "Summer Reading",
          description: "Books to read this summer",
          isPublic: false,
          colorTag: "#3B82F6",
          iconName: "sun",
          bookCount: 5,
          books: [
            {
              id: "uuid...",
              status: "reading",
              currentPage: 150,
              book: {
                id: "uuid...",
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
                coverUrl: "https://...",
              },
            },
          ],
        },
      },
      {
        status: 404,
        description: "Collection not found",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/collections/{id}",
    category: "Collections",
    description: "Update a collection",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        name: "string (optional)",
        description: "string (optional)",
        isPublic: "boolean (optional)",
        colorTag: "string (optional)",
        iconName: "string (optional)",
      },
      example: {
        name: "Updated Collection Name",
        isPublic: true,
      },
    },
    responses: [
      {
        status: 200,
        description: "Collection updated",
        example: { success: true },
      },
      {
        status: 404,
        description: "Collection not found",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/collections/{id}",
    category: "Collections",
    description: "Delete a collection",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Collection deleted",
        example: { success: true },
      },
      {
        status: 404,
        description: "Collection not found",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/collections/{id}/books",
    category: "Collections",
    description: "Add a book to a collection",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        userBookId: "string (required)",
      },
      example: {
        userBookId: "uuid...",
      },
    },
    responses: [
      {
        status: 201,
        description: "Book added to collection",
        example: {
          collectionId: "uuid...",
          userBookId: "uuid...",
          createdAt: "2025-01-15T10:00:00Z",
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Book already in this collection" },
      },
      {
        status: 404,
        description: "Collection or book not found",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/collections/{id}/books",
    category: "Collections",
    description: "Remove a book from a collection",
    requiresAuth: true,
    queryParams: [
      {
        name: "userBookId",
        type: "string",
        required: true,
        description: "The ID of the user book to remove",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Book removed from collection",
        example: { success: true },
      },
      {
        status: 404,
        description: "Collection not found",
        example: { error: "Collection not found" },
      },
    ],
  },

  // Subscriptions API
  {
    method: "GET",
    path: "/api/v1/subscriptions",
    category: "Subscriptions",
    description: "Get your current subscription and plan details",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Subscription details (active subscription)",
        example: {
          subscription: {
            id: "uuid...",
            status: "active",
            currentPeriodStart: "2025-01-01T00:00:00Z",
            currentPeriodEnd: "2025-02-01T00:00:00Z",
            cancelAtPeriodEnd: false,
          },
          plan: {
            id: "uuid...",
            name: "Premium Monthly",
            price: 999,
            interval: "month",
            // no per-year book limits; unlimited available
            features: {
              unlimited: true,
              collections: true,
              prioritySupport: true,
            },
          },
          isActive: true,
          isFree: false,
        },
      },
      {
        status: 200,
        description: "No subscription (free plan)",
        example: {
          subscription: null,
          plan: {
            id: "uuid...",
            name: "Free",
            price: 0,
            interval: "free",
            // free plan also supports unlimited books now
          },
          isActive: false,
          isFree: true,
        },
      },
    ],
  },
  

  // Feed API
  {
    method: "GET",
    path: "/api/v1/feed",
    category: "Feed",
    description: "Get activity feed from users you follow",
    requiresAuth: true,
    queryParams: [
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Number of activities to return (default: 20, max: 100)",
      },
      {
        name: "offset",
        type: "number",
        required: false,
        description: "Number of activities to skip (default: 0)",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Activity feed",
        example: {
          activities: [
            {
              type: "book",
              date: "2025-01-20T15:30:00Z",
              user: {
                id: "user_456",
                username: "bookworm",
                email: "user@example.com",
              },
              book: {
                id: "uuid...",
                title: "1984",
                author: "George Orwell",
                coverUrl: "https://...",
              },
              data: {
                status: "finished",
                rating: 5,
                finishedAt: "2025-01-20T15:30:00Z",
              },
            },
            {
              type: "review",
              date: "2025-01-19T10:00:00Z",
              user: {
                id: "user_789",
                username: "reader123",
                email: "reader@example.com",
              },
              book: {
                id: "uuid...",
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
              },
              data: {
                content: "A masterpiece of American literature!",
                isPrivate: false,
              },
            },
          ],
          hasMore: true,
          limit: 20,
          offset: 0,
        },
      },
      {
        status: 200,
        description: "Empty feed (not following anyone)",
        example: {
          activities: [],
          hasMore: false,
          total: 0,
        },
      },
    ],
  },

  // User Search API
  {
    method: "GET",
    path: "/api/v1/users/search",
    category: "Social",
    description: "Search for users by username or email",
    requiresAuth: true,
    queryParams: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "Search query (min 2 characters)",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Number of results to return (default: 20, max: 50)",
      },
    ],
    responses: [
      {
        status: 200,
        description: "Search results",
        example: {
          results: [
            {
              id: "user_456",
              username: "bookworm",
              email: "user@example.com",
              bio: "I love reading!",
              isFollowing: true,
            },
            {
              id: "user_789",
              username: "reader123",
              email: "reader@example.com",
              bio: null,
              isFollowing: false,
            },
          ],
          hasMore: false,
          total: 2,
          query: "book",
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Search query must be at least 2 characters" },
      },
    ],
  },
];
