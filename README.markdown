# Detector de Plágio

Este é um detector de plágio baseado na web, projetado para auxiliar professores na identificação de possíveis casos de plágio em trabalhos acadêmicos. A ferramenta analisa documentos em diversos formatos, calcula a similaridade entre eles usando métricas como Jaccard e Dice, e destaca trechos potencialmente copiados com base em n-gramas configuráveis.

## Funcionalidades

- **Suporte a múltiplos formatos**: Analisa arquivos `.txt`, `.pdf`, `.docx`, `.rtf`, `.odt` e `.html`.
- **Configuração flexível**:
  - **Limiar de similaridade**: Define o percentual mínimo para considerar um par de documentos como potencialmente plagiado.
  - **Tamanho do n-grama**: Permite ajustar a granularidade da análise de texto.
  - **Métrica de similaridade**: Escolha entre Jaccard (baseada em interseção e união de conjuntos) ou Dice (enfatiza interseções).
- **Resultados detalhados**: Exibe uma tabela com pares de arquivos, porcentagem de similaridade, métrica utilizada e trechos copiados.
- **Exportação para CSV**: Permite salvar os resultados em formato CSV para análise posterior.
- **Interface responsiva**: Usa Bootstrap para uma experiência amigável em dispositivos móveis e desktops.
- **Filtragem de falsos positivos**: Ignora trechos comuns em capas de trabalhos acadêmicos (ex.: "instituto", "federal").
- **Progresso visual**: Barra de progresso mostra o andamento da análise.
- **Cancelamento e limpeza**: Permite interromper a análise ou limpar o formulário.

### Explicação das Funcionalidades

- **Limiar de Similaridade**: Define o percentual mínimo de similaridade (de 0% a 100%) para que um par de documentos seja considerado como potencial plágio. Por exemplo, um limiar de 4% significa que apenas pares com similaridade igual ou superior a 4% serão exibidos. Um limiar mais alto reduz falsos positivos, mas pode ignorar plágios sutis; um limiar mais baixo aumenta a sensibilidade, mas pode incluir coincidências comuns. O padrão (4%) foi ajustado para equilibrar sensibilidade e precisão em trabalhos acadêmicos.

- **Tamanho do N-Grama**: Um n-grama é uma sequência de *n* palavras usada para comparar textos. Por exemplo, com n-grama de tamanho 5, a ferramenta analisa grupos de 5 palavras consecutivas. Tamanhos menores (ex.: 3) são mais sensíveis a trechos curtos, mas podem gerar mais falsos positivos. Tamanhos maiores (ex.: 10) são mais específicos, mas podem ignorar cópias menores. O padrão (5) é ideal para capturar trechos significativos sem excesso de ruído.

- **Métrica de Similaridade**:
  - **Jaccard**: Calcula a similaridade como a razão entre a interseção e a união dos n-gramas de dois textos. É mais conservadora e adequada para detectar cópias extensas.
  - **Dice**: Dá maior peso às interseções, sendo mais sensível a trechos compartilhados. Pode ser útil para detectar plágios parciais. O padrão (Jaccard) é mais robusto para a maioria dos casos.

A configuração padrão (limiar de 4%, n-grama de 5, métrica Jaccard) foi cuidadosamente ajustada para oferecer os melhores resultados em trabalhos acadêmicos, minimizando falsos positivos e destacando plágios relevantes. Professores podem ajustar esses parâmetros para casos específicos, como textos mais curtos ou análises mais rigorosas.

## Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari) com suporte a HTML5, CSS3 e JavaScript.
- Não requer instalação de software adicional, pois a ferramenta roda diretamente no navegador.

## Acesso

