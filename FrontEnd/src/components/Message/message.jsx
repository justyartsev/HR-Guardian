import styled from "styled-components"
import alertIco from '../../assets/alertMsg.png'
import { FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi"
import { useState } from "react"
import { marked } from 'marked'

const MessageContainer = styled.div`
  display: flex;
  flex-direction: ${props => props.$variant === "input" ? "row-reverse" : "row"};
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const CustomDiv = styled.div`
  background: ${props => {
    if (props.$isError) return 'rgba(239, 68, 68, 0.15)';
    if (props.$variant === "input") return "linear-gradient(135deg, rgba(219, 101, 75, 0.25) 0%, rgba(219, 101, 75, 0.15) 100%)";
    if (props.$variant === "output") return "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)";
    return "var(--secondary-orange-1)";
  }};
  border: ${props => {
    if (props.$isError) return '1px solid rgba(239, 68, 68, 0.4)';
    if (props.$variant === "input") return '1px solid rgba(219, 101, 75, 0.4)';
    return '1px solid rgba(255, 255, 255, 0.08)';
  }};
  color: var(--primary-white-1);
  font-size: 1.5rem;
  line-height: 1.7;
  border-radius: ${props => props.$variant === "input" ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};
  padding: 1.2rem 1.6rem;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  text-align: left;
  justify-content: flex-start;
  box-shadow: ${props => props.$variant === "input"
    ? '0 2px 12px rgba(219, 101, 75, 0.2)'
    : '0 2px 8px rgba(0, 0, 0, 0.2)'};
  backdrop-filter: blur(10px);
  max-width: 100%;
`

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$variant === "input" ? "flex-end" : "flex-start"};
  max-width: 100%;
`

const ReportButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.2rem 0;
  margin-top: 0.3rem;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  
  &:hover {
    color: var(--secondary-red-1);
  }
`

const Exclamation = styled.span`
  color: var(--secondary-red-1);
  font-weight: bold;
  font-size: 1.2rem;
`

const SourcesContainer = styled.div`
  margin-top: 0.8rem;
  padding: 0.8rem 1rem;
  background: linear-gradient(135deg, rgba(219, 101, 75, 0.1) 0%, rgba(219, 101, 75, 0.05) 100%);
  border: 1px solid rgba(219, 101, 75, 0.25);
  border-radius: 10px;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
`

const SourcesTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--secondary-orange-1);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const SourceLink = styled.a`
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
  padding: 0.2rem 0;
  transition: color 0.2s ease;

  &:hover {
    color: var(--secondary-orange-1);
    text-decoration: underline;
  }
`

const RetryButton = styled.button`
  background-color: var(--secondary-orange-1);
  border: none;
  color: var(--primary-white-1);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.5rem 1rem;
  margin-top: 0.8rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;

  &:hover {
    background-color: rgba(219, 101, 75, 0.8);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(219, 101, 75, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`

// Стили для блока размышлений (thinking)
const ThinkingContainer = styled.div`
  margin-bottom: 0.8rem;
  border: 1px solid ${props => props.$isInProgress ? 'rgba(147, 112, 219, 0.5)' : 'rgba(147, 112, 219, 0.3)'};
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(147, 112, 219, 0.1) 0%, rgba(147, 112, 219, 0.05) 100%);
  ${props => props.$isInProgress && `
    animation: thinking-pulse 1.5s ease-in-out infinite;
  `}
  
  @keyframes thinking-pulse {
    0%, 100% { border-color: rgba(147, 112, 219, 0.3); }
    50% { border-color: rgba(147, 112, 219, 0.6); }
  }
`

const ThinkingHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  background: transparent;
  border: none;
  color: rgba(147, 112, 219, 0.9);
  cursor: pointer;
  font-size: 1.1rem;
  font-family: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(147, 112, 219, 0.1);
  }
`

const ThinkingTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
`

const ThinkingContent = styled.div`
  padding: 0.8rem 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
  line-height: 1.6;
  border-top: 1px solid rgba(147, 112, 219, 0.2);
  white-space: pre-wrap;
`

// Функция для парсинга thinking блоков из текста
function parseThinking(text, isProcessing = false) {
  if (!text) return { thinking: null, content: text, isThinkingInProgress: false };
  
  let thinking = null;
  let content = text;
  let isThinkingInProgress = false;
  
  // Формат 1: <think>...</think> (завершённый)
  const thinkTagRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match = thinkTagRegex.exec(text);
  if (match) {
    thinking = match[1].trim();
    content = text.replace(thinkTagRegex, '').trim();
    return { thinking, content, isThinkingInProgress: false };
  }
  
  // Во время стриминга: показываем незавершённый <think> блок как "в процессе"
  if (text.includes('<think>') && !text.includes('</think>')) {
    const startIndex = text.indexOf('<think>') + 7;
    thinking = text.substring(startIndex).trim();
    content = text.substring(0, text.indexOf('<think>')).trim();
    
    // Если не в процессе стриминга (завершено), автоматически закрываем think тег
    if (!isProcessing && thinking && thinking.length > 0) {
      // Ответ завершён, но </think> не найден - это значит модель забыла закрыть тег
      // Показываем думку как завершённую (не in progress)
      return { thinking, content, isThinkingInProgress: false };
    }
    
    if (thinking && thinking.length > 0) {
      return { thinking, content, isThinkingInProgress: isProcessing };
    }
  }
  
  // Формат 2: [Размышления: ...] (завершённый)
  const bracketRegex = /^\[Размышлени[яе]:\s*([^\]]+)\]\s*/i;
  match = bracketRegex.exec(text);
  if (match) {
    thinking = match[1].trim();
    content = text.replace(bracketRegex, '').trim();
    return { thinking, content, isThinkingInProgress: false };
  }
  
  // Во время стриминга: показываем незавершённый [Размышления:...] блок
  if (isProcessing) {
    const unfinishedBracket = /^\[Размышлени[яе]:\s*([^\]]*$)/i;
    match = unfinishedBracket.exec(text);
    if (match && match[1]) {
      thinking = match[1].trim();
      if (thinking && thinking.length > 0) {
        return { thinking, content: '', isThinkingInProgress: true };
      }
    }
  }
  
  // Формат 3: **Размышления:** ... (до двойного переноса)
  const boldRegex = /^\*\*Размышлени[яе]:\*\*\s*([\s\S]*?)(?:\n\n|$)/i;
  match = boldRegex.exec(text);
  if (match) {
    thinking = match[1].trim();
    content = text.replace(boldRegex, '').trim();
    return { thinking, content, isThinkingInProgress: false };
  }
  
  return { thinking, content, isThinkingInProgress: false };
}


export function Message({children, variant, alertMsg, showReportButton = false, onReport, sources, isError = false, canRetry = false, onRetry, isProcessing = false}) {
    const [isThinkingOpen, setIsThinkingOpen] = useState(false);
    
    const handleReportClick = () => {
        if (onReport) {
        onReport(children);
        }
    };

    // Извлекаем текст из children (может быть строка, элемент span или что-то другое)
    let textContent = '';
    if (typeof children === 'string') {
      textContent = children;
    } else if (children?.props?.children) {
      // Если children это React элемент (например span), берём его содержимое
      textContent = typeof children.props.children === 'string' ? children.props.children : '';
    }

    // Парсим thinking блок из текста (только для output)
    // Передаём isProcessing чтобы показывать thinking в процессе
    const { thinking, content, isThinkingInProgress } = variant === "output" 
      ? parseThinking(textContent, isProcessing)
      : { thinking: null, content: textContent, isThinkingInProgress: false };

    // Логирование отключено после отладки
    if (false && variant === "output" && (thinking || isProcessing)) {
      console.log("[Message] Thinking debug:", {
        textContent: textContent.substring(0, 200) + "...",
        thinking: thinking ? thinking.substring(0, 100) + "..." : null,
        content: content.substring(0, 100) + "...",
        isThinkingInProgress,
        isProcessing
      });
    }

    // Если thinking в процессе - автоматически раскрываем блок
    const shouldShowThinking = thinking && (isThinkingOpen || isThinkingInProgress);

    // Парсинг markdown с улучшенной обработкой в реальном времени
    const parseMarkdownToReact = (text) => {
      if (typeof text !== 'string' || text.length === 0) return text;

      try {
        marked.setOptions({
          breaks: true,
          gfm: true,
          async: false,
          pedantic: false,
          mangle: false,
        });

        const tokens = marked.lexer(text);
        
        // Конвертируем токены в React элементы
        return tokens.map((token, idx) => {
          switch (token.type) {
            case 'paragraph':
              return (
                <p key={`p-${idx}`} style={{ margin: '0.5em 0' }}>
                  {parseInlineMarkdown(token.text, `p-${idx}`)}
                </p>
              );
            
            case 'heading':
              const HeadingTag = `h${Math.min(token.depth, 6)}`;
              return (
                <HeadingTag key={`h-${idx}`} style={{ margin: '0.8em 0 0.5em 0', fontWeight: 'bold' }}>
                  {parseInlineMarkdown(token.text, `h-${idx}`)}
                </HeadingTag>
              );
            
            case 'hr':
              return <hr key={`hr-${idx}`} style={{ margin: '1em 0', borderColor: 'rgba(255,255,255,0.2)' }} />;
            
            case 'blockquote':
              return (
                <blockquote key={`bq-${idx}`} style={{
                  margin: '1em 0',
                  paddingLeft: '1em',
                  borderLeft: '3px solid var(--secondary-orange-1)',
                  color: 'rgba(255,255,255,0.8)',
                  fontStyle: 'italic'
                }}>
                  {parseMarkdownToReact(token.text)}
                </blockquote>
              );
            
            case 'list':
              const ListTag = token.ordered ? 'ol' : 'ul';
              return (
                <ListTag key={`list-${idx}`} style={{ margin: '0.5em 0', paddingLeft: '2em' }}>
                  {token.items.map((item, itemIdx) => (
                    <li key={`li-${idx}-${itemIdx}`} style={{ marginBottom: '0.3em' }}>
                      {parseInlineMarkdown(item.text, `li-${idx}-${itemIdx}`)}
                    </li>
                  ))}
                </ListTag>
              );
            
            case 'code':
              return (
                <pre key={`code-${idx}`} style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1em',
                  borderRadius: '4px',
                  overflow: 'auto',
                  marginBottom: '0.5em',
                  fontSize: '0.9em'
                }}>
                  <code>{token.text}</code>
                </pre>
              );
            
            case 'table':
              return (
                <table key={`table-${idx}`} style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  margin: '0.8em 0',
                  fontSize: '0.95em'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--secondary-orange-1)' }}>
                      {token.header.map((cell, cellIdx) => (
                        <th key={`th-${idx}-${cellIdx}`} style={{
                          padding: '0.5em',
                          textAlign: 'left',
                          fontWeight: 'bold'
                        }}>
                          {parseInlineMarkdown(cell.text, `th-${idx}-${cellIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {token.rows.map((row, rowIdx) => (
                      <tr key={`tr-${idx}-${rowIdx}`} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {row.map((cell, cellIdx) => (
                          <td key={`td-${idx}-${rowIdx}-${cellIdx}`} style={{
                            padding: '0.5em',
                            color: 'rgba(255,255,255,0.9)'
                          }}>
                            {parseInlineMarkdown(cell.text, `td-${idx}-${rowIdx}-${cellIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            
            case 'html':
              // Для HTML кода - просто показываем текст
              return (
                <div key={`html-${idx}`} style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.5em',
                  fontSize: '0.9em',
                  overflowX: 'auto'
                }}>
                  {token.text}
                </div>
              );
            
            case 'space':
              return null;
            
            default:
              return null;
          }
        }).filter(el => el !== null);

      } catch (e) {
        console.error('Markdown parse error:', e);
        return parseSimpleMarkdown(text);
      }
    };

    const parseInlineMarkdown = (text, keyPrefix = 'inline') => {
      if (typeof text !== 'string' || !text) return text;

      const parts = [];
      let lastIndex = 0;
      let elementCount = 0;

      const strongRegex = /\*\*([^\*]+)\*\*|\*\*([^\*\n]+)\*\*/g;
      const emRegex = /\*([^\*]+)\*|\*([^\*\n]+)\*/g;
      const codeRegex = /`([^`]+)`/g;
      const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;

      let match;
      const matches = [];

      while ((match = strongRegex.exec(text)) !== null) {
        matches.push({ type: 'strong', index: match.index, length: match[0].length, content: match[1] || match[2] });
      }

      if (matches.length === 0) {
        while ((match = emRegex.exec(text)) !== null) {
          if (text[match.index - 1] !== '*' && text[match.index + match[0].length] !== '*') {
            matches.push({ type: 'em', index: match.index, length: match[0].length, content: match[1] || match[2] });
          }
        }
      }

      matches.sort((a, b) => a.index - b.index);

      for (const m of matches) {
        if (m.index > lastIndex) {
          parts.push(text.substring(lastIndex, m.index));
        }

        if (m.type === 'strong') {
          parts.push(
            <strong key={`${keyPrefix}-strong-${elementCount++}`}>
              {m.content}
            </strong>
          );
        } else if (m.type === 'em') {
          parts.push(
            <em key={`${keyPrefix}-em-${elementCount++}`}>
              {m.content}
            </em>
          );
        }

        lastIndex = m.index + m.length;
      }

      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        let linkMatch;
        linkRegex.lastIndex = 0;

        if ((linkMatch = linkRegex.exec(remainingText)) !== null) {
          parts.push(remainingText.substring(0, linkMatch.index));
          parts.push(
            <a
              key={`${keyPrefix}-link-${elementCount++}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--secondary-orange-1)', textDecoration: 'underline' }}
            >
              {linkMatch[1]}
            </a>
          );
          parts.push(remainingText.substring(linkMatch.index + linkMatch[0].length));
        } else {
          parts.push(remainingText);
        }
      } else if (lastIndex === 0 && text.length > 0) {
        return text;
      }

      return parts.length > 0 ? parts : text;
    };

    const parseSimpleMarkdown = (text) => {
      if (typeof text !== 'string') return text;

      const parts = [];
      let lastIndex = 0;
      const regex = /\*\*([^*]+)\*\*/g;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index}>{match[1]}</strong>);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    };

    const rawDisplayContent = variant === "output" ? content : children;
    const displayContent = typeof rawDisplayContent === 'string'
      ? parseMarkdownToReact(rawDisplayContent)
      : rawDisplayContent;

    const uniqueSources = sources && Array.isArray(sources) && sources.length > 0
      ? Array.from(new Map(
          sources
            .filter(s => s && typeof s === 'object' && s.document_id)
            .map(s => [s.document_id, s])
        ).values())
      : [];

    const handleDownload = async (documentId, title) => {
      try {
        const { downloadFile, getFileExtension } = await import('../../utils/downloadUtils');
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/documents/${documentId}/download`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Не удалось скачать документ');
        }

        // Получаем MIME-type из ответа (теперь он правильный благодаря Backend)
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        
        // Используем утилиту для скачивания с правильным расширением
        const baseFilename = title || `document_${documentId}`;
        downloadFile(blob, baseFilename, contentType);
      } catch (error) {
        console.error('Error downloading document:', error);
        alert('Ошибка при скачивании файла');
      }
    };

    return(
      <MessageContainer $variant={variant}>
        <MessageWrapper $variant={variant}>
          {thinking && (
            <ThinkingContainer $isInProgress={isThinkingInProgress}>
              <ThinkingHeader onClick={() => !isThinkingInProgress && setIsThinkingOpen(!isThinkingOpen)}>
                <ThinkingTitle>
                  {isThinkingInProgress ? 'Размышляю...' : 'Размышления модели'}
                </ThinkingTitle>
                {!isThinkingInProgress && (
                  shouldShowThinking ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />
                )}
              </ThinkingHeader>
              {shouldShowThinking && (
                <ThinkingContent>{thinking}</ThinkingContent>
              )}
            </ThinkingContainer>
          )}

          {(displayContent || !isThinkingInProgress) && (
            <CustomDiv $variant={variant} $isError={isError}>
              <span style={{
                maxWidth: "100%",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                display: "inline-block",
              }}>
                {displayContent}
              </span>
            </CustomDiv>
          )}

          {isError && canRetry && onRetry && (
            <RetryButton onClick={onRetry} title="Повторить запрос">
              <FiRefreshCw size={14} />
              <span>Повторить</span>
            </RetryButton>
          )}

          {variant === "output" && uniqueSources.length > 0 && (
            <SourcesContainer>
              <SourcesTitle>Источники:</SourcesTitle>
              {uniqueSources.map((source, index) => {
                const displayTitle = typeof source.title === 'string'
                  ? source.title
                  : `Документ ${source.document_id}`;
                return (
                  <div key={source.document_id || index}>
                    <SourceLink onClick={() => handleDownload(source.document_id, displayTitle)}>
                      {displayTitle}
                    </SourceLink>
                  </div>
                );
              })}
            </SourcesContainer>
          )}

          {alertMsg && (
            <img
              src={alertIco}
              alt="alertImg"
              style={{
                width: "2rem",
                paddingLeft: "1rem",
                paddingRight: "1rem",
                verticalAlign: "middle",
                marginTop: "-0.5rem"
              }}
              title={alertMsg}
            />
          )}

          {variant === "output" && showReportButton && (
            <ReportButton
              onClick={handleReportClick}
              title="Пожаловаться на сообщение"
            >
              <Exclamation>!</Exclamation>
              <span>Пожаловаться</span>
            </ReportButton>
          )}
        </MessageWrapper>
      </MessageContainer>
    )
}