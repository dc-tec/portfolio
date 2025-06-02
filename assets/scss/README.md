# Portfolio SCSS Architecture

A modern, modular, and maintainable SCSS architecture for the portfolio website. This system follows the ITCSS (Inverted Triangle CSS) methodology combined with utility-first principles.

## Directory Structure

```
scss/
├── abstracts/
│   ├── _variables.scss    # Global variables and settings
│   ├── _mixins.scss      # Reusable mixins and functions
│   ├── _themes.scss      # Theme definitions (light/dark)
│   └── _animations.scss  # NEW: Centralized CSS keyframe animations
├── base/
│   ├── _reset.scss       # Modern CSS reset
│   ├── _typography.scss  # Typography rules
│   └── _utilities.scss   # Utility classes
├── components/
│   ├── _buttons.scss         # Button styles and variations
│   ├── _cards.scss           # Card components and layouts
│   ├── _collapsible.scss     # Collapsible/accordion components
│   ├── _hero.scss            # Hero section with profile and animations
│   ├── _latest-post.scss     # Latest blog post component
│   ├── _navigation-cards.scss # Navigation card components
│   ├── _post-card.scss       # NEW: Unified component for blog post cards
│   ├── _post-category.scss   # Post category display components
│   ├── _search-form.scss     # NEW: Search input and results display component
│   ├── _section-header.scss  # NEW: Header for sections (title + view all link)
│   ├── _sections.scss        # General section components
│   ├── _tags.scss            # Tag cloud and tag bubble components
│   └── _terminal.scss        # Terminal emulator UI component
├── layout/
│   ├── _header.scss      # Header styles and navigation
│   ├── _footer.scss      # Footer styles and social links
│   └── _grid.scss        # Grid system and layout utilities
├── pages/
│   ├── _about.scss       # About page specific styles
│   └── _blog.scss        # Blog page and post styles
└── README.md             # This documentation
```

**Main Stylesheet**: `assets/css/style.scss` - Imports all SCSS modules using the @use directive

## Key Features

- 🎨 Modern CSS reset
- 🌓 Light and dark theme support
- 📱 Responsive design system
- 🧩 Component-based architecture
- 🛠 Utility-first classes
- 🎯 Performance optimized
- ♿️ Accessibility focused
- 📏 **Enhanced spacing system** for better visual hierarchy
- 🖼️ **Improved layout proportions** for desktop and mobile

## Layout System

### Container Width

The container system uses a **1040px max-width** for optimal reading experience:

- Desktop: Comfortable content width with generous side margins
- Tablet: Responsive padding that adapts to screen size
- Mobile: Optimized spacing for touch interfaces

### Spacing Scale

Enhanced spacing system for better visual rhythm:

```scss
$spacing-scale: (
  "xs": 0.25rem,
  // 4px  - Micro adjustments
  "sm": 0.5rem,
  // 8px  - Small gaps
  "md": 1rem,
  // 16px - Standard spacing
  "lg": 1.5rem,
  // 24px - Comfortable gaps
  "xl": 2rem,
  // 32px - Section separations
  "2xl": 3rem,
  // 48px - Major sections
  "3xl": 4rem // 64px - Large section breaks,,,
);
```

### Section Hierarchy

Improved vertical rhythm with consistent spacing:

- **Hero sections**: Enhanced breathing room between content blocks
- **Major sections**: Clear visual separation with generous margins
- **Content sections**: Balanced internal spacing
- **Section separators**: Subtle visual dividers between major content areas

## Usage

### Theme System

The theme system uses CSS custom properties for easy customization:

```scss
// Light theme (default)
:root {
  --bg-color: #eff1f5;
  --text-color: #4c4f69;
  --accent-color: #fe640b;
  // ... more variables
}

// Dark theme
.dark-mode {
  --bg-color: #24273a;
  --text-color: #cad3f5;
  --accent-color: #f5a97f;
  // ... more variables
}
```

### Mixins

#### Responsive Design

```scss
@include breakpoint("md") {
  // Styles for medium screens and up
}
```

Available breakpoints:

- `sm`: 576px
- `md`: 768px
- `lg`: 992px
- `xl`: 1200px
- `xxl`: 1400px

#### Typography

```scss
@include font-size("lg");
```

Available sizes:

- `xs`: 0.75rem
- `sm`: 0.875rem
- `base`: 1rem
- `lg`: 1.125rem
- `xl`: 1.25rem
- `2xl`: 1.5rem
- `3xl`: 1.875rem
- `4xl`: 2.25rem
- `5xl`: 3rem

#### Components

```scss
.custom-card {
  @include card-base;
  // Additional styles
}

.custom-button {
  @include button-base;
  @include button-variant("primary");
}

.terminal-display {
  @include terminal-container;
  // Custom terminal styling
}

.tag-display {
  @include tag-bubble;
  // Custom tag styling
}
```

### Utility Classes

#### Spacing

- Margin: `.m-{size}`, `.mt-{size}`, `.mr-{size}`, `.mb-{size}`, `.ml-{size}`, `.mx-{size}`, `.my-{size}`
- Padding: `.p-{size}`, `.pt-{size}`, `.pr-{size}`, `.pb-{size}`, `.pl-{size}`, `.px-{size}`, `.py-{size}`

