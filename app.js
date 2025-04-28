let isCancelled = false;

function tokenize(text) {
  return text.toLowerCase().split(/\W+/).filter(word => word.length > 0);
}

function generateNGrams(tokens, size) {
  const ngrams = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    ngrams.push(tokens.slice(i, i + size).join(' '));
  }
  return ngrams;
}

function computeJaccard(ngrams1, ngrams2) {
  const set1 = new Set(ngrams1);
  const set2 = new Set(ngrams2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function computeDice(ngrams1, ngrams2) {
  const set1 = new Set(ngrams1);
  const set2 = new Set(ngrams2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const totalSize = set1.size + set2.size;
  return totalSize === 0 ? 0 : (2 * intersection.size) / totalSize;
}

async function extractText(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  try {
    if (extension === 'txt') {
      return await file.text();
    } else if (extension === 'pdf') {
      return await extractTextFromPDF(file);
    } else if (extension === 'docx') {
      return await extractTextFromDocx(file);
    } else if (extension === 'doc') {
      return await extractTextFromDoc(file);
    } else if (extension === 'odt') {
      return await extractTextFromOdt(file);
    } else if (extension === 'rtf') {
      return await extractTextFromRtf(file);
    }
    throw new Error(`Formato não suportado: ${extension}`);
  } catch (error) {
    throw new Error(`Falha ao extrair texto de ${file.name}: ${error.message}`);
  }
}

async function extractTextFromPDF(file) {
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

async function extractTextFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await docx.extractRawText({ arrayBuffer });
  return result.value || '';
}

async function extractTextFromDoc(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

async function extractTextFromOdt(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const odt = new ODF.ODFDocument(arrayBuffer);
    return odt.getTextContent() || '';
  } catch (error) {
    throw new Error('Falha ao processar arquivo ODT');
  }
}

async function extractTextFromRtf(file) {
  try {
    const text = await file.text();
    return text.replace(/\[^ ]+/g, '').replace(/{[^}]+}/g, '').trim() || '';
  } catch (error) {
    throw new Error('Falha ao processar arquivo RTF');
  }
}

function mergeConsecutiveNGrams(common, original) {
  if (common.length === 0) return [];
  const uniq = [...new Set(common)];
  uniq.sort((a, b) => original.indexOf(a) - original.indexOf(b));
  const excerpts = [];
  let current = uniq[0];
  let lastIndex = original.indexOf(uniq[0]);
  for (let i = 1; i < uniq.length; i++) {
    const ngram = uniq[i];
    const idx = original.indexOf(ngram);
    if (idx === lastIndex + 1) {
      const words = ngram.split(/\s+/);
      current += ' ' + words[words.length - 1];
    } else {
      excerpts.push(current);
      current = ngram;
    }
    lastIndex = idx;
  }
  excerpts.push(current);
  return excerpts;
}

const coverPageKeywords = new Set([
  'instituto', 'federal', 'educação', 'ciência', 'tecnologia', 'rondônia',
  'campus', 'ariquemes', 'trabalho', 'apresentado', 'disciplina', 'análise',
  'desenvolvimento', 'sistemas', 'ifro', 'sumário', 'introdução'
]);

async function startAnalysis() {
  isCancelled = false;
  const startButton = document.getElementById('startButton');
  const cancelButton = document.getElementById('cancelButton');
  const progress = document.getElementById('progress');
  const resultTable = document.getElementById('resultTable');
  const resultBody = document.getElementById('resultBody');
  const summaryDiv = document.getElementById('summary');
  const noResultsDiv = document.getElementById('noResults');
  const exportButton = document.getElementById('exportButton');
  const fileInput = document.getElementById('folderInput');
  const thresholdInput = document.getElementById('threshold');
  const ngramSizeInput = document.getElementById('ngramSize');
  const metricInput = document.getElementById('metric');

  startButton.disabled = true;
  cancelButton.disabled = false;
  resultTable.style.display = 'none';
  noResultsDiv.style.display = 'none';
  summaryDiv.innerHTML = '<p class="text-muted">Iniciando análise...</p>';
  exportButton.style.display = 'none';
  progress.style.width = '0%';
  progress.setAttribute('aria-valuenow', 0);

  try {
    const validExtensions = ['txt', 'pdf', 'docx', 'doc', 'rtf', 'odt'];
    const files = Array.from(fileInput.files).filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return validExtensions.includes(extension);
    });

    if (files.length < 2) {
      throw new Error('Selecione pelo menos dois arquivos válidos na pasta.');
    }

    const threshold = parseFloat(thresholdInput.value) / 100;
    const ngramSize = parseInt(ngramSizeInput.value);
    const metric = metricInput.value;

    const errors = [];
    const texts = [];
    await Promise.all(files.map(async (file) => {
      if (isCancelled) return;
      try {
        const text = await extractText(file);
        texts.push({ fileName: file.webkitRelativePath || file.name, text });
      } catch (error) {
        errors.push(`Arquivo ${file.name}: ${error.message}`);
      }
    }));

    if (isCancelled) throw new Error('Análise cancelada.');
    if (texts.length < 2) {
      throw new Error('Não há arquivos suficientes para comparação após o processamento.');
    }

    if (errors.length > 0) {
      summaryDiv.innerHTML += `<div class="alert alert-warning">Alguns arquivos não puderam ser processados:<ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
    }

    progress.style.width = '10%';
    progress.setAttribute('aria-valuenow', 10);

    const worker = new Worker('worker.js');
    worker.postMessage({ files: texts, threshold, ngramSize, metric });

    worker.onmessage = function(e) {
      const { progress: workerProgress, results, error } = e.data;
      if (workerProgress) {
        progress.style.width = `${workerProgress}%`;
        progress.setAttribute('aria-valuenow', workerProgress);
      } else if (error) {
        summaryDiv.innerHTML = `<div class="alert alert-danger">Erro: ${error}</div>`;
        startButton.disabled = false;
        cancelButton.disabled = true;
        progress.style.width = '0%';
      } else if (results) {
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
            if (parseFloat(result.similarity) >= 50) {
              row.classList.add('high-similarity');
            }
            const excerptId = `excerpt-${index}`;
            const excerpts = Array.isArray(result.excerpts) ? result.excerpts : [];
            const excerptList = excerpts.slice(0, 3).map((excerpt, i) => `${i + 1}. ${excerpt}`).join('\n');
            const hasMoreExcerpts = excerpts.length > 3;
            row.innerHTML = `
              <td><em>${result.file1}</em></td>
              <td><em>${result.file2}</em></td>
              <td>${result.metric}</td>
              <td>${result.similarity}%</td>
              <td>
                ${excerpts.length} trecho${excerpts.length !== 1 ? 's' : ''}
                <button class="btn btn-link p-0 ms-2" type="button" data-bs-toggle="collapse" data-bs-target="#${excerptId}" aria-expanded="false" aria-controls="${excerptId}">
                  ${excerpts.length > 0 ? 'Ver' : 'Nenhum trecho'}
                </button>
                <div class="collapse excerpt-content mt-2" id="${excerptId}">
                  ${excerptList || 'Nenhum trecho disponível'}
                  ${hasMoreExcerpts ? '<p>(+ ' + (excerpts.length - 3) + ' trecho' + (excerpts.length - 3 > 1 ? 's' : '') + ')</p>' : ''}
                </div>
              </td>
            `;
            resultBody.appendChild(row);
          });

          window.plagiarismResults = results;
        }
        startButton.disabled = false;
        cancelButton.disabled = true;
        progress.style.width = '100%';
        progress.setAttribute('aria-valuenow', 100);
      }
    };

    worker.onerror = function(error) {
      summaryDiv.innerHTML = `<div class="alert alert-danger">Erro no worker: ${error.message}</div>`;
      startButton.disabled = false;
      cancelButton.disabled = true;
      progress.style.width = '0%';
      progress.setAttribute('aria-valuenow', 0);
    };

  } catch (error) {
    summaryDiv.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
    startButton.disabled = false;
    cancelButton.disabled = true;
    progress.style.width = '0%';
    progress.setAttribute('aria-valuenow', 0);
  }
}

function cancelAnalysis() {
  isCancelled = true;
  const cancelButton = document.getElementById('cancelButton');
  const startButton = document.getElementById('startButton');
  const progress = document.getElementById('progress');
  const summaryDiv = document.getElementById('summary');
  if (typeof worker !== 'undefined') {
    worker.terminate();
  }
  cancelButton.disabled = true;
  startButton.disabled = false;
  progress.style.width = '0%';
  progress.setAttribute('aria-valuenow', 0);
  summaryDiv.innerHTML = '<p class="text-muted">Análise cancelada.</p>';
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
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plagiarism_results.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}