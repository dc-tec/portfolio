# Portfolio SCSS Architecture

A modern, modular, and maintainable SCSS architecture for the portfolio website. This system follows the ITCSS (Inverted Triangle CSS) methodology combined with utility-first principles.

## Directory Structure

```
scss/
├── abstracts/
│   ├── _variables.scss    # Global variables and settings
│   ├── _mixins.scss      # Reusable mixins and functions
│   └── _themes.scss      # Theme definitions (light/dark)
├── base/
│   ├── _reset.scss       # Modern CSS reset
│   ├── _typography.scss  # Typography rules
│   └── _utilities.scss   # Utility classes
├── components/
│   ├── _buttons.scss     # Button styles
│   ├── _cards.scss       # Card components
│   └── _collapsible.scss # Collapsible components
├── layout/
│   ├── _header.scss      # Header styles
│   ├── _footer.scss      # Footer styles
│   └── _grid.scss        # Grid system
├── pages/
│   ├── _portfolio.scss   # Portfolio page styles
│   └── _blog.scss        # Blog page styles
└── style.scss            # Main stylesheet
```

## Features

- 🎨 Modern CSS reset
- 🌓 Light and dark theme support
- 📱 Responsive design system
- 🧩 Component-based architecture
- 🛠 Utility-first classes
- 🎯 Performance optimized
- ♿️ Accessibility focused

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

## License

MIT License - feel free to use and modify as needed.
