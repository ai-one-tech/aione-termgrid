import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ISearchOptions, SearchAddon } from '@xterm/addon-search';
import { Search as SearchIcon, ChevronUp, ChevronDown, X, CaseSensitive, WholeWord } from 'lucide-react';
import { TranslationKey } from '../../shared/translations';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface TerminalSearchProps {
  searchAddon: Pick<SearchAddon, 'findNext' | 'findPrevious' | 'clearDecorations' | 'onDidChangeResults'>;
  t: (key: TranslationKey) => string;
  onClose: () => void;
}

const TerminalSearch: React.FC<TerminalSearchProps> = ({
  searchAddon,
  t,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<{ index: number; matches: number }>({ index: 0, matches: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const createSearchOptions = useCallback(
    (nextCaseSensitive = caseSensitive, nextWholeWord = wholeWord): ISearchOptions => ({
      caseSensitive: nextCaseSensitive,
      wholeWord: nextWholeWord,
      incremental: true,
    }),
    [caseSensitive, wholeWord]
  );

  const runSearch = useCallback(
    (
      term: string,
      options: ISearchOptions = createSearchOptions()
    ) => {
      if (!term) {
        searchAddon.clearDecorations();
        setMatchCount({ index: 0, matches: 0 });
        return;
      }

      const found = searchAddon.findNext(term, options);
      if (!found) {
        setMatchCount({ index: 0, matches: 0 });
      }
    },
    [createSearchOptions, searchAddon]
  );

  const findPrevious = useCallback(() => {
    if (!searchTerm) return;
    searchAddon.findPrevious(searchTerm, createSearchOptions());
  }, [createSearchOptions, searchAddon, searchTerm]);

  const findNext = useCallback(() => {
    runSearch(searchTerm);
  }, [runSearch, searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const disposable = searchAddon.onDidChangeResults(({ resultIndex, resultCount }) => {
      setMatchCount({
        index: resultCount > 0 ? Math.max(resultIndex, 0) : 0,
        matches: resultCount,
      });
    });

    return () => disposable.dispose();
  }, [searchAddon]);

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
      <SearchIcon className="w-4 h-4 text-muted-foreground" />
      
      <Input
        ref={inputRef}
        type="text"
        placeholder={t('search') || 'Search...'}
        value={searchTerm}
        onChange={(e) => {
          const nextTerm = e.target.value;
          setSearchTerm(nextTerm);
          runSearch(nextTerm);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              findPrevious();
            } else {
              findNext();
            }
          }
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        className="h-8 w-64 text-sm"
      />

      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {matchCount.matches > 0 ? (
          <>
            <span>{matchCount.index + 1}</span>
            <span>/</span>
            <span>{matchCount.matches}</span>
          </>
        ) : searchTerm ? (
          <span>0/0</span>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={findPrevious}
        disabled={!searchTerm || matchCount.matches === 0}
        title="Previous match"
      >
        <ChevronUp className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={findNext}
        disabled={!searchTerm || matchCount.matches === 0}
        title="Next match"
      >
        <ChevronDown className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1 ml-2 border-l pl-2">
        <Button
          variant={caseSensitive ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const nextCaseSensitive = !caseSensitive;
            setCaseSensitive(nextCaseSensitive);
            runSearch(searchTerm, createSearchOptions(nextCaseSensitive, wholeWord));
          }}
          title="Match Case"
        >
          <CaseSensitive className="w-4 h-4" />
        </Button>

        <Button
          variant={wholeWord ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const nextWholeWord = !wholeWord;
            setWholeWord(nextWholeWord);
            runSearch(searchTerm, createSearchOptions(caseSensitive, nextWholeWord));
          }}
          title="Match Whole Word"
        >
          <WholeWord className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 ml-auto"
        onClick={onClose}
        title="Close"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TerminalSearch;
