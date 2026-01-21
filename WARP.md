# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is a static website repository for "Tasty Jamz" Apple Store app support pages, deployed via GitHub Pages. The repository contains support/contact pages for iOS apps published under the Tasty Jamz brand.

## Architecture

### Static HTML Pages
- Each app has its own support page as a standalone HTML file (e.g., `fart_soundboard_support.html`)
- Pages are self-contained with inline CSS and JavaScript
- No build process or dependencies required
- Pages use vanilla JavaScript with no frameworks

### Support Form Integration
The contact forms in the support pages integrate with GitHub Issues API:
- Forms collect user feedback and create GitHub issues automatically
- Configuration variables in the JavaScript section need to be set:
  - `GITHUB_USERNAME`: The GitHub username (likely 'nairdaleo')
  - `GITHUB_REPO`: The repository name (likely 'tasty-jams')
  - `GITHUB_TOKEN`: A personal access token with repo scope for creating issues
- Issues are created with the `[Support]` prefix and `support` label

## Common Commands

### Local Development
```bash
# Serve locally for testing (requires Python)
python3 -m http.server 8000

# View the support page
open http://localhost:8000/fart_soundboard_support.html
```

### Git Operations
```bash
# Remote uses SSH key named 'me.github.com'
git remote -v

# Standard commit workflow
git add .
git commit -m "Your message" 
git push origin main
```

### Deployment
The repository uses GitHub Pages for hosting. Changes pushed to the `main` branch are automatically deployed.

## File Naming Convention
Support pages follow the pattern: `{app_name}_support.html` in the root directory.

## Important Notes
- **Security**: GitHub tokens should NEVER be committed. The placeholder values in HTML files must be replaced at deployment or via environment injection
- **GitHub Pages**: The `.gitignore` is configured for Jekyll but this repo uses plain HTML
- **License**: MIT License (2026 Adrian)
