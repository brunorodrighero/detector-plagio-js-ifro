let isCancelled = false;
let worker;

function logStatus(message) {
  const statusLog = document.getElementById('statusLog');
  statusLog.style.display = 'block';
  statusLog.innerHTML += `${new Date().toLocaleTimeString()}: ${message}\n`;
  statusLog.scrollTop = statusLog.scrollHeight;
}

function clearForm() {
  document.getElementById('folderInput').value = '';
  document.getElementById('threshold').value = '4';
  document.getElementById('ngramSize').value = '5';
  document.getElementById('metric').value = 'jaccard';
  document.querySelector('.custom-file-label').innerHTML = '<i class="bi bi-folder"></i> Escolher pasta';
  document.getElementById('summary').innerHTML = '';
  document.getElementById('resultTable').style.display = 'none';
  document.getElementById('noResults').style.display = 'none';
  document.getElementById('exportButton').style.display = 'none';
  document.getElementById('statusLog').style.display = 'none';
  document.getElementById('statusLog').innerHTML = '';
  document.getElementById('progress').style.width = '0%';
}

async function extractText(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  try {
    if (extension === 'txt') return await file.text();
    if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      return text;
    }
    if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    }
    if (extension === 'doc') {
      throw new Error('Formato .doc não é suportado diretamente. Converta para .docx para análise.');
    }
    if (extension === 'odt') {
      const arrayBuffer = await file.arrayBuffer();
      const odt = new ODF.ODFDocument(arrayBuffer);
      return odt.getTextContent() || '';
    }
    if (extension === 'rtf') {
      const text = await file.text();
      return text.replace(/\[^ ]+/g, '').replace(/{[^}]+}/g, '').trim() || '';
    }
    if (extension === 'html') {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      // Remove script and style elements
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      // Extract text content, preserving code structure
      let content = doc.body.textContent || '';
      // Normalize whitespace and remove excessive newlines
      content = content.replace(/\s+/g, ' ').trim();
      return content;
    }
    throw new Error(`Formato não suportado: ${extension}`);
  } catch (error) {
    throw new Error(`Falha ao extrair texto de ${file.name}: ${error.message}`);
  }
}

async function startAnalysis() {
  isCancelled = false;
  const startButton = document.getElementById('startButton');
  const cancelButton = document.getElementById('cancelButton');
  const progress = document.getElementById('progress');
  const resultTable = document.getElementById('resultTable');
  const summaryDiv = document.getElementById('summary');
  const noResultsDiv = document.getElementById('noResults');
  const exportButton = document.getElementById('exportButton');
  const fileInput = document.getElementById('folderInput');
  const threshold = parseFloat(document.getElementById('threshold').value) / 100;
  const ngramSize = parseInt(document.getElementById('ngramSize').value);
  const metric = document.getElementById('metric').value;

  startButton.disabled = true;
  cancelButton.disabled = false;
  resultTable.style.display = 'none';
  noResultsDiv.style.display = 'none';
  summaryDiv.innerHTML = '<p class="text-muted">Iniciando análise...</p>';
  exportButton.style.display = 'none';
  progress.style.width = '0%';
  progress.setAttribute('aria-valuenow', 0);

  try {
    const validExtensions = ['txt', 'pdf', 'docx', 'doc', 'rtf', 'odt', 'html'];
    const files = Array.from(fileInput.files).filter(file =>
      validExtensions.includes(file.name.split('.').pop().toLowerCase())
    );

    if (files.length < 2) throw new Error('Selecione pelo menos dois arquivos válidos na pasta.');

    logStatus('Iniciando extração de texto...');
    const texts = [];
    let processedFiles = 0;
    const totalFiles = files.length;

    for (const file of files) {
      if (isCancelled) throw new Error('Análise cancelada.');
      try {
        logStatus(`Extraindo texto de ${file.webkitRelativePath}`);
        const text = await extractText(file);
        texts.push({ fileName: file.webkitRelativePath, text });
        processedFiles++;
        const progressPercent = (processedFiles / totalFiles) * 10; // 0% a 10% durante extração
        progress.style.width = `${progressPercent}%`;
        progress.setAttribute('aria-valuenow', progressPercent);
      } catch (error) {
        logStatus(`Erro ao extrair texto de ${file.webkitRelativePath}: ${error.message}`);
      }
    }

    const filteredTexts = texts.filter(text => text.text.trim() !== '');
    if (filteredTexts.length < 2) throw new Error('Não há arquivos suficientes para comparação após extração.');

    logStatus(`Extração concluída. Iniciando comparação de ${filteredTexts.length} arquivos...`);
    progress.style.width = '10%';
    progress.setAttribute('aria-valuenow', 10);

    worker = new Worker('worker.js');
    worker.postMessage({ files: filteredTexts, threshold, ngramSize, metric });

    worker.onmessage = function(e) {
      const { progress: workerProgress, results, error } = e.data;
      if (workerProgress) {
        progress.style.width = `${workerProgress}%`;
        progress.setAttribute('aria-valuenow', workerProgress);
      }
      if (error) {
        logStatus(`Erro na análise: ${error}`);
        summaryDiv.innerHTML = `<div class="alert alert-danger">Erro: ${error}</div>`;
        startButton.disabled = false;
        cancelButton.disabled = true;
        progress.style.width = '0%';
        progress.setAttribute('aria-valuenow', 0);
      }
      if (results) {
        displayResults(results);
        startButton.disabled = false;
        cancelButton.disabled = true;
        progress.style.width = '100%';
        progress.setAttribute('aria-valuenow', 100);
      }
    };

    worker.onerror = function(e) {
      logStatus(`Erro no worker: ${e.message}`);
      summaryDiv.innerHTML = `<div class="alert alert-danger">Erro no worker: ${e.message}</div>`;
      startButton.disabled = false;
      cancelButton.disabled = true;
      progress.style.width = '0%';
      progress.setAttribute('aria-valuenow', 0);
    };
  } catch (error) {
    logStatus(`Erro: ${error.message}`);
    summaryDiv.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    startButton.disabled = false;
    cancelButton.disabled = true;
    progress.style.width = '0%';
    progress.setAttribute('aria-valuenow', 0);
  }
}

