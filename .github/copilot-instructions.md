<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Faithnte.com - Astro Headless Blog Platform

This is an Astro-based website for faithnte.com featuring a headless blog system with RESTful API endpoints.

## Project Architecture

- **Framework**: Astro v5 with TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Node.js adapter for SSR capabilities
- **Blog System**: Headless architecture with API-first approach

## Key Components

### API Endpoints
- `/api/blog` - Get all blog posts (paginated)
- `/api/blog?featured=true` - Get featured posts only
- `/api/blog/[slug]` - Get specific post by slug
- `/api/blog/tags/[tag]` - Get posts filtered by tag

### File Structure
- `src/pages/` - Page routes and API endpoints
- `src/components/` - Reusable Astro components
- `src/layouts/` - Layout templates
- `src/lib/` - Utility functions and data management
- `src/types/` - TypeScript type definitions

### Data Management
- Blog posts are currently stored in `src/lib/blog.ts` as mock data
- All API responses follow a consistent `APIResponse<T>` interface
- Posts include metadata for SEO, pagination, and filtering

## Development Guidelines

1. **API Responses**: Always use the `APIResponse<T>` wrapper for consistent error handling
2. **TypeScript**: Maintain strict typing throughout the codebase
3. **Accessibility**: Ensure all components follow WCAG guidelines
4. **Performance**: Leverage Astro's static generation where possible
5. **SEO**: Include proper meta tags and structured data for all pages

## Blog Post Structure

Each blog post includes:
- Unique ID and slug for routing
- SEO metadata (title, excerpt, cover image)
- Author and publication timestamps
- Tags for categorization
- Featured flag for homepage display
- Full markdown content

## Styling Conventions

- Use Tailwind CSS utility classes
- Follow responsive-first design approach
- Maintain consistent color scheme (blue/purple gradient theme)
- Use semantic HTML elements for better accessibility

When working with this codebase, prioritize headless architecture principles and maintain the separation between content API and presentation layer.
