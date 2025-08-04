import type { BlogPost, BlogPostMeta, PaginatedBlogPosts } from "../types/blog";

// WordPress API configuration
const WORDPRESS_API_URL = "https://blog.faithnte.com/wp-json/wp/v2/posts";

// WordPress post interface (WordPress API structure)
interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  author: number;
  featured_media: number;
  tags: number[];
  categories: number[];
  meta: any;
  _embedded?: {
    author?: Array<{
      id: number;
      name: string;
      slug: string;
    }>;
    "wp:featuredmedia"?: Array<{
      id: number;
      source_url: string;
      alt_text: string;
    }>;
    "wp:term"?: Array<
      Array<{
        id: number;
        name: string;
        slug: string;
        taxonomy: string;
      }>
    >;
  };
}

// Cache for blog posts to avoid repeated API calls
let postsCache: BlogPost[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Transform WordPress post to our BlogPost format
function transformWordPressPost(wpPost: WordPressPost): BlogPost {
  // Extract author name from embedded data or fallback
  const authorName = wpPost._embedded?.author?.[0]?.name || "Faith Nte";

  // Extract featured image from embedded data
  const coverImage = wpPost._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

  // Extract tags from embedded data
  const tags =
    wpPost._embedded?.["wp:term"]?.[0]
      ?.filter((term) => term.taxonomy === "post_tag")
      ?.map((tag) => tag.slug) || [];

  // Clean excerpt (remove HTML tags)
  const cleanExcerpt = wpPost.excerpt.rendered.replace(/<[^>]*>/g, "").trim();

  return {
    id: wpPost.id.toString(),
    title: wpPost.title.rendered,
    slug: wpPost.slug,
    excerpt: cleanExcerpt,
    content: wpPost.content.rendered,
    author: authorName,
    publishedAt: wpPost.date,
    updatedAt: wpPost.modified,
    tags: tags,
    featured: false, // WordPress doesn't have a direct "featured" field, we'll handle this separately
    published: wpPost.status === "publish",
    coverImage: coverImage,
  };
}

// Fetch posts from WordPress API with retry logic
async function fetchWordPressPosts(): Promise<BlogPost[]> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching WordPress posts (attempt ${attempt}/${maxRetries}) from:`, WORDPRESS_API_URL);
      console.log(
        "Environment:",
        typeof window !== "undefined" ? "browser" : "server"
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      const response = await fetch(
        `${WORDPRESS_API_URL}?_embed=true&per_page=100&status=publish`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Faithnte-Website/1.0",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      console.log(`WordPress API response status (attempt ${attempt}):`, response.status);

      if (!response.ok) {
        console.error(
          `WordPress API error (attempt ${attempt}): ${response.status} ${response.statusText}`
        );
        throw new Error(`WordPress API error: ${response.status}`);
      }

      const wpPosts: WordPressPost[] = await response.json();
      console.log(`Successfully fetched ${wpPosts.length} posts from WordPress (attempt ${attempt})`);

      if (!wpPosts || wpPosts.length === 0) {
        console.warn(`No posts returned from WordPress API (attempt ${attempt})`);
        throw new Error("No posts returned from API");
      }

      const transformedPosts = wpPosts.map(transformWordPressPost);
      console.log(`Transformed ${transformedPosts.length} posts successfully`);

      return transformedPosts;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error fetching WordPress posts (attempt ${attempt}):`, lastError);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("All retry attempts failed, using fallback posts");
  console.error("Final error:", lastError);
  
  // Return fallback posts after all retries failed
  console.log("Returning fallback posts with real content");
  return getFallbackPosts();
}

// Get all posts with caching
export async function getAllPosts(): Promise<BlogPost[]> {
  const now = Date.now();

  // Return cached data if it's still valid
  if (postsCache && now - cacheTimestamp < CACHE_DURATION) {
    return postsCache;
  }

  // Fetch fresh data
  postsCache = await fetchWordPressPosts();
  cacheTimestamp = now;

  return postsCache;
}

// Get posts with pagination
export async function getPaginatedPosts(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedBlogPosts> {
  const allPosts = await getAllPosts();
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const posts = allPosts.slice(startIndex, endIndex);

  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / limit);

  // Convert to BlogPostMeta (without content)
  const postMetas = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    author: post.author,
    publishedAt: post.publishedAt,
    tags: post.tags,
    featured: post.featured,
    coverImage: post.coverImage,
  }));

  return {
    posts: postMetas,
    pagination: {
      currentPage: page,
      totalPages,
      totalPosts,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Get post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const allPosts = await getAllPosts();
  return allPosts.find((post) => post.slug === slug) || null;
}

// Get featured posts (we'll mark the first 3 posts as featured for now)
export async function getFeaturedPosts(): Promise<BlogPost[]> {
  const allPosts = await getAllPosts();
  // Mark first 3 posts as featured
  return allPosts.slice(0, 3).map((post) => ({ ...post, featured: true }));
}

// Get posts by tag
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) => post.tags.includes(tag));
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const tags = new Set<string>();
  allPosts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

// Fallback posts for when WordPress API is unavailable
function getFallbackPosts(): BlogPost[] {
  return [
    {
      id: "49",
      title: "How We Transformed NHS GP Website with WordPress & Nightingale Theme and How You Can Achieve the Same",
      slug: "gp-website-with-wordpress-nightingale-theme",
      excerpt: "In May 2023, NHSE released a GP website benchmarking and improvement tool. The tool has three focuses but the top two are: At our PCN, we used this tool to benchmark our GP websites, improve them, and create an adjusted benchmarking framework that meets all NHS guidelines.",
      content: "<p>In May 2023, NHSE released a GP website benchmarking and improvement tool. The tool has three focuses but the top two are...</p>",
      author: "Faith Nte",
      publishedAt: "2025-01-12T22:06:33",
      updatedAt: "2025-02-03T20:04:28",
      tags: ["nhs", "wordpress", "website"],
      featured: true,
      published: true,
      coverImage: "https://blog.faithnte.com/wp-content/uploads/2025/01/transformed-gp-website-with-wordpress-cms-and-nightingale-theme.png",
    },
    {
      id: "22",
      title: "Achieved 9% Growth in NHS App Uptake in 8 Months",
      slug: "9-nhs-app-uptake-in-8-months",
      excerpt: "Our PCN got into 2024 at 55% NHS App uptake. A fairly good amount, but our ICB wanted 70% by December 2024. If we increased monthly registration from 140 to 220, we could only reach 70% by December 2025 (one year later).",
      content: "<p>Our PCN got into 2024 at 55% NHS App uptake. A fairly good amount, but our ICB wanted 70% by December 2024...</p>",
      author: "Faith Nte", 
      publishedAt: "2025-01-01T21:49:13",
      updatedAt: "2025-02-03T20:04:51",
      tags: ["nhs", "digital-transformation"],
      featured: true,
      published: true,
      coverImage: undefined,
    },
    {
      id: "7",
      title: "Care Home Proxy Access: How We Did It – 4 Steps to Achieve the Same with This NHS Template",
      slug: "care-home-proxy-access",
      excerpt: "Care home proxy access enables care home staff to access residents' GP services on time. Every week, a GP from the surgery gets an appointment to visit a resident of a care home who has a medical problem.",
      content: "<p>Care home proxy access enables care home staff to access residents' GP services on time...</p>",
      author: "Faith Nte",
      publishedAt: "2024-12-21T12:11:50",
      updatedAt: "2025-02-03T20:05:15", 
      tags: ["nhs", "care-homes"],
      featured: true,
      published: true,
      coverImage: undefined,
    },
  ];
}
