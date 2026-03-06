# 🔒 Privacy Policy for PrivacyWriter

**Effective Date:** December 7, 2025  
**Version:** 1.0

---

## 1. Introduction

PrivacyWriter ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome Extension handles your data.

**The short version:** We do not collect, store, or transmit your personal data. All AI processing happens locally on your device.

---

## 2. Data Collection & Processing

PrivacyWriter is designed with a "local-first" philosophy. Our primary goal is to perform all processing on your device.

### 2.1 On-Device Processing
For most features, PrivacyWriter uses Google Chrome's built-in AI models (e.g., Gemini Nano) or other integrated, on-device engines.
*   **Default AI Operations:** When you use features like Grammar Check, Rewrite, Summarize, or Translate, the selected text is processed entirely within your browser.
*   **No Default Data Egress:** By default, your written text is **not** sent to our servers or any third-party cloud servers for AI processing.

### 2.2 Optional Cloud-Based Features (Opt-In)
For Pro and Pro+ users, we offer optional features that require connecting to third-party cloud services for enhanced capabilities. These features are disabled by default and require explicit user action to enable.

*   **Claude API Integration (Pro):**
    *   **Purpose:** To provide a powerful alternative AI model for users who want different results or a fallback when local models are unavailable.
    *   **Activation:** You must be a Pro user, navigate to the extension's settings, and provide your own API key for Anthropic's Claude.
    *   **Data Sent:** When enabled and used, the selected text is sent to Anthropic's servers for processing. Your use of this feature is subject to Anthropic's Privacy Policy.

*   **Cloud Sync (Pro+):**
    *   **Purpose:** To allow you to back up and sync your settings, history, and style guides across your devices.
    *   **Activation:** You must be a Pro+ user and optionally provide a personal cloud storage endpoint URL.
    *   **Data Sent:** When you trigger a sync, a payload containing your extension data is sent to the URL you configured.

### 2.3 User Data
*   **We do not collect** personal identification information (PII).
*   **We do not collect** browsing history.
*   **We do not use** cookies or tracking pixels.

### 2.3 Local Storage
The extension uses your browser's local storage (`chrome.storage.local`) to save:
*   User preferences (e.g., dark mode settings).
*   Usage counters (e.g., daily request count).
*   This data stays on your device and is removed if you uninstall the extension.

---

## 3. Permissions

We request the minimum permissions necessary for the extension to function:

| Permission | Purpose |
|------------|---------|
| `activeTab` | To analyze text on the current page when you trigger the extension. |
| `scripting` | To show the floating toolbar and replace text on web pages. |
| `storage` | To save your settings locally. |
| `sidePanel` | To display the persistent writing assistant panel. |

---

## 4. Third-Party Services

*   **Google Chrome:** The extension relies on the Chrome browser's built-in AI capabilities. Chrome's handling of local AI models is subject to Google's privacy policy.
*   **Anthropic (Optional):** If you are a Pro user and choose to provide your own Claude API key, your text is sent to Anthropic for processing. This is subject to Anthropic's Privacy Policy.
*   **Chrome Web Store:** If you install via the Chrome Web Store, Google collects basic install statistics (aggregate data), which we can view to monitor extension performance. We do not see individual user data.

---

## 5. Changes to This Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top.

---

## 6. Contact Us

If you have any questions about this Privacy Policy, please contact us:

*   **Email:** support@privacywriter.app
*   **Website:** https://privacywriter.app
