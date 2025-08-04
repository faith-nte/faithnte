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
      console.log(
        `Fetching WordPress posts (attempt ${attempt}/${maxRetries}) from:`,
        WORDPRESS_API_URL
      );
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
      console.log(
        `WordPress API response status (attempt ${attempt}):`,
        response.status
      );

      if (!response.ok) {
        console.error(
          `WordPress API error (attempt ${attempt}): ${response.status} ${response.statusText}`
        );
        throw new Error(`WordPress API error: ${response.status}`);
      }

      const wpPosts: WordPressPost[] = await response.json();
      console.log(
        `Successfully fetched ${wpPosts.length} posts from WordPress (attempt ${attempt})`
      );

      if (!wpPosts || wpPosts.length === 0) {
        console.warn(
          `No posts returned from WordPress API (attempt ${attempt})`
        );
        throw new Error("No posts returned from API");
      }

      const transformedPosts = wpPosts.map(transformWordPressPost);
      console.log(`Transformed ${transformedPosts.length} posts successfully`);

      return transformedPosts;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Error fetching WordPress posts (attempt ${attempt}):`,
        lastError
      );

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
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
      title:
        "How We Transformed NHS GP Website with WordPress & Nightingale Theme and How You Can Achieve the Same",
      slug: "gp-website-with-wordpress-nightingale-theme",
      excerpt:
        "In May 2023, NHSE released a GP website benchmarking and improvement tool. The tool has three focuses but the top two are: The top tasks that patients want to do on a GP website and The things that patients found most challenging on GP websites. At our PCN, we used this tool to benchmark our GP websites, improve them, and create an adjusted benchmarking framework that meets all NHS guidelines.",
      content: `<div id="ez-toc-container" class="ez-toc-v2_0_75 counter-hierarchy ez-toc-counter ez-toc-grey ez-toc-container-direction">
<div class="ez-toc-title-container">
<p class="ez-toc-title" style="cursor:inherit">Table of Contents</p>
</div>
<nav><ul class='ez-toc-list ez-toc-list-level-1 '>
<li class='ez-toc-page-1 ez-toc-heading-level-2'><a class="ez-toc-link ez-toc-heading-1" href="#How_do_our_GP_websites_meet_the_top_tasks_that_patients_want_to_do_on_a_GP_website">How do our GP websites meet the top tasks that patients want to do on a GP website?</a></li>
<li class='ez-toc-page-1 ez-toc-heading-level-2'><a class="ez-toc-link ez-toc-heading-2" href="#We_use_a_homepage_pop-up_but_how_does_it_help_patients_use_the_website">We use a homepage pop-up, but how does it help patients use the website?</a></li>
<li class='ez-toc-page-1 ez-toc-heading-level-2'><a class="ez-toc-link ez-toc-heading-4" href="#Why_Did_We_Revamp_the_Website">Why Did We Revamp the Website?</a></li>
<li class='ez-toc-page-1 ez-toc-heading-level-2'><a class="ez-toc-link ez-toc-heading-5" href="#Why_Website_Suppliers_Alone_Are_Not_the_Answer_to_a_Compliant_GP_Surgery_Website">Why Website Suppliers Alone Are Not the Answer to a Compliant GP Surgery Website</a></li>
<li class='ez-toc-page-1 ez-toc-heading-level-2'><a class="ez-toc-link ez-toc-heading-7" href="#Why_WordPress_is_the_Most_Suited_for_GP_PCN_Websites">Why WordPress is the Most Suited for GP & PCN Websites</a></li>
</ul></nav>
</div>

<p>In May 2023, NHSE released a GP website benchmarking and improvement tool.</p>

<p>The tool has three focuses but the top two are:</p>

<ol class="wp-block-list">
<li>The top tasks that patients want to do on a GP website</li>
<li>The things that patients found most challenging on GP websites</li>
</ol>

<p>At our PCN, we used this tool to benchmark our GP websites, improve them, and create an adjusted benchmarking framework that meets all NHS guidelines.</p>

<h2 class="wp-block-heading">How do our GP websites meet the top tasks that patients want to do on a GP website?</h2>

<p>There are four key patient priorities when they visit a GP website:</p>

<ul class="wp-block-list">
<li>Book appointments,</li>
<li>Repeat prescription information,</li>
<li>Get test results,</li>
<li>Find opening hours and contact information</li>
</ul>

<p>Recent GP website design adopted square boxes for each item.</p>

