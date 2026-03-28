<p align="center">
  <img src="logo.png" width="128" alt="WeLib Bypass Logo">
</p>

# WeLib Bypass

## What it does

Monitors WeLib pages and intercepts requests from read mode, downloading the files and bypassing the 5 books per hour limit.

**Supported formats:** PDF, EPUB, MOBI, DJVU, AZW3, FB2, MP3

**Supported mirrors:**
- welib.org

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `welib-bypass` folder

## How to use

1. Open any book page on WeLib in read mode
2. The extension automatically detects the available files and the download begins

## Project structure

```
welib-downloader/
├── manifest.json    # Extension configuration
├── background.js    # Manages downloads
├── content.js       # Detects files on pages
└── icons/           # Extension icons
```

## Requirements

> **Note:** this extension **only works on Chromium-based browsers** (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, etc.). Firefox and Safari are not supported.
