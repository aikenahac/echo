export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  category: "Books" | "Reviews" | "Social" | "Profile" | "Collections" | "Subscriptions" | "Feed";
  description: string;
  requiresAuth: boolean;
  requestBody?: {
    contentType: "application/json";
    schema: Record<string, unknown>;
    example: unknown;
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
    example: unknown;
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
const reading = await apiCall('/api/v1/books?status=reading'); // UserBook[]`,
        },
        {
          title: "Error Handling",
          code: `// Errors use the HTTP status code (400 validation, 401 not signed in,
// 403 forbidden / premium required, 404 not found, 500) and this body:
{
  "error": "Error message here"
}

// Success responses return the data directly (there is no
// { success, data } envelope). Mutations without a resource to return
// respond with { "success": true }.

// Example error handler
try {
  const result = await apiCall('/api/v1/books', {
    method: 'POST',
    body: JSON.stringify({ book: { bookId }, status }),
  });
  console.log('Added:', result.userBook);
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
• **Rate Limiting**: Book search is limited to 60 requests per minute and search ingest to 120 per hour, per user (429). Other endpoints are not limited yet.
• **Pagination**: List endpoints (feed, followers/following) take \`limit\` and \`offset\` and return \`hasMore\`. User search takes \`limit\` only. Book search is paged by Open Library page (\`page\`).
• **IDs**: \`/books/{id}\` takes a library entry (UserBook) ID. Catalog book IDs are used by \`/catalog/{bookId}\` and reviews.
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
        book: '{ bookId: string } (a catalog book) | { openLibrary: OpenLibraryDoc } (a result you got from Open Library that is not in the catalog yet) (required)',
        status: '"want" | "reading" | "finished" (required)',
        isFavorite: "boolean (optional)",
      },
      example: {
        book: { bookId: "uuid..." },
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
        description: 'Filter by favorite status: "true" or "false"',
      },
    ],
    responses: [
      {
        status: 200,
        description: "Without filters: books grouped by shelf, newest first",
        example: {
          favoriteBooks: [],
          wantToRead: [],
          currentlyReading: [
            {
              id: "uuid...",
              status: "reading",
              book: { id: "uuid...", title: "Example Book", author: "Author Name" },
            },
          ],
          finished: [],
        },
      },
      {
        status: 200,
        description: "With status and/or favorite: a flat array of matching books, newest first",
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
      {
        status: 400,
        description: "Invalid filter",
        example: { error: "Invalid status. Supported: want, reading, finished" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/books/search",
    category: "Books",
    description:
      "Search for books. Returns catalog matches and our stored copy of Open Library's results. When that copy is missing, call Open Library yourself and report the results to /books/search/ingest",
    requiresAuth: true,
    queryParams: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "Search query",
      },
      {
        name: "page",
        type: "number",
        required: false,
        description: "Open Library results page, 20 per page (default: 1, max: 50)",
      },
    ],
    responses: [
      {
        status: 200,
        description:
          "catalog holds matching books we already have (first page only). openLibrary.status is \"hit\" with results and numFound, or \"miss\": search https://openlibrary.org/search.json?q=...&page=...&limit=20&fields=key,title,author_name,cover_i,isbn,number_of_pages_median,first_publish_year from the device, then POST the docs to /books/search/ingest.",
        example: {
          catalog: [
            {
              id: "uuid...",
              key: "/works/OL468431W",
              isbn: "9780743273565",
              title: "The Great Gatsby",
              author: "F. Scott Fitzgerald",
              coverUrl: "https://...",
              pages: 180,
              publishedYear: 1925,
              source: "internal",
            },
          ],
          openLibrary: { status: "miss" },
        },
      },
      {
        status: 429,
        description: "More than 60 searches in a minute",
        example: { error: "Too many searches" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/books/search/ingest",
    category: "Books",
    description:
      "Report a page of Open Library results you fetched, so they are stored for every user. Returns each work's catalog book id",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        query: "string (required)",
        page: "number (required, 1-50)",
        numFound: "number (required, Open Library's total)",
        docs: "OpenLibraryDoc[] (required, max 20: key, title, author_name, first_publish_year, isbn, cover_i, number_of_pages_median)",
      },
      example: {
        query: "the great gatsby",
        page: 1,
        numFound: 412,
        docs: [
          {
            key: "/works/OL468431W",
            title: "The Great Gatsby",
            author_name: ["F. Scott Fitzgerald"],
            first_publish_year: 1925,
            cover_i: 123,
          },
        ],
      },
    },
    responses: [
      {
        status: 200,
        description: "Work key to catalog book id",
        example: { ids: { "/works/OL468431W": "uuid..." } },
      },
      {
        status: 400,
        description: "Invalid search results",
        example: { error: "Invalid search results" },
      },
      {
        status: 429,
        description: "More than 120 ingests in an hour",
        example: { error: "Too many requests" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/catalog/{bookId}",
    category: "Books",
    description:
      "Get a catalog book (by catalog book ID) with your library entry, your review, and public reviews by people you follow",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Book detail",
        example: {
          book: { id: "uuid...", title: "1984", author: "George Orwell", pages: 328 },
          userBook: { id: "uuid...", status: "reading", currentPage: 120, pageCount: 328 },
          myReview: null,
          followingReviews: [
            {
              id: "uuid...",
              content: "Chilling.",
              isPrivate: false,
              createdAt: "2025-01-15T10:00:00Z",
              user: { id: "user_456", username: "bookworm", displayName: null, profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false },
            },
          ],
        },
      },
      {
        status: 404,
        description: "Book not found",
        example: { error: "Book not found" },
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
    description:
      "Update reading progress. When both fields are sent, pageCount is applied first. currentPage can't exceed the page count (yours, else the catalog's); reaching it marks the book finished, any other page above 0 marks it reading.",
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
      {
        status: 400,
        description: "Validation error",
        example: { error: "Current page cannot exceed total pages" },
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
        description:
          "Catalog book ID: public reviews of the book plus your own private one. Without it: all your reviews.",
      },
      {
        name: "scope",
        type: "string",
        required: false,
        description: '"following": only public reviews of bookId by users you follow',
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

  {
    method: "GET",
    path: "/api/v1/users/{userId}",
    category: "Social",
    description:
      "Get a user's public profile: stats, follow counts, shelves (up to 6 books each) and public collections",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Public profile",
        example: {
          user: { id: "user_456", username: "bookworm", displayName: "Book Worm", profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false, bio: "I love reading!" },
          stats: { booksFinishedThisYear: 12, finishedCount: 87 },
          followerCount: 34,
          followingCount: 20,
          isFollowing: true,
          currentlyReading: [{ id: "uuid...", status: "reading", book: { title: "Dune" } }],
          recentlyFinished: [],
          favorites: [],
          publicCollections: [{ id: "uuid...", name: "Sci-Fi", slug: "sci-fi-1a2b3c4d", colorTag: "blue-500", iconName: "rocket", bookCount: 8 }],
        },
      },
      {
        status: 404,
        description: "User not found",
        example: { error: "User not found" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/users/{userId}/followers",
    category: "Social",
    description: "List a user's followers, newest first",
    requiresAuth: true,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Default: 20, max: 50" },
      { name: "offset", type: "number", required: false, description: "Default: 0, max: 10000" },
    ],
    responses: [
      {
        status: 200,
        description: "A page of users (isFollowing: whether you follow them)",
        example: {
          results: [{ id: "user_789", username: "reader123", displayName: null, profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false, isFollowing: false }],
          hasMore: false,
        },
      },
      {
        status: 404,
        description: "User not found",
        example: { error: "User not found" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/users/{userId}/following",
    category: "Social",
    description: "List the users a user follows, newest first",
    requiresAuth: true,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Default: 20, max: 50" },
      { name: "offset", type: "number", required: false, description: "Default: 0, max: 10000" },
    ],
    responses: [
      {
        status: 200,
        description: "A page of users (isFollowing: whether you follow them)",
        example: {
          results: [{ id: "user_456", username: "bookworm", displayName: "Book Worm", profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false, isFollowing: true }],
          hasMore: false,
        },
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
          displayName: "Book Worm",
          profilePictureUrl: null, profilePictureBlurhash: null,
          role: "user",
          isPremium: false,
          planName: "Free",
        },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/profile",
    category: "Profile",
    description:
      'Partially update your profile. Only fields present in the body change; null or "" clears a field. The username can be changed but not cleared.',
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        username: "string (optional, 3-30 chars, letters, numbers, _ and .)",
        displayName: "string | null (optional, max 100)",
        bio: "string | null (optional, max 1000)",
        profilePictureUrl: "string | null (optional, a publicUrl from /profile/picture-upload-url)",
      },
      example: {
        bio: "Avid reader and book reviewer",
      },
    },
    responses: [
      {
        status: 200,
        description:
          "Profile updated. profilePictureBlurhash is generated server-side whenever profilePictureUrl is set (null when cleared).",
        example: {
          success: true,
          profilePictureUrl: "https://s3.example.com/bucket/pfp/user_123/1700000000000.jpg",
          profilePictureBlurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Username already taken" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/profile/stats",
    category: "Profile",
    description: "Your reading stats (this calendar year and library totals)",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Stats",
        example: {
          booksFinishedThisYear: 12,
          pagesReadThisYear: 3840,
          totalBooks: 57,
          countsByStatus: { want: 30, reading: 3, finished: 24 },
          favoritesCount: 6,
        },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/profile/username-available",
    category: "Profile",
    description:
      "Check whether you can take a username (same rules as PUT /profile; your current username counts as available)",
    requiresAuth: true,
    queryParams: [
      { name: "username", type: "string", required: true, description: "Username to check" },
    ],
    responses: [
      { status: 200, description: "Available", example: { available: true } },
      {
        status: 200,
        description: "Not available",
        example: { available: false, reason: "Username already taken" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/profile/picture-upload-url",
    category: "Profile",
    description:
      "Get a presigned S3 URL for a profile picture. PUT the file to uploadUrl with the same Content-Type within expiresIn seconds, then save publicUrl via PUT /profile.",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        contentType: '"image/jpeg" | "image/png" | "image/webp" (required)',
        fileSize: "number (bytes, required, max 5 MB)",
      },
      example: { contentType: "image/jpeg", fileSize: 245760 },
    },
    responses: [
      {
        status: 200,
        description: "Upload URL",
        example: {
          uploadUrl: "https://bucket.s3.amazonaws.com/pfp/user_123/1736935200000.jpg?X-Amz-...",
          publicUrl: "https://echoreads.b-cdn.net/pfp/user_123/1736935200000.jpg",
          expiresIn: 300,
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Invalid file type. Supported: JPG, PNG, WEBP" },
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
            colorTag: "blue-500",
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
        colorTag: 'string (optional, Tailwind palette-shade token, e.g. "blue-500")',
        iconName: "string (optional)",
      },
      example: {
        name: "Sci-Fi Favorites",
        description: "My favorite science fiction novels",
        isPublic: true,
        colorTag: "emerald-500",
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
          colorTag: "emerald-500",
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
      {
        status: 403,
        description: "Not a premium user",
        example: { error: "Premium subscription required to create collections" },
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
          colorTag: "blue-500",
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
        colorTag: 'string (optional, Tailwind palette-shade token, e.g. "blue-500")',
        iconName: "string (optional, Lucide icon name)",
        coverImageUrl: "string (optional, a publicUrl from /collections/{id}/cover-upload-url)",
      },
      example: {
        name: "Updated Collection Name",
        isPublic: true,
      },
    },
    responses: [
      {
        status: 200,
        description: "The updated collection",
        example: { id: "uuid...", name: "Updated Collection Name", slug: "updated-collection-name-1a2b3c4d", isPublic: true },
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
          id: "uuid...",
          collectionId: "uuid...",
          userBookId: "uuid...",
          addedAt: "2025-01-15T10:00:00Z",
          notes: null,
        },
      },
      {
        status: 400,
        description: "Validation error",
        example: { error: "Book already in collection" },
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

  {
    method: "POST",
    path: "/api/v1/collections/{id}/cover-upload-url",
    category: "Collections",
    description:
      "Get a presigned S3 URL for a collection cover (owner only). PUT the file to uploadUrl, then save publicUrl as coverImageUrl via PUT /collections/{id}.",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: {
        contentType: '"image/jpeg" | "image/png" | "image/webp" (required)',
        fileSize: "number (bytes, required, max 5 MB)",
      },
      example: { contentType: "image/png", fileSize: 512000 },
    },
    responses: [
      {
        status: 200,
        description: "Upload URL",
        example: {
          uploadUrl: "https://bucket.s3.amazonaws.com/collections/user_123/uuid-1736935200000.png?X-Amz-...",
          publicUrl: "https://echoreads.b-cdn.net/collections/user_123/uuid-1736935200000.png",
          expiresIn: 300,
        },
      },
      {
        status: 404,
        description: "Not your collection",
        example: { error: "Collection not found or unauthorized" },
      },
    ],
  },
  {
    method: "PUT",
    path: "/api/v1/collections/order",
    category: "Collections",
    description: "Reorder your collections. order must list every one of your collection IDs exactly once.",
    requiresAuth: true,
    requestBody: {
      contentType: "application/json",
      schema: { order: "string[] (collection IDs, required)" },
      example: { order: ["uuid-3...", "uuid-1...", "uuid-2..."] },
    },
    responses: [
      { status: 200, description: "Reordered", example: { success: true } },
      {
        status: 400,
        description: "Incomplete or invalid list",
        example: { error: "order must list each of your collections exactly once" },
      },
      {
        status: 404,
        description: "An ID isn't one of your collections",
        example: { error: "Collection not found or unauthorized" },
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/collections/public",
    category: "Collections",
    description: "Discover public collections, newest first (first 4 books as a preview)",
    requiresAuth: true,
    queryParams: [
      { name: "limit", type: "number", required: false, description: "Default: 20, max: 50" },
    ],
    responses: [
      {
        status: 200,
        description: "Public collections",
        example: [
          {
            id: "uuid...",
            name: "Sci-Fi Favorites",
            slug: "sci-fi-favorites-1a2b3c4d",
            colorTag: "emerald-500",
            iconName: "rocket",
            isPublic: true,
            bookCount: 12,
            followerCount: 3,
            user: { id: "user_456", username: "bookworm", displayName: null, profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false },
            books: [{ id: "uuid...", book: { title: "Dune" } }],
          },
        ],
      },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/collections/{idOrSlug}/public",
    category: "Collections",
    description: "View any public collection, or one of your own private ones, by ID or slug",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Collection with owner, books and follow state",
        example: {
          id: "uuid...",
          name: "Sci-Fi Favorites",
          slug: "sci-fi-favorites-1a2b3c4d",
          isPublic: true,
          bookCount: 12,
          followerCount: 3,
          isFollowing: false,
          user: { id: "user_456", username: "bookworm", displayName: null, profilePictureUrl: null, profilePictureBlurhash: null, isAdmin: false },
          books: [{ id: "uuid...", status: "finished", book: { title: "Dune" } }],
        },
      },
      {
        status: 404,
        description: "Not found, or another user's private collection",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/collections/{id}/follow",
    category: "Collections",
    description: "Follow another user's public collection",
    requiresAuth: true,
    responses: [
      { status: 201, description: "Followed", example: { success: true } },
      {
        status: 400,
        description: "Already following, or your own collection",
        example: { error: "Already following this collection" },
      },
      {
        status: 404,
        description: "Not found, or private",
        example: { error: "Collection not found" },
      },
    ],
  },
  {
    method: "DELETE",
    path: "/api/v1/collections/{id}/follow",
    category: "Collections",
    description: "Unfollow a collection",
    requiresAuth: true,
    responses: [
      { status: 200, description: "Unfollowed", example: { success: true } },
      { status: 404, description: "Collection not found", example: { error: "Collection not found" } },
    ],
  },

  // Subscriptions API
  {
    method: "GET",
    path: "/api/v1/subscriptions",
    category: "Subscriptions",
    description: "Get your current subscription and plan details. Subscription source is lemonsqueezy, app_store, play_store, or manual.",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Subscription details (active subscription)",
        example: {
          subscription: {
            id: "uuid...",
            status: "active",
            source: "lemonsqueezy",
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
  

  {
    method: "POST",
    path: "/api/v1/subscriptions/sync",
    category: "Subscriptions",
    description: "Refresh App Store / Google Play Premium from RevenueCat after purchase or restore. Returns the same body as GET /api/v1/subscriptions, including subscription.source (lemonsqueezy, app_store, play_store, or manual). If RevenueCat is unavailable, returns the current saved state. Limited to 5 requests per user per minute.",
    requiresAuth: true,
    responses: [
      {
        status: 200,
        description: "Current subscription and plan details (same as GET /api/v1/subscriptions)",
        example: {
          subscription: {
            id: "uuid...",
            source: "app_store",
            status: "active",
            currentPeriodStart: "2025-01-01T00:00:00Z",
            currentPeriodEnd: "2025-02-01T00:00:00Z",
            cancelAtPeriodEnd: false,
          },
          plan: { id: "uuid...", name: "Premium Monthly", price: 999, interval: "month" },
          isActive: true,
          isFree: false,
        },
      },
      { status: 401, description: "Unauthorized", example: { error: "Unauthorized" } },
      { status: 429, description: "Rate limit exceeded", example: { error: "Too many requests" } },
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
                displayName: "Book Worm",
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
                displayName: null,
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
    description: "Search for users by username or display name",
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
              displayName: "Book Worm",
              bio: "I love reading!",
              isFollowing: true,
            },
            {
              id: "user_789",
              username: "reader123",
              displayName: null,
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