<p>We followed this best practice; the first two boxes are book appointments and repeat prescription information.</p>

<p>Grouped the test results and repeat prescriptions under the NHS App box.</p>

<p>As the NHS App has become a preferred way of managing test result requests</p>

<p>Information on opening hours and contact-us were grouped as top items on the website menu.</p>

<h2 class="wp-block-heading">Why WordPress is the Most Suited for GP & PCN Websites</h2>

<p>When it comes to IT solutions, numbers matter.</p>

<p>WordPress powers 43% of all websites globally with a large amount of developers contributing to the platform.</p>

<p>This means you can easily find WordPress talent than you would ASP.net</p>

<p>Some suppliers use the Nightingale theme build by NHS Leadership Academy Digital Team</p>

<p>you can use the same.</p>

<p>It makes it easier to deploy an NHS compliant website in minutes</p>`,
      author: "Faith Nte",
      publishedAt: "2025-01-12T22:06:33",
      updatedAt: "2025-02-03T20:04:28",
      tags: ["nhs", "wordpress", "website"],
      featured: true,
      published: true,
      coverImage:
        "https://blog.faithnte.com/wp-content/uploads/2025/01/transformed-gp-website-with-wordpress-cms-and-nightingale-theme.png",
    },
    {
      id: "22",
      title: "Achieved 9% Growth in NHS App Uptake in 8 Months",
      slug: "9-nhs-app-uptake-in-8-months",
      excerpt:
        "Our PCN got into 2024 at 55% NHS App uptake. A fairly good amount, but our ICB wanted 70% by December 2024. If we increased monthly registration from 140 to 220, we could only reach 70% by December 2025 (one year later).",
      content: `<p>Our PCN got into 2024 at 55% NHS App uptake.</p>

<p>A fairly good amount, but our ICB wanted 70% by December 2024.</p>

<p>If we increased monthly registration from 140 to 220, we could only reach 70% by December 2025 (one year later).</p>

<h2 class="wp-block-heading"><strong>The Challenge</strong>:</h2>

<p>Covid-19 was the primary reason many people downloaded the NHS App.</p>

<p>I was told, "We do not tell people which app to use; they just figure it out."</p>

<p>GPs were only responsible for issuing online access. This means giving people access to their medical records.</p>

<p>But not how they access this record.</p>

<p>The GP staff issues a linkage key, and the patient decides whether to use it on Evergreenlive, Patient Access, or tens of other patient-facing service providers</p>

<p>However, the risk I found with this is when you see the GP Patient Survey, only the NHS App and GP website access option were taken into account</p>

<p>They are one of the two areas in which patients of GP surgeries have expressed dissatisfaction the most.</p>

<h2 class="wp-block-heading">What we did to increase the NHS App Uptake</h2>

<ol class="wp-block-list">
<li>I worked with Marta Fischer, the ICB Digital Access Lead, to train our GP admin staff on how to support patients getting on the NHS App</li>
<li>Organised a drop-in session supported by our GP practice managers and colleagues</li>
<li>Established a monthly Digital Café, now Digital Clinic at both practices to support people to download and use the NHS App</li>
</ol>

<h3 class="wp-block-heading">We have now increased our NHS App uptake to a pre-covid record high of 400 monthly registrations</h3>

<ul class="wp-block-list">
<li>Expected to reach 70% 6 months earlier than projected</li>
<li>64% uptake in December 2024</li>
<li>Have knowledgeable GP staff supporting and triaging patients with NHS App issues</li>
<li>Issued proxy access to 5 of 6 eligible care homes in Wantage</li>
</ul>

<h2 class="wp-block-heading">What value does the NHS app present to GP surgeries?</h2>

<p>With most GPs moving from traditional appointments to a triage system,</p>

<p>the cost of messaging patients has increased</p>

<p>With some of our practices, using around 30,000 fragments (1 fragment is 160 characters or like 1 SMS page) messages per month</p>

<p>BOB ICB withdrew SMS funding for self-booking messages.</p>

<p>With the NHS App being a free service, GPs can save the cost of 2.25p per sms sent</p>