function displayResults(results) {
  const resultBody = document.getElementById('resultBody');
  const summaryDiv = document.getElementById('summary');
  const resultTable = document.getElementById('resultTable');
  const noResultsDiv = document.getElementById('noResults');
  const exportButton = document.getElementById('exportButton');

  resultBody.innerHTML = '';
  summaryDiv.innerHTML = '';
  if (results.length === 0) {
    noResultsDiv.style.display = 'block';
    exportButton.style.display = 'none';
  } else {
    resultTable.style.display = 'table';
    noResultsDiv.style.display = 'none';
    exportButton.style.display = 'block';

    const fileOccurrences = {};
    results.forEach(result => {
      fileOccurrences[result.file1] = (fileOccurrences[result.file1] || 0) + 1;
      fileOccurrences[result.file2] = (fileOccurrences[result.file2] || 0) + 1;
    });

    const topFiles = Object.entries(fileOccurrences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, count]) => `<li><em>${file}</em>: ${count} ocorrência${count > 1 ? 's' : ''}</li>`);

    summaryDiv.innerHTML = `
      <h5>Resumo da Análise</h5>
      <p><strong>Total de pares com plágio detectado:</strong> ${results.length}</p>
      <p><strong>Arquivos mais frequentes em plágio:</strong></p>
      <ul>${topFiles.join('') || '<li>Nenhum arquivo frequente</li>'}</ul>
    `;

    results.forEach((result, index) => {
      const row = document.createElement('tr');
      if (parseFloat(result.similarity) >= 50) row.classList.add('high-similarity');
      const excerptId = `excerpt-${index}`;
      const excerpts = result.excerpts.slice(0, 3).map((e, i) => `${i + 1}. ${e}`).join('\n');
      const hasMore = result.excerpts.length > 3;
      row.innerHTML = `
        <td><em>${result.file1}</em></td>
        <td><em>${result.file2}</em></td>
        <td>${result.metric}</td>
        <td>${result.similarity}%</td>
        <td>
          ${result.excerpts.length} trecho${result.excerpts.length !== 1 ? 's' : ''}
          <button class="btn btn-link p-0 ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#${excerptId}">
            ${result.excerpts.length > 0 ? 'Ver' : 'Nenhum trecho'}
          </button>
          <div class="collapse excerpt-content mt-2" id="${excerptId}">
            ${excerpts || 'Nenhum trecho disponível'}
            ${hasMore ? '<p>(+ ' + (result.excerpts.length - 3) + ' trecho' + (result.excerpts.length - 3 > 1 ? 's' : '') + ')</p>' : ''}
          </div>
        </td>
      `;
      resultBody.appendChild(row);
    });

    window.plagiarismResults = results;
  }
}

function cancelAnalysis() {
  isCancelled = true;
  if (worker) worker.terminate();
  document.getElementById('startButton').disabled = false;
  document.getElementById('cancelButton').disabled = true;
  document.getElementById('progress').style.width = '0%';
  document.getElementById('summary').innerHTML = '<p class="text-muted">Análise cancelada.</p>';
  logStatus('Análise cancelada pelo usuário.');
}

function exportToCSV() {
  if (!window.plagiarismResults || window.plagiarismResults.length === 0) return;
  const headers = ['Arquivo 1', 'Arquivo 2', 'Métrica', 'Similaridade (%)', 'Quantidade de Trechos', 'Trechos Copiados'];
  const rows = window.plagiarismResults.map(result => [
    `"${result.file1}"`,
    `"${result.file2}"`,
    result.metric,
    result.similarity,
    result.excerpts.length,
    `"${result.excerpts.slice(0, 3).join('; ').replace(/"/g, '""')}${result.excerpts.length > 3 ? ' (...)' : ''}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plagiarism_results.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('folderInput').addEventListener('change', function () {
    const input = this;
    const label = document.querySelector('.custom-file-label');
    if (input.files.length > 0) {
      const folderPath = input.files[0].webkitRelativePath.split('/')[0];
      label.innerHTML = `<i class="bi bi-folder"></i> ${folderPath || 'Pasta selecionada'}`;
      logStatus(`Pasta "${folderPath}" selecionada com ${input.files.length} arquivos.`);
    } else {
      label.innerHTML = '<i class="bi bi-folder"></i> Escolher pasta';
    }
  });
});
