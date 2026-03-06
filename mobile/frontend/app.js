const API_URL = 'http://localhost:8000/api';

// State
let currentResult = '';

// UI Elements
const inputText = document.getElementById('input-text');
const resultCard = document.getElementById('result-card');
const resultContent = document.getElementById('result-content');
const resultType = document.getElementById('result-type');
const loading = document.getElementById('loading');

// Helper: Close all menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
        document.querySelectorAll('[id$="-menu"]').forEach(el => el.classList.add('hidden'));
    }
});

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    const isHidden = menu.classList.contains('hidden');
    // Close others
    document.querySelectorAll('[id$="-menu"]').forEach(el => el.classList.add('hidden'));
    // Toggle current
    if (isHidden) menu.classList.remove('hidden');
}

async function processText(action, option = null) {
    const text = inputText.value.trim();
    
    if (!text) {
        alert('Please enter some text first.');
        return;
    }

    // Close menus
    document.querySelectorAll('[id$="-menu"]').forEach(el => el.classList.add('hidden'));

    // Show loading
    loading.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_URL}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                option: option
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        showResult(data.result, action);

    } catch (error) {
        console.error(error);
        alert('Failed to process text. Is the backend running?');
    } finally {
        loading.classList.add('hidden');
    }
}

function showResult(text, type) {
    currentResult = text;
    resultContent.textContent = text;
    resultType.textContent = type.toUpperCase();
    
    // Slide up animation
    resultCard.classList.remove('hidden');
    // Small delay to allow display:block to apply before transform
    setTimeout(() => {
        resultCard.classList.remove('translate-y-full');
    }, 10);
}

function closeResult() {
    resultCard.classList.add('translate-y-full');
    setTimeout(() => resultCard.classList.add('hidden'), 300);
}

function copyResult() {
    navigator.clipboard.writeText(currentResult).then(() => alert('Copied!'));
}

function replaceText() {
    inputText.value = currentResult;
    closeResult();
}