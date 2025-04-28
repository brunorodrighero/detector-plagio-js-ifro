let isCancelled = false;

self.onmessage = function (e) {
  const { files, threshold, ngramSize, metric } = e.data;
  isCancelled = false;

  try {
    const texts = files.map(file => {
      const tokens = tokenize(file.text);
      const ngrams = generateNGrams(tokens, ngramSize);
      return { fileName: file.fileName, ngrams };
    });

    const results = [];
    const totalComparisons = (texts.length * (texts.length - 1)) / 2;
    let comparisonsDone = 0;

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        if (isCancelled) throw new Error('Análise cancelada.');
        const text1 = texts[i];
        const text2 = texts[j];
        let similarity;
        if (metric === 'jaccard') {
          similarity = computeJaccard(text1.ngrams, text2.ngrams);
        } else {
          similarity = computeDice(text1.ngrams, text2.ngrams);
        }

        const common = text1.ngrams.filter(ngram => text2.ngrams.includes(ngram));
        const excerpts = mergeConsecutiveNGrams(common, text1.ngrams);
        const filteredExcerpts = excerpts.filter(excerpt => {
          const words = excerpt.toLowerCase().split(/\W+/).filter(word => word.length > 0);
          return !words.some(word => coverPageKeywords.has(word));
        });

        if (similarity >= threshold && filteredExcerpts.length > 0) {
          results.push({
            file1: text1.fileName,
            file2: text2.fileName,
            similarity: (similarity * 100).toFixed(2),
            metric: metric.charAt(0).toUpperCase() + metric.slice(1),
            excerpts: filteredExcerpts
          });
        }

        comparisonsDone++;
        self.postMessage({ progress: 10 + (comparisonsDone / totalComparisons * 90) });
      }
    }

    self.postMessage({ results });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

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