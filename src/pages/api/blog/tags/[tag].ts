import type { APIRoute } from 'astro';
import { getPostsByTag } from '../../../../lib/blog';
import type { APIResponse, BlogPostMeta } from '../../../../types/blog';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { tag } = params;
    
    if (!tag) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Tag parameter is required'
      };
      
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const posts = await getPostsByTag(tag);
    
    const postMetas: BlogPostMeta[] = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author: post.author,
      publishedAt: post.publishedAt,
      tags: post.tags,
      featured: post.featured,
      coverImage: post.coverImage
    }));

    const response: APIResponse<BlogPostMeta[]> = {
      success: true,
      data: postMetas
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to fetch blog posts by tag',
      message: error instanceof Error ? error.message : 'Unknown error'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const prerender = false;