Available sizes: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`

#### Display

- `.d-none`
- `.d-block`
- `.d-inline`
- `.d-inline-block`
- `.d-flex`
- `.d-grid`

#### Flex

- `.flex-row`
- `.flex-column`
- `.flex-wrap`
- `.justify-content-{start|end|center|between|around}`
- `.align-items-{start|end|center|baseline|stretch}`

#### Text

- `.text-{left|center|right|justify}`
- `.text-truncate`
- `.font-{normal|medium|semibold|bold}`
- `.text-{primary|secondary|success|warning|danger|info}`

#### Colors

- `.bg-{primary|secondary|success|warning|danger|info}`
- `.text-{primary|secondary|success|warning|danger|info}`

#### Borders

- `.rounded-{sm|md|lg|xl|full}`
- `.border`
- `.border-{top|right|bottom|left}`

#### Position

- `.position-{relative|absolute|fixed|sticky}`
- `.z-{below|base|above|header|modal|tooltip|toast}`

#### Section Separators

- `.section-separator` - Creates visual break between major sections
- `.section-separator--dots` - Dot-style separator
- `.section-separator--compact` - Smaller separator for minor breaks

#### Accessibility

- `.sr-only` - Screen reader only
- `.focusable` - Focus styles

## Best Practices

1. **Component Creation**

   - Use mixins for reusable styles
   - Keep components modular and single-responsibility
   - Follow BEM naming convention

2. **Responsive Design**

   - Use breakpoint mixins
   - Mobile-first approach
   - Test on multiple devices

3. **Performance**

   - Minimize nesting (max 3 levels)
   - Use utility classes for common patterns
   - Avoid large CSS bundles

4. **Accessibility**
   - Include focus styles
   - Use semantic HTML
   - Test with screen readers

## Contributing

1. Follow the established directory structure
2. Use existing mixins and utilities when possible
3. Document new features and components
4. Test across browsers and devices

## Component Details

### Core Components

- **buttons**: Button styles with multiple variants (primary, secondary, outline, etc.)
- **cards**: Flexible card components for content display
- **collapsible**: Accordion-style collapsible content sections

### Specialized Components

- **hero**: Main hero section with profile image, animated wave emoji, and intro text
- **latest-post**: Featured latest blog post display component
- **navigation-cards**: Card-based navigation elements
- **post-category**: Blog post category display and filtering
- **sections**: General purpose section containers and styling
- **tags**: Interactive tag clouds with bubble animations and hover effects
- **terminal**: Advanced terminal emulator UI with Mac-style window controls, neofetch display, and responsive behavior

### Pages

#### About Page (`_about.scss`)

Page-specific styles for the about/CV page including:

- Professional experience sections
- Skills and technologies display
- Contact information styling

#### Blog (`_blog.scss`)

Comprehensive blog styling including:

- Post listing layouts (now largely using the `_post-card.scss` component)
- Individual post formatting (container style refined)
- Code syntax highlighting
- Image galleries
- Responsive typography
- Reading time indicators
- Tag and category filtering (tag display styles centralized in `_tags.scss`)
- Search functionality (styles moved to `_search-form.scss` component)

### Advanced Component Usage

#### Hero Section

```scss
.hero-section {
  // Available variants
  &--regular {
    // Regular home page with profile + terminal grid layout
  }
  &--blog {
    // Blog home page with terminal + profile flex layout
  }

  // Enhanced features:
  // - Subtle animated background patterns
  // - Improved responsive design with clamp() functions
  // - Interactive profile images with hover effects
  // - Animated floating rings around profile images
  // - Gradient text effects on titles
  // - Enhanced wave emoji animation
  // - Terminal container hover effects
  // - Accessibility improvements (reduced motion support)
  // - Print-friendly styling
}
```

Advanced usage with variants:

```html
<!-- Regular Home Page -->
<section class="hero-section hero-section--regular">
  <div class="hero-content">
    <div class="hero-grid">
      <div class="hero-profile">
        <!-- Profile content -->
      </div>
      <!-- Terminal or other content -->
    </div>
  </div>
</section>

<!-- Blog Home Page -->
<section class="hero-section hero-section--blog">
  <div class="hero-content">
    <div class="hero-image">
      <!-- Terminal container -->
    </div>
    <div class="hero-info">
      <!-- Profile and bio content -->
    </div>
  </div>
</section>
```

#### Terminal Component

```scss
.terminal {
  // Available variants
  &.terminal-sm {
    max-width: 400px;
  }
  &.terminal-lg {
    max-width: 800px;
  }
  &.terminal-minimal .terminal-header {
    display: none;
  }
  &.terminal-fullwidth {
    max-width: 100%;
  }
}
```

#### Tag Clouds

```scss
.tag-cloud .tag-bubble {
  // Bubble animation with custom timing
  &.animate-in {
    animation: bubbleIn 0.7s forwards;
  }

  // Custom hover effects
  &:hover {
    transform: translateY(-5px); // More pronounced lift
  }
}
```
