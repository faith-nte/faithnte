# Faithnte.com - Astro Headless Blog Platform

A modern website built with Astro featuring a headless blog system with RESTful API endpoints.

## 🚀 Features

- **Fast Performance**: Built with Astro for optimal loading speeds
- **Headless Blog**: API-first blog system for maximum flexibility
- **Modern Stack**: TypeScript, Tailwind CSS, and Node.js
- **SEO Optimized**: Built-in meta tags and structured data
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **API Endpoints**: RESTful endpoints for blog content consumption

## 🛠 Tech Stack

- [Astro](https://astro.build/) - Static site generator with SSR capabilities
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Node.js](https://nodejs.org/) - Server-side runtime for API endpoints

## 📁 Project Structure

```
src/
├── components/          # Reusable Astro components
│   └── BlogCard.astro  # Blog post card component
├── layouts/            # Layout templates
│   └── Layout.astro    # Main site layout
├── lib/                # Utility functions and data
│   └── blog.ts         # Blog data management
├── pages/              # File-based routing
│   ├── api/            # API endpoints
│   │   └── blog/       # Blog API routes
│   ├── blog/           # Blog pages
│   ├── index.astro     # Homepage
│   ├── blog.astro      # Blog listing
│   ├── about.astro     # About page
│   └── contact.astro   # Contact page
└── types/              # TypeScript definitions
    └── blog.ts         # Blog-related types
```

## 🚀 Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Build for production:**

   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## 📡 API Endpoints

The headless blog system provides the following REST API endpoints:

### Get All Posts

```
GET /api/blog
```

Returns paginated blog posts with metadata.

**Query Parameters:**

- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Posts per page (default: 10)
- `featured` (boolean): Filter for featured posts only

### Get Featured Posts

```
GET /api/blog?featured=true
```

Returns only featured blog posts.

### Get Post by Slug

```
GET /api/blog/[slug]
```

Returns a specific blog post by its slug.

### Get Posts by Tag

```
GET /api/blog/tags/[tag]
```

Returns all posts filtered by a specific tag.

## 📝 API Response Format

All API endpoints return responses in the following format:

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## 🎨 Customization

### Adding New Blog Posts

Currently, blog posts are stored in `src/lib/blog.ts`. To add new posts, update the `mockBlogPosts` array with new blog post objects.

In a production environment, you would typically:

1. Connect to a database or headless CMS
2. Update the functions in `src/lib/blog.ts` to fetch from your data source
3. Keep the API endpoints unchanged for consistency

### Styling

The project uses Tailwind CSS for styling. You can:

- Modify the theme in `tailwind.config.js`
- Update component styles in individual `.astro` files
- Customize the color scheme by updating CSS classes

## 🌐 Deployment

This project is configured for deployment with the Node.js adapter. You can deploy to:

- **Vercel**: Deploy with zero configuration
- **Netlify**: Add the Netlify adapter
- **Node.js servers**: Use the built-in Node.js adapter
- **Docker**: Create a container with the standalone build

## 🔗 API Usage Examples

### Fetch all posts with JavaScript:

```javascript
const response = await fetch("/api/blog");
const { success, data } = await response.json();
if (success) {
  console.log(data.posts);
}
```

### Get featured posts:

```javascript
const response = await fetch("/api/blog?featured=true");
const { success, data } = await response.json();
if (success) {
  console.log(data); // Array of featured posts
}
```

### Fetch a specific post:

```javascript
const response = await fetch("/api/blog/welcome-to-faithnte");
const { success, data } = await response.json();
if (success) {
  console.log(data); // Single blog post object
}
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using [Astro](https://astro.build/)