<p>and include all required consultation information without feeling they are using too many fragments.</p>`,
      author: "Faith Nte",
      publishedAt: "2025-01-01T21:49:13",
      updatedAt: "2025-02-03T20:04:51",
      tags: ["nhs", "digital-transformation"],
      featured: true,
      published: true,
      coverImage:
        "https://blog.faithnte.com/wp-content/uploads/2025/01/nhs-app-uptake-growth.png",
    },
    {
      id: "7",
      title:
        "Care Home Proxy Access: How We Did It – 4 Steps to Achieve the Same with This NHS Template",
      slug: "care-home-proxy-access",
      excerpt:
        "Care home proxy access enables care home staff to access residents' GP services on time. Every week, a GP from the surgery gets an appointment to visit a resident of a care home who has a medical problem. Any observation from such a visit is recorded in the resident's patient profile in the GP system.",
      content: `<p class="has-text-align-center"><em>Care home proxy access enables care home staff to access residents' GP services on time</em></p>

<p>Every week, a GP from the surgery gets an appointment to visit a resident of a care home who has a medical problem.</p>

<p>Any observation from such a visit is recorded in the resident's patient profile in the GP system.</p>

<p>The Enhanced Health in Care Home (EHCH) framework expects healthcare providers and Care Home staff to communicate better to improve resident care.</p>

<p>To support better communication, some GP surgeries have an assigned admin staff member who enters each patient note and emails each consultation to the Care Homes.</p>

<p>If the GP saw seven patients, an admin staff would email these seven consultations to the care homes.</p>

<p>The problem with this method is that:</p>

<p>This model can quickly increase admin staff's workload and become a barrier for many GPs to meet the EHCH expectation.</p>

<p>It is also a duplicated effort!</p>

<p>Couple with the risk of missing out on some consultations due to manual human error.</p>

<h2 class="wp-block-heading">With proxy access</h2>

<p>The care home staff sees the consultation in the resident's medical note when the GP enters it.</p>

<img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXduAYn2jZcpcpJKW5_xdnH40E4gCdDGZ1FMlGKWRPzfdvtcvijPXWJ0lNprYi-M1tFIemTo5VqarKUEZFoj_9N-vPwIZ2DBbXiJ3D_3Qx8_uZf3qHx1exJn_92nF59hQqh8KXF1-w?key=mFQUtj2QysCwYptqbGYTSFVO" alt="what is proxy access?" style="max-width: 100%; height: auto;" />

<p>Anyone responsible for their care, like Care Home staff who needs to order cream for a resident,</p>

<p>can see what cream they are on and quickly make such a request without phoning the GP.</p>

<p>Resulting in time-saving for the carer and improved care for the resident without adding workload for the GP.</p>

<h2 class="wp-block-heading">Benefits of proxy access</h2>

<p>This Firmley ICB document summarises the benefits of proxy access for repeat prescriptions well.</p>

<img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXf-MzoRDZhVhzDOsMOJNvAwc7G9GUYPtjN9NJzWbi0JHkvgUbJAcI3dd-amKYcI3dKwHYe6vICrZSBnzIcBmA9kI9P3bDApvi8oCRUhiyKwsBd8yHAD5_5DP0ms3Bf7ZCSh28Cv?key=mFQUtj2QysCwYptqbGYTSFVO" alt="firmley icb description of the benefit of proxy access" style="max-width: 100%; height: auto;" />

<p>But you can do more with proxy access</p>

<h3 class="wp-block-heading">View consultations:</h3>

<p>Fulfilling the EHCH is easier if GP practices give care homes access to view consultations.</p>

<p>This also gives them access to view allergies and medication, which can be limited to your desired period.</p>

<p>With this access, Care Home staff can view PRNs (medications that are used as needed, like the cream example used earlier)</p>

<h2 class="wp-block-heading"><strong>Save one working day with this proxy access hack</strong></h2>

<p>3 in 10 care home staff switch jobs every year</p>

<p>That means GP staff will dedicate one working day in a year to issue proxy access to an average size care home</p>

<p>But you should only spend such time when setting it up the first time.</p>

<p>To save this time, you should limit the number of care home staff who can use proxy access.</p>

<p>The max we have done so far is six staff per care home.</p>

<p>Once you have established this, you only need to replace any leaver with the new staff</p>

<h2 class="wp-block-heading">Deliver care home proxy access in your PCN with this template</h2>

<p>Whether you are a DTL or Practice Manager, this NHS template is all you need</p>

<p>Download the NHS care home proxy access template</p>`,
      author: "Faith Nte",
      publishedAt: "2024-12-21T12:11:50",
      updatedAt: "2025-02-03T20:05:15",
      tags: ["nhs", "care-homes"],
      featured: true,
      published: true,
      coverImage:
        "https://blog.faithnte.com/wp-content/uploads/2024/12/care-home-proxy-access.png",
    },
  ];
}
