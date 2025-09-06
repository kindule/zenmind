# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZenMind is a blog built with the MultiTerm Astro theme - a terminal-inspired, highly customizable blog theme that supports multiple color schemes and themes. The blog focuses on mindfulness, thoughts, and ideas.

## Essential Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run postbuild          # Generate search index with pagefind (runs after build)
npm run preview            # Preview production build locally
npm run format             # Format code with Prettier

# Deployment
wrangler pages dev ./dist  # Test Cloudflare Pages deployment locally
```

## Architecture and Key Files

### Core Configuration
- `src/site.config.ts` - Main site configuration including themes, navigation, social links, and site metadata
- `astro.config.mjs` - Astro configuration with extensive markdown processing plugins
- `wrangler.jsonc` - Cloudflare Pages deployment configuration

### Content Structure
- `src/content/posts/` - Blog posts in Markdown/MDX format
- `src/content/config.ts` - Content collections schema definition
- `src/content/home.md` - Homepage content
- `src/content/avatar.jpg` - Author avatar for social cards

### Theme System
The site supports multiple theme modes configured in `src/site.config.ts`:
- **Single theme mode**: One fixed theme
- **Light-dark-auto mode**: Automatic light/dark switching
- **Select mode**: Reader can choose from multiple themes (currently enabled with 60+ themes)

Theme colors are managed through CSS variables that dynamically update based on selected Shiki themes.

### Custom Plugins
Located in `src/plugins/`, these extend Markdown processing:
- `remark-description.ts` - Auto-generates descriptions from content
- `remark-reading-time.ts` - Calculates reading time
- `remark-admonitions.ts` - Adds callout/admonition support
- `remark-character-dialogue.ts` - Character-based dialogue blocks
- `remark-github-card.ts` - GitHub repository cards
- `rehype-pixelated.ts` - Pixelated image effects

### Key Components
- `src/components/` - Astro components for layout and functionality
- `src/layouts/Layout.astro` - Main site layout
- `src/pages/` - Static pages and dynamic routing

## Development Notes

### Content Management
- Blog posts use frontmatter for metadata (title, date, tags, series, etc.)
- Series support for grouping related posts
- Automatic social card generation for each post
- Built-in search powered by Pagefind (generated during postbuild)

### Styling
- Built with Tailwind CSS v4
- JetBrains Mono as the primary font
- Responsive design with mobile-first approach
- CSS variables for dynamic theming

### Deployment
- Configured for Cloudflare Pages via wrangler.jsonc
- Static site generation by default
- Search index built automatically after main build process