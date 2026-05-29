---
description: Tailwind CSS patterns and styling conventions
---

# Tailwind CSS Styling

## Color Palette

- Use defined Tailwind colors: stone, amber, red, green, blue
- Custom colors defined in tailwind.config.js
- Examples: stone-950 (text), amber-700 (labels), stone-200 (borders)

## No Custom CSS

- All styling must use Tailwind utility classes
- Do not create custom CSS files unless absolutely necessary
- Keep index.css minimal

## Layout Patterns

### Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{/* items */}</div>
```

### Sticky Header

```tsx
<header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fffaf3]/95 px-4 py-3 backdrop-blur">{/* content */}</header>
```

### Cards & Containers

```tsx
<div className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">{/* content */}</div>
```

## Spacing & Sizing

- Use consistent spacing: p-4, py-3, gap-4, etc.
- Use min-height for flexible components: min-h-11, min-h-[70vh]
- Use max-width containers: max-w-7xl, max-w-md

## Typography

- Use font weights: font-bold, font-semibold, font-normal
- Use sizes: text-xs, text-sm, text-base, text-lg, text-xl
- Use colors: text-stone-950, text-stone-600, text-red-700

## Responsive Design

- Mobile-first: base styles first
- Tablet: md: breakpoint (768px)
- Desktop: lg: breakpoint (1024px)
- Always test on: mobile (375px), tablet (768px), desktop (1280px)
