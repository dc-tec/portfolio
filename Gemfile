source "https://rubygems.org"

# Specify Jekyll version directly
gem "jekyll", "~> 4.3" # Or your desired latest version

# Modern Sass converter
gem "jekyll-sass-converter", "~> 3.0"

# Comment out or remove GitHub Pages gem if managing Jekyll version directly
# gem "github-pages", group: :jekyll_plugins

# If you have any plugins, put them here!
group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-paginate"
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.0", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock webrick for Ruby 3.0 compatibility
gem "webrick", "~> 1.7"
