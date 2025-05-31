# deCort.tech - Portfolio Website with Blog

Personal portfolio website hosted at [decort.tech](https://decort.tech), featuring my CV and a technical blog focused on development, infrastructure, and automation.

## Features

- 📱 **Responsive Design**: Modern, mobile-first portfolio layout
- 📝 **Technical Blog**: Organized by categories and tags with search functionality
- 🔍 **Search**: JSON-powered search through blog posts
- 📡 **RSS Feed**: Automatic feed generation for blog posts
- 🎯 **SEO Optimized**: Meta tags, structured data, and social media integration
- 🖼️ **Image Optimization**: WebP conversion and automated compression
- 🏷️ **Content Organization**: Categories, tags, and featured post support
- 📄 **Pagination**: Clean pagination for blog listings (9 posts per page)

## Development Environment

This project uses **Nix with devenv** for a reproducible development environment. Docker is also available as an alternative.

### Primary Method: Nix + devenv (Recommended)

1. **Install Nix** (if not already installed):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
   ```

2. **Install devenv**:

   ```bash
   nix profile install nixpkgs#devenv
   ```

3. **Enter the development environment**:

   ```bash
   devenv shell
   ```

4. **Set up the project**:

   ```bash
   setup
   ```

5. **Start the development server**:
   ```bash
   serve
   ```

The site will be available at http://localhost:4000

#### Available Commands

- `setup` - Install/update Ruby gems
- `serve` - Start Jekyll development server with live reload
- `build` - Build the Jekyll site for production
- `clean` - Clean build artifacts
- `optimize-images` - Optimize images for web performance

### Alternative Method: Docker

If you prefer Docker, you can use the included Docker setup:

1. **Start the development server**:

   ```bash
   docker-compose up
   ```

2. **Visit** http://localhost:4000 in your browser

## Blog

### Content Organization

Blog posts are organized in a hierarchical structure:

```
_posts/
  └── YYYY/
      └── MM/
          └── YYYY-MM-DD-post-title.md
```

### Adding Blog Posts

1. **Create a new Markdown file** in the appropriate year/month directory under `_posts/`
2. **Name it** with the format: `YYYY-MM-DD-title.md`
3. **Add front matter** at the top:

```yaml
---
layout: post
title: "Your Post Title"
date: YYYY-MM-DD
last_modified_date: YYYY-MM-DD
category: technology # Primary category
tags: [tag1, tag2, tag3] # Related tags
featured: true # Optional: mark as featured post
image: /assets/images/posts/YYYY/MM/post-title/header.webp # Optional header image
excerpt: "Brief description of the post content for SEO and previews."
---
```

4. **Write your content** in Markdown below the front matter

### Image Management

Images should be organized in:

```
assets/images/posts/YYYY/MM/post-title/
```

Use the `optimize-images` command to automatically:

- Create backups of original images
- Compress PNG and JPEG files
- Generate WebP versions for better performance

## Architecture

- **Static Site Generator**: Jekyll 4.x
- **Styling**: SCSS with organized architecture (abstracts, base, components, layout, pages)
- **Code Quality**: StyleLint for CSS linting
- **SEO**: Jekyll SEO Tag plugin
- **Analytics**: Ready for Google Analytics integration
- **Performance**: Image optimization and compression

## Tech Stack

### Core

- Jekyll 4.x (Static Site Generator)
- Ruby 3.2
- Liquid templating
- Kramdown (Markdown processor)
- Rouge (Syntax highlighting)

### Frontend

- SCSS (Sass)
- Responsive CSS Grid/Flexbox
- Modern JavaScript (ES6+)
- Web-optimized images (WebP support)

### Development Tools

- Nix + devenv (Primary development environment)
- Docker + Docker Compose (Alternative)
- StyleLint (CSS linting)
- Jekyll Live Reload
- Image optimization pipeline

### Deployment

- GitHub Pages
- Custom domain (decort.tech)
- Automated builds on push to main

## Project Structure

```
portfolio/
├── _includes/          # Reusable template components
├── _layouts/           # Page layouts
├── _posts/             # Blog posts organized by year/month
├── _site/              # Generated site (git-ignored)
├── assets/
│   ├── css/            # Compiled CSS
│   ├── images/         # Images and media
│   ├── js/             # JavaScript files
│   └── scss/           # SCSS source files
│       ├── abstracts/  # Variables, mixins, functions
│       ├── base/       # Reset, typography, base styles
│       ├── components/ # UI components
│       ├── layout/     # Header, footer, navigation
│       └── pages/      # Page-specific styles
├── blog/               # Blog listing pages
├── _config.yml         # Jekyll configuration
├── devenv.nix          # Nix development environment
└── Gemfile             # Ruby dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally using `devenv shell` and `serve`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using Jekyll, Nix, and modern web technologies.
