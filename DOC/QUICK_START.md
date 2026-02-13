# Quick Start Guide - PrivacyWriter Extension

## ⚡ 5-Minute Setup

### Prerequisites
- Chrome 138+ (Canary/Dev version for Gemini Nano)
- This folder with all extension files

### Step 1: Enable AI APIs (2 minutes)

1. Open `chrome://flags`
2. Copy-paste each flag name and enable:
   - `prompt-api-for-gemini-nano`
   - `optimization-guide-on-device-model`
   - `summarization-api-for-gemini-nano`
   - `rewriter-api-for-gemini-nano`
   - `translation-api`
3. **Restart Chrome**

### Step 2: Download Gemini Nano (Optional but Recommended)

1. Go to `chrome://components`
2. Find "Optimization Guide On Device Model"
3. Click "Check for update"
4. Wait for download (1-2 GB, can take 5-10 min)

### Step 3: Load Extension (2 minutes)

1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `PrivacyLens` folder
5. Done! ✅

---

## 🎮 Using the Extension

### Icon & Popup
- Click extension icon in toolbar → opens popup (400px width)
- Access all features from popup:
  - Grammar check
  - Text rewriting
  - Summarization
  - Translation

### Keyboard Shortcuts
- `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac) → Open Side Panel
- `Ctrl+Shift+G` → Check grammar (when available)
- `Ctrl+Shift+S` → Summarize text (when available)

### Text Selection
- Select any text on a webpage
- A small toolbar appears with 4 quick actions
- Click an action to process selected text
- Results appear in a popup above text

### Side Panel (Extended Interface)
- Opens with keyboard shortcut
- Same features as popup
- Great for longer writing sessions
- Stays visible while you browse

---

## 🧪 Testing Features

### 1. Grammar Check
```
Input:  "The quick brown fox jump over the lazy dog"
Output: "The quick brown fox jumps over the lazy dog"
```

### 2. Rewriting
```
Input: "The meeting is tomorrow"

Professional: "The meeting has been scheduled for tomorrow"
Casual: "Hey, just a heads up - we're meeting tomorrow!"
Shorter: "Meeting's tomorrow"
Longer: "Please note that the meeting will be taking place tomorrow as previously discussed"
```

### 3. Summarization
```
Input:  [any paragraph or longer text]
Output: • Key point 1
         • Key point 2
         • Key point 3
```

### 4. Translation
```
Input: "Hello, how are you?"

Spanish: "Hola, ¿cómo estás?"
French: "Bonjour, comment ça va?"
German: "Hallo, wie geht es dir?"
Chinese: "你好，你好吗？"
```

---

## 📊 Monitoring

### Check AI Status
1. Click extension icon
2. Go to **Tools** tab
3. See "AI Status" section showing:
   - Gemini Nano: Ready/Unavailable
   - Grammar API: Ready/Unavailable
   - Translation API: Ready/Unavailable

### View Usage Stats
1. Click extension icon
2. Go to **Stats** tab
3. See:
   - Words processed
   - Grammar checks performed
   - Rewrites completed
   - Translations done

---

## 🐛 Troubleshooting

### Problem: "Enable in chrome://flags"
**Solution:** The AI APIs aren't enabled. Go to chrome://flags and enable the flags listed above.

### Problem: Extension shows errors in console
**Solution:** 
1. Right-click extension icon
2. Select "Inspect popup"
3. Check Console tab for error messages
4. Reload extension (⟲ button on chrome://extensions)

### Problem: Model download stuck
**Solution:** 
1. Go to `chrome://components`
2. Find "Optimization Guide On Device Model"
3. Click refresh button
4. Check Settings → Privacy → "Enhanced Security" settings

### Problem: Text isn't being processed
**Solution:**
1. Ensure text is entered in popup
2. Check daily usage (25 limit for free users)
3. Make sure AI APIs show as "Ready"
4. Try with shorter, simpler text first

---

## 📁 File Guide

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration |
| `background.js` | AI processing & messaging |
| `popup.html/js/css` | Main interface |
| `sidepanel.html/js` | Extended interface |
| `content.js/css` | Inline text selection tools |
| `landing-page.html` | Marketing page |
| `upgrade.html` | Pro upgrade page |
| `payment-sus.html` | Purchase confirmation |
| `icons/` | Extension icons |

---

## 🔑 Key Concepts

### Privacy First
- All AI processing happens **on your device**
- No text leaves your computer
- No tracking or analytics
- No external API calls

### Free vs Pro
- **Free:** 25 requests/day, basic features
- **Pro:** Unlimited requests, all features

### Error Handling
- Long text? → Gets error message with limit
- Blank text? → Helpful prompt
- Daily limit reached? → Upgrade suggestion
- AI unavailable? → Clear instructions

---

## 💡 Tips & Tricks

### Maximize Productivity
1. Use side panel for longer sessions
2. Keep popup as quick access
3. Use context menu for web content
4. Bookmark landing page for pricing

### Get Best Results
1. For summarization: Use paragraphs, not tweets
2. For rewriting: Be specific about tone
3. For translation: Shorter text translates better
4. For grammar: Full sentences work best

### Monitor Usage
1. Check stats tab daily
2. Upgrade when approaching limit
3. Pro subscription gives unlimited access

---

## 🚀 What's Next?

- [ ] Test all features
- [ ] Try different languages
- [ ] Test error handling
- [ ] Share feedback
- [ ] Consider upgrading to Pro
- [ ] Leave a review!

---

## 📖 Need Help?

1. Check **IMPLEMENTATION_COMPLETE.md** for detailed docs
2. Review **README.md** for feature overview
3. Inspect extension logs in Chrome DevTools
4. Visit `chrome://extensions` for extension status

---

## ✅ You're All Set!

Your PrivacyWriter extension is ready to use. Start improving your writing with AI that respects your privacy! 🎉

**Remember:** All your text stays on YOUR device. Always. 🔒
