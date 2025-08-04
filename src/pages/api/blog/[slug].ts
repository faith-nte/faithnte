import type { APIRoute } from "astro";
import { getPostBySlug } from "../../../lib/blog";
import type { APIResponse, BlogPost } from "../../../types/blog";

export const GET: APIRoute = async ({ params }) => {
  try {
    const { slug } = params;

    if (!slug) {
      const response: APIResponse<null> = {
        success: false,
        error: "Slug parameter is required",
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const post = await getPostBySlug(slug);

    if (!post) {
      const response: APIResponse<null> = {
        success: false,
        error: "Post not found",
      };

      return new Response(JSON.stringify(response), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const response: APIResponse<BlogPost> = {
      success: true,
      data: post,
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
      error: "Failed to fetch blog post",
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
