{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/basics/
  env.GREET = "Jekyll Portfolio Dev Environment";

  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    ruby_3_2  # Ruby for Jekyll
    bundler   # Bundler for gem management
    nodejs_20 # Node.js for any frontend tooling
    yarn      # Package manager for Node.js
    imagemagick # Image processing (useful for Jekyll sites)
    libwebp   # WebP image format conversion
    optipng   # PNG optimization
    jpegoptim # JPEG optimization
    tree      # Directory tree visualization
  ];

  # https://devenv.sh/languages/
  languages.ruby.enable = true;
  languages.ruby.version = "3.2";
  
  languages.javascript.enable = true;
  languages.javascript.npm.enable = true;

  # https://devenv.sh/processes/
  # processes.jekyll-serve.exec = "bundle exec jekyll serve --livereload --drafts --host 0.0.0.0";

  # https://devenv.sh/services/
  # services.postgres.enable = true;

  # https://devenv.sh/scripts/
  scripts.hello.exec = ''
    echo "Welcome to your $GREET!"
    echo "Ruby version: $(ruby --version)"
    echo "Bundler version: $(bundle --version)"
    echo "Node.js version: $(node --version)"
  '';

  scripts.setup.exec = ''
    echo "Setting up Jekyll environment..."
    if [ ! -f "Gemfile.lock" ]; then
      echo "Installing Ruby gems..."
      bundle install
    else
      echo "Updating Ruby gems..."
      bundle update
    fi
    echo "Setup complete!"
  '';

  scripts.serve.exec = ''
    echo "Starting Jekyll development server..."
    echo "Using polling for file watching to avoid devenv conflicts..."
    bundle exec jekyll serve --livereload --drafts --host 0.0.0.0 --port 4000 --force_polling
  '';

  scripts.build.exec = ''
    echo "Building Jekyll site..."
    bundle exec jekyll build
  '';

  scripts.clean.exec = ''
    echo "Cleaning Jekyll build..."
    bundle exec jekyll clean
  '';

  scripts.optimize-images.exec = ''
    echo "🖼️  Optimizing images for web performance..."
    
    # Create backup directory
    mkdir -p assets/images/backup
    
    # Backup original images (if not already backed up)
    for img in assets/images/*.png assets/images/*.jpg assets/images/*.jpeg; do
      if [ -f "$img" ] && [ ! -f "assets/images/backup/$(basename "$img")" ]; then
        echo "📦 Backing up $(basename "$img")..."
        cp "$img" assets/images/backup/
      fi
    done
    
    # Optimize PNG files
    echo "🗜️  Compressing PNG files..."
    for png in assets/images/*.png; do
      if [ -f "$png" ]; then
        echo "   Processing $(basename "$png")..."
        optipng -o2 "$png"
      fi
    done
    
    # Optimize JPEG files
    echo "🗜️  Compressing JPEG files..."
    for jpg in assets/images/*.jpg assets/images/*.jpeg; do
      if [ -f "$jpg" ]; then
        echo "   Processing $(basename "$jpg")..."
        jpegoptim --max=85 --strip-all "$jpg"
      fi
    done
    
    # Generate WebP versions
    echo "🚀 Generating WebP versions..."
    for img in assets/images/*.png assets/images/*.jpg assets/images/*.jpeg; do
      if [ -f "$img" ]; then
        webp_name="''${img%.*}.webp"
        if [ ! -f "$webp_name" ]; then
          echo "   Creating $(basename "$webp_name")..."
          cwebp -q 85 "$img" -o "$webp_name"
        fi
      fi
    done
    
    echo "✅ Image optimization complete!"
    echo "💡 Original images backed up to assets/images/backup/"
    echo ""
    echo "📊 File size comparison:"
    du -sh assets/images/backup/ 2>/dev/null && echo "   Original total: $(du -sh assets/images/backup/ | cut -f1)"
    echo "   Optimized total: $(du -sh assets/images/*.{png,jpg,jpeg,webp} 2>/dev/null | tail -1 | cut -f1)"
  '';

  enterShell = ''
    hello
    echo ""
    echo "Available commands:"
    echo "  setup  - Install/update Ruby gems"
    echo "  serve  - Start Jekyll development server"
    echo "  build  - Build the Jekyll site"
    echo "  clean  - Clean build artifacts"
    echo "  optimize-images - Optimize images for web performance"
    echo ""
    echo "Your Jekyll site will be available at: http://localhost:4000"
    echo ""
  '';

  # https://devenv.sh/tasks/
  # tasks = {
  #   "myproj:setup".exec = "mytool build";
  #   "devenv:enterShell".after = [ "myproj:setup" ];
  # };

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    ruby --version | grep "3.2"
    bundle --version
    node --version
    git --version | grep --color=auto "${pkgs.git.version}"
  '';

  # https://devenv.sh/git-hooks/
  # pre-commit.hooks.prettier.enable = true;
  # pre-commit.hooks.rubocop.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
