# Portfolio Website with Blog

This is my personal portfolio website hosted on GitHub Pages, featuring my CV and a blog.

## Local Development

This project includes Docker setup for easy local development:

1. Make sure you have Docker and Docker Compose installed
2. Run the local server:
   ```
   ./serve.sh
   ```
3. Visit http://localhost:4000 in your browser

## Blog

The site includes a blog that can be accessed at `/blog`.

### Adding Blog Posts

To add a new blog post:

1. Create a new Markdown file in the `_posts` directory
2. Name it with the format: `YYYY-MM-DD-title.md`
3. Add the following front matter at the top:
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: YYYY-MM-DD HH:MM:SS +0000
   categories: [category1, category2]
   ---
   ```
4. Write your blog post content in Markdown below the front matter

## Theme

This site uses the [Modern Resume Theme](https://github.com/sproogen/modern-resume-theme) with custom modifications for blog support.

## License

This project is open source and available under the [MIT License](LICENSE).
