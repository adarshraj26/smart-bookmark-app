# Smart Bookmark App

A modern, real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## What is this?
This app lets you save, organize, and sync your favorite links across all your devices. You can create folders, pin and favorite bookmarks, and everything updates instantly thanks to Supabase's real-time features.

## Features

# 🚀 Features

• Add, edit, and delete bookmarks  
• Create and delete folders  
• Organize bookmarks inside folders  
• Pin important bookmarks  
• Mark bookmarks as favorites  
• Favorites section for quick access  
• Search bookmarks instantly  
• Real-time sync using Supabase Realtime  
• Fully responsive (mobile, tablet, desktop)  
• Collapsible sidebar on mobile  
• Clean and modern UI  

## How to run it
1. Clone this repo
2. Set up your Supabase project (see SUPABASE_SETUP.md)
3. Add your Supabase keys to `.env.local`
4. Run `npm install` and `npm run dev`

## Problems I ran into & how I solved them
	- For several tricky issues, I also used the AI tool ChatGPT to get suggestions, debug errors, and find solutions when I was stuck.
- **Favorite and Pin features not updating properly:**
	- **Problem:** Pin and favorite buttons updated database but UI lagged.
	- **Solution:** Used `.select().single()` after update and updated state immediately.
- **Real-time updates were not working:**
	- **Problem:** When opening two tabs, changes in one tab were not reflected in the other.
	- **Cause:** Supabase realtime subscription was not properly implemented.
	- **Solution:** I added a realtime listener:
		```js
		supabase.channel("bookmarks")
			.on("postgres_changes", {...}, handler)
			.subscribe()
		```
- **Dropdown UI bugs:** The folder dropdown was hard to style and didn't update correctly. I switched to Headless UI's Listbox and used Tailwind for a glassmorphic look.
- **Build-breaking JSX errors:** Sometimes, stray JSX or misplaced parentheses caused the build to fail. Careful code review and moving all JSX inside return statements fixed this.
- **Sidebar layout issues:** The folder add button was outside the sidebar at first. I restructured the flex layout so the input and button are visually integrated.
- **Responsive design:** The app looked bad on mobile at first. I added Tailwind's responsive classes to all layouts and containers.

## Why use this?
- Clean, modern UI
- Real-time updates
- Easy to use and extend
- Built with the latest Next.js and Supabase features

## Credits
- Built with Next.js, Supabase, Tailwind CSS, and Headless UI

---

Feel free to fork, star, and contribute!
