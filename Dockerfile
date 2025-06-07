FROM ruby:3.2-alpine

# Install dependencies
RUN apk add --no-cache \
    build-base \
    gcc \
    cmake \
    git \
    # Add SASS dependencies
    libsass \
    sassc \
    nodejs \
    npm

# Set up working directory
WORKDIR /site

# Copy Gemfile and install dependencies
COPY Gemfile Gemfile.lock* ./
RUN bundle install

# Expose port 4000 for the Jekyll server
EXPOSE 4000

# Set the command to run the Jekyll server with verbose output
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload", "--trace", "--verbose"] 