A ferramenta está disponível online via GitHub Pages em dois endereços:
- **URL principal**: [https://brunorodrighero.github.io/detector-plagio-js-ifro/](https://brunorodrighero.github.io/detector-plagio-js-ifro/)
- **URL encurtada**: [https://bit.ly/detector-ifro](https://bit.ly/detector-ifro)

Basta acessar um dos links acima para usar a ferramenta sem necessidade de instalação.

## Instalação (Uso Local)

Para executar localmente ou hospedar em seu próprio servidor:

1. Clone o repositório:
   ```bash
   git clone https://github.com/brunorodrighero/detector-plagio-js-ifro.git
   ```
2. Navegue até o diretório do projeto:
   ```bash
   cd detector-plagio-js-ifro
   ```
3. Abra o arquivo `index.html` em um navegador ou hospede os arquivos em um servidor web.

## Instruções para Professores

1. **Selecionar Pasta**:
   - Clique em "Escolher pasta" e selecione a pasta com os documentos dos alunos.
   - A ferramenta aceita arquivos `.txt`, `.pdf`, `.docx`, `.rtf` e `.odt`. Pelo menos dois arquivos válidos são necessários.

2. **Configurar Parâmetros**:
   - **Limiar de similaridade**: Ajuste o percentual (padrão: 4%) se quiser mais ou menos sensibilidade.
   - **Tamanho do n-grama**: Escolha entre 3, 5, 7 ou 10 (padrão: 5) com base no tamanho dos trechos a detectar.
   - **Métrica de similaridade**: Use Jaccard (padrão) para maior robustez ou Dice para maior sensibilidade.

3. **Iniciar Análise**:
   - Clique em "Iniciar Análise" para processar os arquivos.
   - A barra de progresso mostrará o andamento. Para arquivos grandes ou muitos documentos, a análise pode levar alguns minutos.

4. **Interpretar Resultados**:
   - **Tabela de Resultados**: Mostra pares de arquivos com similaridade acima do limiar, incluindo:
     - Nomes dos arquivos.
     - Métrica usada.
     - Similaridade em porcentagem (acima de 50% é destacada em vermelho).
     - Trechos copiados (clique em "Ver" para expandir).
   - **Resumo**: Exibe o número de pares com plágio e os arquivos mais frequentes.
   - **Nenhum plágio**: Se não houver resultados, uma mensagem indicará que nenhum plágio foi detectado.

5. **Exportar Resultados**:
   - Clique em "Exportar como CSV" para baixar um arquivo com os resultados, incluindo arquivos, métricas, similaridades e trechos.

6. **Outras Ações**:
   - **Cancelar**: Interrompe a análise em andamento.
   - **Limpar**: Reseta o formulário e os resultados para uma nova análise.

### Dicas

- Organize os arquivos em uma única pasta para facilitar a seleção.
- Teste com arquivos pequenos para entender o impacto das configurações.
- Para textos muito curtos, reduza o tamanho do n-grama (ex.: 3) e o limiar (ex.: 2%).
- Para documentos longos, aumente o tamanho do n-grama (ex.: 7 ou 10) para maior especificidade.

## Exemplo de Uso

1. Crie uma pasta com três arquivos `.txt`:
   - `trabalho1.txt`: "A tecnologia transforma a educação no século XXI."
   - `trabalho2.txt`: "A tecnologia muda a educação no século XXI."
   - `trabalho3.txt`: "O impacto da ciência na sociedade moderna."
2. Selecione a pasta na ferramenta.
3. Mantenha as configurações padrão (limiar: 4%, n-grama: 5, métrica: Jaccard).
4. Clique em "Iniciar Análise".
5. Verifique a tabela para pares com alta similaridade (ex.: `trabalho1.txt` e `trabalho2.txt`) e os trechos destacados.

## Contribuição

Contribuições são bem-vindas! Para sugerir melhorias ou relatar problemas:

1. Abra uma issue no repositório: [https://github.com/brunorodrighero/detector-plagio-js-ifro](https://github.com/brunorodrighero/detector-plagio-js-ifro).
2. Para contribuir com código:
   - Faça um fork do repositório.
   - Crie uma branch para sua feature ou correção.
   - Commit suas alterações.
   - Envie um pull request.

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

## Contato

Para suporte ou feedback, entre em contato com [bruno.rodighiero@ifro.edu.br](mailto:bruno.rodighiero@ifro.edu.br).
