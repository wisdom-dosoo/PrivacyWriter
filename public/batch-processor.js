document.addEventListener('DOMContentLoaded', () => {
  const dragZone = document.getElementById('dragZone');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const processTask = document.getElementById('processTask');
  const resultsSection = document.getElementById('results');
  const resultsList = document.getElementById('resultsList');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // Option sections
  const rewriteOptions = document.getElementById('rewriteOptions');
  const translateOptions = document.getElementById('translateOptions');
  const generateOptions = document.getElementById('generateOptions');
  const styleGuideOptions = document.getElementById('styleGuideOptions');

  let selectedFiles = [];

  // Task Selection Logic
  processTask.addEventListener('change', () => {
    const task = processTask.value;
    rewriteOptions.style.display = task === 'rewrite' ? 'block' : 'none';
    translateOptions.style.display = task === 'translate' ? 'block' : 'none';
    generateOptions.style.display = task === 'generate' ? 'block' : 'none';
    styleGuideOptions.style.display = task === 'style-guide' ? 'block' : 'none';
  });

  // Drag & Drop Handlers
  dragZone.addEventListener('click', () => fileInput.click());
  
  dragZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragZone.style.background = '#f0f4ff';
    dragZone.style.borderColor = '#667eea';
  });

  dragZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragZone.style.background = '#fafafa';
    dragZone.style.borderColor = '#667eea';
  });

  dragZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragZone.style.background = '#fafafa';
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    const newFiles = Array.from(files).filter(f => 
      f.type === 'text/plain' || f.name.endsWith('.md') || f.name.endsWith('.html') || f.name.endsWith('.txt')
    );

    if (newFiles.length === 0) {
      alert('Please select valid text files (.txt, .md, .html)');
      return;
    }

    selectedFiles = [...selectedFiles, ...newFiles];
    renderFileList();
  }

  function renderFileList() {
    if (selectedFiles.length === 0) {
      fileList.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">No files selected</li>';
      return;
    }

    fileList.innerHTML = selectedFiles.map((file, index) => `
      <li class="file-item">
        <span>📄 ${file.name} <span style="color: #999; font-size: 0.8em;">(${formatSize(file.size)})</span></span>
        <button onclick="removeFile(${index})" style="background: #ff4444; padding: 4px 8px; font-size: 0.8em;">✕</button>
      </li>
    `).join('');
  }

  window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    renderFileList();
  };

  window.clearFiles = () => {
    selectedFiles = [];
    renderFileList();
    resultsSection.style.display = 'none';
  };

  window.tryExample = () => {
    const exampleContent = "This is a exmaple file with some erors. It is to short.";
    const blob = new Blob([exampleContent], { type: 'text/plain' });
    const file = new File([blob], "example_doc.txt", { type: "text/plain" });
    handleFiles([file]);
  };

  window.processBatch = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to process.');
      return;
    }

    const task = processTask.value;
    const options = {};

    if (task === 'rewrite') options.style = document.getElementById('rewriteStyle').value;
    if (task === 'translate') options.targetLang = document.getElementById('targetLanguage').value;
    if (task === 'generate') options.template = document.getElementById('contentTemplate').value;
    if (task === 'style-guide') options.guide = document.getElementById('styleGuideSelect').value;

    if (task === 'translate' && !options.targetLang) {
      alert('Please select a target language.');
      return;
    }

    // UI Setup
    document.getElementById('resultsTitle').style.display = 'block';
    resultsSection.style.display = 'block';
    progressContainer.style.display = 'block';
    resultsList.innerHTML = '';
    
    // Read files
    const fileContents = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const text = await readFileAsText(selectedFiles[i]);
      fileContents.push({ id: i, name: selectedFiles[i].name, text });
    }

    // Process
    updateProgress(0, selectedFiles.length);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'batchProcess',
        items: fileContents,
        task: task,
        ...options
      });

      if (response.success) {
        updateProgress(selectedFiles.length, selectedFiles.length);
        renderResults(response.results, fileContents);
      } else {
        alert('Batch processing failed: ' + response.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to extension.');
    }
  };

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Processing: ${current}/${total} files`;
  }

  function renderResults(results, originals) {
    resultsList.innerHTML = results.map(r => {
      const original = originals.find(o => o.id === r.id);
      const isSuccess = r.status === 'success';
      
      return `
        <div class="result-item">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong>${original.name}</strong>
            <span class="status-badge ${isSuccess ? 'status-success' : 'status-error'}">
              ${isSuccess ? 'Success' : 'Failed'}
            </span>
          </div>
          <div style="font-size: 0.9em; color: #555; max-height: 100px; overflow-y: auto; white-space: pre-wrap;">
            ${isSuccess ? r.result.substring(0, 200) + (r.result.length > 200 ? '...' : '') : r.error}
          </div>
        </div>
      `;
    }).join('');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  }
});