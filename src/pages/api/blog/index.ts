import type { APIRoute } from "astro";
import { getAllPosts, getPaginatedPosts } from "../../../lib/blog";
import type {
  APIResponse,
  BlogPostMeta,
  PaginatedBlogPosts,
} from "../../../types/blog";

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const featured = searchParams.get("featured") === "true";

    if (featured) {
      // Return only featured posts
      const posts = await getAllPosts();
      const featuredPosts = posts
        .slice(0, 3)
        .map((post) => ({ ...post, featured: true }));
      const postMetas: BlogPostMeta[] = featuredPosts.map((post) => ({
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

      const response: APIResponse<BlogPostMeta[]> = {
        success: true,
        data: postMetas,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Return paginated posts
    const paginatedResult = await getPaginatedPosts(page, limit);

    const response: APIResponse<PaginatedBlogPosts> = {
      success: true,
      data: paginatedResult,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: "Failed to fetch blog posts",
      message: error instanceof Error ? error.message : "Unknown error",
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

export const prerender = false;
