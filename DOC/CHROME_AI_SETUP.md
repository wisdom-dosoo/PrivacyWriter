# Chrome AI Setup Quick Reference

**For PrivacyLens Users**

---

## Problem: "AI not available" error?

Your Chrome browser needs AI features enabled. Follow this 1-minute fix:

---

## ⚡ Quick Fix (5 Steps)

### Step 1: Open Chrome Flags
In your browser address bar, type or paste:
```
chrome://flags
```
Then press Enter.

### Step 2: Search for the Flag
Look for the **search box** at the top of the page and search for:
- **Grammar Check?** → Search: `prompt-api`
- **Rewrite/Summarize?** → Search: `summarization` or `rewriter`
- **Translate?** → Search: `translation`

### Step 3: Enable the Flag
Find the flag matching your search and:
1. Click the **dropdown** (usually says "Default")
2. Select **"Enabled"**
3. The box will turn **blue**

### Step 4: Also Enable These
Make sure these are ENABLED too:
- `optimization-guide-on-device-model` (search: "optimization")
- `prompt-api-for-gemini-nano` (search: "prompt")

### Step 5: Restart Chrome
**Important:** Close Chrome completely and reopen it.
- Don't just close tabs
- Close the entire application
- Wait 2-3 seconds
- Open Chrome again

---

## 🎯 By Feature

### Grammar Check
**Missing flag:** `prompt-api-for-gemini-nano`

Steps:
1. Go to `chrome://flags`
2. Search for: `prompt-api`
3. Enable: `prompt-api-for-gemini-nano`
4. Enable: `optimization-guide-on-device-model`
5. Restart Chrome

---

### Rewrite Text
**Missing flag:** `rewriter-api-for-gemini-nano`

Steps:
1. Go to `chrome://flags`
2. Search for: `rewriter`
3. Enable: `rewriter-api-for-gemini-nano`
4. Enable: `optimization-guide-on-device-model`
5. Restart Chrome

---

### Summarize
**Missing flag:** `summarization-api-for-gemini-nano`

Steps:
1. Go to `chrome://flags`
2. Search for: `summarization`
3. Enable: `summarization-api-for-gemini-nano`
4. Enable: `optimization-guide-on-device-model`
5. Restart Chrome

---

### Translate
**Missing flag:** `translation-api`

Steps:
1. Go to `chrome://flags`
2. Search for: `translation`
3. Enable: `translation-api`
4. Enable: `optimization-guide-on-device-model`
5. Restart Chrome

---

## ⚠️ Important Notes

### Chrome Version
Requires **Chrome 138+** for AI features.
Check your version: Click Menu → About Google Chrome

### System Requirements
- 4GB RAM minimum (8GB+ recommended)
- 50MB free disk space for AI model
- Stable internet connection (for initial model download)

### Restarting Chrome
**Must fully restart Chrome:**
- Close ALL tabs and windows
- Wait 2-3 seconds
- Reopen Chrome
- Do NOT just close and immediately reopen

### Flags Reset?
Sometimes Chrome resets these flags. If error returns:
1. Go to `chrome://flags` again
2. Verify all flags still say "Enabled"
3. If not, enable them again
4. Restart Chrome

---

## 🔍 Verification

After setup, verify flags are enabled:

1. Go to `chrome://flags`
2. Turn ON the search filter (click search box)
3. Search for each flag:
   - `prompt-api-for-gemini-nano` → should show **blue "Enabled"**
   - `rewriter-api-for-gemini-nano` → should show **blue "Enabled"**
   - `summarization-api-for-gemini-nano` → should show **blue "Enabled"**
   - `translation-api` → should show **blue "Enabled"**
   - `optimization-guide-on-device-model` → should show **blue "Enabled"**

If all are blue and enabled, your setup is complete!

---

## 🆘 Still Not Working?

1. **Verify Chrome version** (must be 138+)
2. **Double-check ALL flags** are enabled (shown in blue)
3. **Fully restart Chrome** (close all windows, wait, reopen)
4. **Check internet connection** (needed for model download)
5. **Clear Chrome cache** (Settings → Clear Browsing Data)
6. **Disable conflicting extensions** (temporarily disable all other extensions)
7. **Check system storage** (need 50MB+ free)

---

## 📞 Support

For more help, see:
- **Full Setup Guide:** `QUICK_START.md`
- **Technical Details:** `IMPLEMENTATION_COMPLETE.md`
- **Chrome AI Official Docs:** https://developers.google.com/machine-learning/chrome-ai

---

**Last Updated:** December 7, 2025  
**Chrome AI Version:** Gemini Nano  
**PrivacyLens Version:** 2.0+
