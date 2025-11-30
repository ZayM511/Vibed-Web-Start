# JobFiltr Extension Icons

## Required Icons

Please create the following icon sizes:

- `icon16.png` - 16x16px (toolbar icon)
- `icon32.png` - 32x32px (toolbar icon retina)
- `icon48.png` - 48x48px (extension management)
- `icon128.png` - 128x128px (Chrome Web Store)

## Design Guidelines

- Use the JobFiltr brand colors:
  - Primary: #001f54 (Navy Blue)
  - Secondary: #6B46C1 (Purple)
  - Accent: #10B981 (Green)

- Icon should feature:
  - A checkmark or shield symbol
  - Clean, modern design
  - Good contrast for visibility
  - Consistent with the JobFiltr brand

## Temporary Solution

For testing, you can use simple colored squares or generate icons using:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

Or use this SVG as a base and convert to PNG at different sizes:

```svg
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="url(#gradient)"/>
  <circle cx="64" cy="64" r="40" stroke="white" stroke-width="6"/>
  <path d="M50 64L58 72L78 52" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="128" y2="128">
      <stop offset="0%" stop-color="#001f54"/>
      <stop offset="100%" stop-color="#6B46C1"/>
    </linearGradient>
  </defs>
</svg>
```
